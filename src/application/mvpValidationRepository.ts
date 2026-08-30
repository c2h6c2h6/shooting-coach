import { Database } from "../infrastructure/database/types";
import { HumanHypothesisReview, InstructorFeedback, LocalIssueReport, ReasoningTrace, ShooterFeedback } from "../domain/mvpValidationTypes";
type ValidationRecord=ReasoningTrace|ShooterFeedback|InstructorFeedback|HumanHypothesisReview|LocalIssueReport;
export class MvpValidationRepository{
 constructor(private db:Database){}
 async setDemo(enabled:boolean,scenarioCode:string|null=null){await this.db.runAsync("UPDATE demo_state SET enabled=?,loaded_scenario_code=? WHERE singleton_key=1",enabled?1:0,scenarioCode)}
 async getDemo(){return(await this.db.getFirstAsync<{enabled:number;loaded_scenario_code:string|null}>("SELECT enabled,loaded_scenario_code FROM demo_state WHERE singleton_key=1"))??{enabled:0,loaded_scenario_code:null}}
 async resetDemo(){
  await this.db.withTransactionAsync(async()=>{
   await this.db.runAsync("DELETE FROM synthetic_demo_runs");
   await this.db.runAsync("DELETE FROM local_issue_reports WHERE data_partition='demo'");
   await this.setDemo(false,null);
  });
 }
 async saveDemoRun(id:string,scenarioCode:string,scenarioVersion:string,value:unknown,createdAt:string){
  await this.db.runAsync("INSERT OR REPLACE INTO synthetic_demo_runs(id,scenario_code,scenario_version,created_at,result_json) VALUES(?,?,?,?,?)",
   id,scenarioCode,scenarioVersion,createdAt,JSON.stringify(value));
 }
 private async save(table:string,value:ValidationRecord,columns:string[],params:(string|null)[]){
  await this.db.runAsync(`INSERT INTO ${table} (${columns.join(",")},result_json) VALUES (${columns.map(()=>"?").join(",")},?)`,...params,JSON.stringify(value));
 }
 saveTrace(x:ReasoningTrace){return this.save("reasoning_traces",x,["id","cycle_id","session_id","source_series_id","data_partition","trace_version","created_at"],[x.id,x.cycleId,x.sessionId,x.sourceSeriesId,x.dataPartition,x.traceVersion,x.createdAt])}
 saveShooterFeedback(x:ShooterFeedback){return this.save("shooter_feedback",x,["id","cycle_id","session_id","created_at"],[x.id,x.cycleId,x.sessionId,x.createdAt])}
 saveInstructorFeedback(x:InstructorFeedback){return this.save("instructor_feedback",x,["id","cycle_id","session_id","created_at"],[x.id,x.cycleId,x.sessionId,x.createdAt])}
 saveHumanReview(x:HumanHypothesisReview){return this.save("human_hypothesis_reviews",x,["id","cycle_id","hypothesis_id","verdict","evaluator_role","created_at"],[x.id,x.cycleId,x.hypothesisId,x.verdict,x.evaluatorRole,x.createdAt])}
 saveIssue(x:LocalIssueReport){return this.save("local_issue_reports",x,["id","session_id","series_id","cycle_id","screen","category","severity","data_partition","created_at"],[x.id,x.sessionId,x.seriesId,x.cycleId,x.screen,x.category,x.severity,x.dataPartition,x.createdAt])}
 async listJson<T>(table:string,sessionId:string){return(await this.db.getAllAsync<{result_json:string}>(`SELECT result_json FROM ${table} WHERE session_id=? ORDER BY created_at`,sessionId)).map(r=>JSON.parse(r.result_json) as T)}
}
