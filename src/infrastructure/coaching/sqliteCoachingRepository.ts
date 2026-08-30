import { CoachingRepository } from "../../application/coachingRepository";
import { CoachingCycle, CoachingRecommendation, ConfirmationTestRun, SessionSafetyContext } from "../../domain/coachingTypes";
import { Database } from "../database/types";
export class SqliteCoachingRepository implements CoachingRepository{
 constructor(private db:Database){}
 async createCycle(c:CoachingCycle,t:ConfirmationTestRun){await this.db.withTransactionAsync(async()=>{await this.saveTest(t);await this.saveCycle(c);});}
 async getActiveCycle(sessionId:string){
  const rows=await this.db.getAllAsync<{result_json:string}>("SELECT result_json FROM coaching_cycles WHERE session_id=? AND status NOT IN ('completed','cancelled') ORDER BY started_at DESC",sessionId);
  for(const row of rows){const cycle=JSON.parse(row.result_json) as CoachingCycle;
   const tr=await this.db.getFirstAsync<{result_json:string}>("SELECT result_json FROM confirmation_test_runs WHERE id=?",cycle.confirmationTestRunId);
   if(!tr)continue;const test=JSON.parse(tr.result_json) as ConfirmationTestRun;
   // Compatibilité v13 : un ancien does_not_support enregistré en test_completed
   // est terminé logiquement et ne doit plus bloquer une investigation suivante.
   if(cycle.status==="test_completed"&&test.outcome==="does_not_support_hypothesis")continue;
   const rr=cycle.recommendationId?await this.db.getFirstAsync<{result_json:string}>("SELECT result_json FROM coaching_recommendations WHERE id=?",cycle.recommendationId):null;
   return{cycle,test,recommendation:rr?JSON.parse(rr.result_json):null};}
  return null;
 }
 async getCycle(id:string){const r=await this.db.getFirstAsync<{result_json:string}>("SELECT result_json FROM coaching_cycles WHERE id=?",id);return r?JSON.parse(r.result_json):null;}
 async getCycleByTestRunId(testRunId:string){const r=await this.db.getFirstAsync<{result_json:string}>(
  "SELECT result_json FROM coaching_cycles WHERE confirmation_test_run_id=? ORDER BY started_at DESC LIMIT 1",testRunId);
  return r?JSON.parse(r.result_json) as CoachingCycle:null;}
 async getCycleByControlSeriesId(seriesId:string){const r=await this.db.getFirstAsync<{result_json:string}>(
  "SELECT result_json FROM coaching_cycles WHERE control_series_id=? ORDER BY started_at DESC LIMIT 1",seriesId);
  return r?JSON.parse(r.result_json) as CoachingCycle:null;}
 async getTestRunByGeneratedSeriesId(seriesId:string){const r=await this.db.getFirstAsync<{result_json:string}>(
  "SELECT result_json FROM confirmation_test_runs WHERE json_extract(result_json,'$.generatedSeriesId')=? ORDER BY started_at DESC LIMIT 1",seriesId);
  return r?JSON.parse(r.result_json) as ConfirmationTestRun:null;}
 async findTestRun(sourceSeriesId:string,hypothesisId:string,testCode:string){const r=await this.db.getFirstAsync<{result_json:string}>(
  `SELECT result_json FROM confirmation_test_runs
   WHERE source_series_id=? AND hypothesis_id=? AND test_code=? AND status<>'cancelled'
   AND json_extract(result_json,'$.generatedSeriesId') IS NOT NULL
   ORDER BY started_at DESC LIMIT 1`,sourceSeriesId,hypothesisId,testCode);
  return r?JSON.parse(r.result_json) as ConfirmationTestRun:null;}
 async saveTest(x:ConfirmationTestRun){await this.db.runAsync(`INSERT INTO confirmation_test_runs
  (id,session_id,source_series_id,hypothesis_id,test_code,status,started_at,completed_at,outcome,ruleset_version,result_json)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
   status=excluded.status,started_at=excluded.started_at,completed_at=excluded.completed_at,
   outcome=excluded.outcome,ruleset_version=excluded.ruleset_version,result_json=excluded.result_json`,
  x.id,x.sessionId,x.sourceSeriesId,x.hypothesisId,x.testCode,x.status,x.startedAt,x.completedAt,x.outcome,x.rulesetVersion,JSON.stringify(x));}
 async saveRecommendation(x:CoachingRecommendation){await this.db.runAsync(`INSERT INTO coaching_recommendations
  (id,session_id,hypothesis_id,confirmation_test_run_id,recommendation_code,recommendation_type,status,priority,ruleset_version,generated_at,result_json)
  VALUES(?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
   status=excluded.status,priority=excluded.priority,ruleset_version=excluded.ruleset_version,
   generated_at=excluded.generated_at,result_json=excluded.result_json`,
  x.id,x.sessionId,x.hypothesisId,x.confirmationTestRunId,x.recommendationCode,x.recommendationType,x.status,x.priority,x.rulesetVersion,x.generatedAt,JSON.stringify(x));}
 async saveCycle(x:CoachingCycle){await this.db.runAsync(`INSERT INTO coaching_cycles
  (id,session_id,source_series_id,hypothesis_id,confirmation_test_run_id,recommendation_id,drill_code,control_series_id,status,outcome,started_at,completed_at,invalidated_at,invalidation_reason,ruleset_version,result_json)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET
   recommendation_id=excluded.recommendation_id,drill_code=excluded.drill_code,
   control_series_id=excluded.control_series_id,status=excluded.status,outcome=excluded.outcome,
   completed_at=excluded.completed_at,invalidated_at=excluded.invalidated_at,
   invalidation_reason=excluded.invalidation_reason,ruleset_version=excluded.ruleset_version,
   result_json=excluded.result_json`,
  x.id,x.sessionId,x.sourceSeriesId,x.hypothesisId,x.confirmationTestRunId,x.recommendationId,x.drillCode,x.controlSeriesId,x.status,x.outcome,x.startedAt,x.completedAt,x.invalidatedAt,x.invalidationReason,x.rulesetVersion,JSON.stringify(x));}
 async getSessionSafety(sessionId:string){
  const row=await this.db.getFirstAsync<{result_json:string}>("SELECT result_json FROM session_safety_contexts WHERE session_id=?",sessionId);
  return row?JSON.parse(row.result_json) as SessionSafetyContext:null;
 }
 async saveSessionSafety(x:SessionSafetyContext){await this.db.runAsync(`INSERT INTO session_safety_contexts
  (session_id,validated_at,result_json) VALUES(?,?,?)
  ON CONFLICT(session_id) DO UPDATE SET
   validated_at=excluded.validated_at,result_json=excluded.result_json`,
  x.sessionId,x.validatedAt,JSON.stringify(x));}
}
