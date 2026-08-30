import { describe,expect,it } from "vitest";
import { CoachingCycle,ConfirmationTestRun,SessionSafetyContext } from "../../domain/coachingTypes";
import { Database,SqlParameter } from "../database/types";
import { SqliteCoachingRepository } from "./sqliteCoachingRepository";

class ForeignKeyDatabase implements Database {
 tests=new Set<string>(); cycles=new Set<string>(); statements:string[]=[]; params:SqlParameter[][]=[]; safety:SessionSafetyContext|null=null;
 testRows=new Map<string,ConfirmationTestRun>();cycleRows=new Map<string,CoachingCycle>();
 async execAsync(_sql:string){}
 async runAsync(sql:string,...params:SqlParameter[]){
  this.statements.push(sql);
  this.params.push(params);
  if(sql.includes("confirmation_test_runs")){this.tests.add(String(params[0]));this.testRows.set(String(params[0]),JSON.parse(String(params[10])));}
  if(sql.includes("coaching_cycles")){
   const testId=String(params[4]);if(!this.tests.has(testId))throw new Error("FOREIGN KEY constraint failed");
   this.cycles.add(String(params[0]));this.cycleRows.set(String(params[0]),JSON.parse(String(params[15])));
  }
  if(sql.includes("session_safety_contexts"))this.safety=JSON.parse(String(params[2]));
  return{changes:1};
 }
 async getFirstAsync<T>(sql:string,...params:SqlParameter[]){
  if(sql.includes("session_safety_contexts")&&this.safety)return{result_json:JSON.stringify(this.safety)} as T;
  if(sql.includes("json_extract(result_json,'$.generatedSeriesId')=?")){
   const found=[...this.testRows.values()].find(item=>item.generatedSeriesId===params[0]);
   return(found?{result_json:JSON.stringify(found)}:null) as T|null;
  }
  if(sql.includes("source_series_id=?")&&sql.includes("hypothesis_id=?")&&sql.includes("test_code=?")){
   const found=[...this.testRows.values()].find(item=>item.sourceSeriesId===params[0]&&item.hypothesisId===params[1]
    &&item.testCode===params[2]&&item.status!=="cancelled"&&item.generatedSeriesId!==null);
   return(found?{result_json:JSON.stringify(found)}:null) as T|null;
  }
  if(sql.includes("confirmation_test_run_id=?")){
   const found=[...this.cycleRows.values()].find(item=>item.confirmationTestRunId===params[0]);
   return(found?{result_json:JSON.stringify(found)}:null) as T|null;
  }
  if(sql.includes("control_series_id=?")){
   const found=[...this.cycleRows.values()].find(item=>item.controlSeriesId===params[0]);
   return(found?{result_json:JSON.stringify(found)}:null) as T|null;
  }
  return null;
 }
 async getAllAsync<T>(){return[] as T[];}
 async withTransactionAsync(task:()=>Promise<void>){await task();}
}
const run={id:"test-1",sessionId:"session-1",sourceSeriesId:"series-1",hypothesisId:"hyp-1",
 testCode:"TEST",status:"accepted",startedAt:"now",completedAt:null,outcome:null,observations:[],userAnswers:{},
 confidenceBefore:"low",confidenceAfter:null,hypothesisStatusBefore:"requires_confirmation",
 hypothesisStatusAfter:null,generatedSeriesId:null,rulesetVersion:"v"} as ConfirmationTestRun;
const cycle={id:"cycle-1",sessionId:"session-1",sourceSeriesId:"series-1",hypothesisId:"hyp-1",
 confirmationTestRunId:run.id,recommendationId:null,drillCode:null,controlSeriesId:null,status:"test_pending",
 outcome:null,objective:null,startedAt:"now",completedAt:null,invalidatedAt:null,invalidationReason:null,
 rulesetVersion:"v"} as CoachingCycle;

describe("SqliteCoachingRepository",()=>{
 it("crée le test avant le cycle qui le référence",async()=>{
  const db=new ForeignKeyDatabase();await new SqliteCoachingRepository(db).createCycle(cycle,run);
  expect(db.tests.has(run.id)).toBe(true);expect(db.cycles.has(cycle.id)).toBe(true);
  expect(db.statements[0]).toContain("confirmation_test_runs");
 });
 it("mémorise et relit le contexte de sécurité de la séance",async()=>{
  const db=new ForeignKeyDatabase(),repo=new SqliteCoachingRepository(db);
  const context={sessionId:"session-1",validatedAt:"now",conditions:{} as SessionSafetyContext["conditions"]};
  await repo.saveSessionSafety(context);expect(await repo.getSessionSafety("session-1")).toEqual(context);
 });
 it("enregistre correctement le résultat structuré du test",async()=>{
  const db=new ForeignKeyDatabase(),repo=new SqliteCoachingRepository(db);
  await repo.createCycle(cycle,run);
  const completed={...run,status:"completed" as const,outcome:"supports_hypothesis" as const,completedAt:"later"};
  await repo.saveTest(completed);
  const resultWrite=db.statements.findIndex((sql,index)=>index>1&&sql.includes("confirmation_test_runs"));
  const saved=JSON.parse(String(db.params[resultWrite][10])) as ConfirmationTestRun;
  expect(saved.id).toBe(run.id);expect(saved.outcome).toBe("supports_hypothesis");
  expect(saved.status).toBe("completed");expect(saved.completedAt).toBe("later");
  expect(db.statements[resultWrite]).toContain("ON CONFLICT(id) DO UPDATE");
  expect(db.statements[resultWrite]).not.toContain("OR REPLACE");
  expect(db.cycles.has(cycle.id)).toBe(true);
 });
 it("retrouve le test par la série diagnostique générée",async()=>{
  const db=new ForeignKeyDatabase(),repo=new SqliteCoachingRepository(db);
  const linked={...run,generatedSeriesId:"series-2"};await repo.createCycle(cycle,linked);
  expect(await repo.getTestRunByGeneratedSeriesId("series-2")).toEqual(linked);
 });
 it("retrouve sans doublon la même question source/hypothèse/test",async()=>{
  const db=new ForeignKeyDatabase(),repo=new SqliteCoachingRepository(db);
  const linked={...run,testCode:"controlled_follow_up_series",generatedSeriesId:"series-2"};
  await repo.createCycle(cycle,linked);
  expect(await repo.findTestRun("series-1","hyp-1","controlled_follow_up_series")).toEqual(linked);
  expect(await repo.findTestRun("series-1","other","controlled_follow_up_series")).toBeNull();
  expect(await repo.getCycleByTestRunId(run.id)).toEqual(cycle);
 });
 it("retrouve le cycle par sa série de contrôle persistée",async()=>{
  const db=new ForeignKeyDatabase(),repo=new SqliteCoachingRepository(db);
  const linked={...cycle,controlSeriesId:"control-series",status:"control_series_pending" as const};
  await repo.createCycle(linked,run);
  expect(await repo.getCycleByControlSeriesId("control-series")).toEqual(linked);
  expect(await repo.getCycleByControlSeriesId("other-series")).toBeNull();
 });
});
