import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { digestStringAsync, CryptoDigestAlgorithm } from "expo-crypto";
import { Database } from "../infrastructure/database/types";
import { FullLocalBackup, MVP_VALIDATION_SCHEMA_VERSION, StructuredSessionReport } from "../domain/mvpValidationTypes";
import { COACHING_RULESET_VERSION } from "../domain/coachingTypes";
import { HYPOTHESIS_RULESET_VERSION } from "../domain/technicalHypothesisCatalog";
import { OBSERVATION_RULESET_VERSION } from "../domain/observationCatalog";
import { serializeSessionReport } from "../domain/localExports";
import { buildFullBackupData } from "./fullBackupBuilder";
async function rows(db:Database,table:string,where="",params:string[]=[]){return db.getAllAsync<Record<string,unknown>>(`SELECT * FROM ${table} ${where}`,...params)}
function parsed(values:Record<string,unknown>[]){return values.map(x=>typeof x.result_json==="string"?JSON.parse(x.result_json):x)}
export async function buildSessionReport(db:Database,sessionId:string):Promise<StructuredSessionReport>{
 const session=(await rows(db,"sessions","WHERE id=?",[sessionId]))[0];if(!session)throw new Error("Séance introuvable.");
 const series=await rows(db,"series","WHERE session_id=? ORDER BY sequence_number",[sessionId]);const ids=series.map(x=>String(x.id));
 const bySeries=async(table:string)=>ids.length?rows(db,table,`WHERE series_id IN (${ids.map(()=>"?").join(",")})`,ids):[];
 const cycles=parsed(await rows(db,"coaching_cycles","WHERE session_id=?",[sessionId]));
 const report:StructuredSessionReport={schemaVersion:MVP_VALIDATION_SCHEMA_VERSION,generatedAt:new Date().toISOString(),
  partition:(session.data_partition as "real"|"demo"|"automated_test")??"real",session,series,
  impacts:await bySeries("impacts"),metrics:await bySeries("series_metrics"),
  comparisons:parsed(await rows(db,"series_comparisons","WHERE session_id=?",[sessionId])),
  observations:parsed(await rows(db,"shooting_observations","WHERE session_id=?",[sessionId])),
  hypotheses:parsed(await rows(db,"technical_hypotheses","WHERE session_id=?",[sessionId])),
  diagnosticAnswers:await rows(db,"diagnostic_answers","WHERE session_id=?",[sessionId]),
  confirmationTests:parsed(await rows(db,"confirmation_test_runs","WHERE session_id=?",[sessionId])),
  recommendations:parsed(await rows(db,"coaching_recommendations","WHERE session_id=?",[sessionId])),cycles,
  reasoningTraces:parsed(await rows(db,"reasoning_traces","WHERE session_id=?",[sessionId])),
  shooterFeedback:parsed(await rows(db,"shooter_feedback","WHERE session_id=?",[sessionId])),
  instructorFeedback:parsed(await rows(db,"instructor_feedback","WHERE session_id=?",[sessionId])),
  humanReviews:cycles.length?parsed(await rows(db,"human_hypothesis_reviews",`WHERE cycle_id IN (${cycles.map(()=>"?").join(",")})`,cycles.map(x=>String((x as {id:string}).id)))):[],
  issues:parsed(await rows(db,"local_issue_reports","WHERE session_id=?",[sessionId])),
  sections:{measuredFacts:["Impacts et métriques objectives"],observations:["Constats produits par des seuils versionnés"],
   hypotheses:["Causes possibles à vérifier, jamais des diagnostics"],actions:["Tests et exercices effectivement enregistrés"],results:["Évaluation limitée à l’objectif choisi"]},
  limitations:["Impacts placés manuellement.","La cible seule ne démontre pas une cause.","Une amélioration isolée doit être reproduite."],
  versions:{coaching:COACHING_RULESET_VERSION,hypotheses:HYPOTHESIS_RULESET_VERSION,observations:OBSERVATION_RULESET_VERSION}};
 return report;
}
async function saveAndShare(name:string,text:string){
 const file=new File(Paths.cache,name);file.create({overwrite:true});file.write(text);
 if(await Sharing.isAvailableAsync())await Sharing.shareAsync(file.uri,{mimeType:"application/json",dialogTitle:"Exporter localement"});
 return file.uri;
}
export async function exportSessionJson(db:Database,sessionId:string){return saveAndShare(`shooting-coach-session-${sessionId}.json`,serializeSessionReport(await buildSessionReport(db,sessionId)))}
export async function buildFullBackup(db:Database):Promise<FullLocalBackup>{
 return buildFullBackupData({db,digest:body=>digestStringAsync(CryptoDigestAlgorithm.SHA256,body)});
}
export async function exportFullBackup(db:Database){return saveAndShare(`shooting-coach-backup-${Date.now()}.json`,JSON.stringify(await buildFullBackup(db),null,2))}
