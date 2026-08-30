import { FullLocalBackup, MVP_VALIDATION_SCHEMA_VERSION, StructuredSessionReport } from "./mvpValidationTypes";
export const LEGACY_BACKUP_SCHEMA_VERSION=MVP_VALIDATION_SCHEMA_VERSION;
export const LEGACY_FULL_BACKUP_SCHEMA_VERSION="shooting-coach-full-backup-v12";
export const LEGACY_FULL_BACKUP_DATABASE_VERSION=12;
export const FULL_BACKUP_SCHEMA_VERSION="shooting-coach-full-backup-v13";
export const BACKUP_DATABASE_VERSION=13;
export const LEGACY_REQUIRED_BACKUP_TABLES=["shooter_profiles","sessions","series","impacts","series_metrics","series_comparisons",
 "shooting_observations","technical_hypotheses","diagnostic_answers","confirmation_test_runs","coaching_recommendations",
 "coaching_cycles","reasoning_traces","shooter_feedback","instructor_feedback","human_hypothesis_reviews","local_issue_reports"];
export const REQUIRED_BACKUP_TABLES=["app_settings","coaching_cycles","coaching_recommendations","confirmation_test_runs",
 "demo_state","diagnostic_answers","diagnostic_questions","human_hypothesis_reviews","impacts","instructor_feedback",
 "local_issue_reports","reasoning_traces","series","series_comparisons","series_metrics","session_safety_contexts","sessions",
 "shooter_feedback","shooter_profiles","shooting_observations","synthetic_demo_runs","target_types","technical_hypotheses","weapons"];
export function serializeSessionReport(report:StructuredSessionReport){return JSON.stringify(report,null,2)}
export function backupChecksumBody(tables:Record<string,unknown[]>){return JSON.stringify(tables)}
export function validateBackup(value:unknown):{ok:true;backup:FullLocalBackup}|{ok:false;reason:string}{
 if(!value||typeof value!=="object")return{ok:false,reason:"Le fichier ne contient pas un objet de sauvegarde."};
 const b=value as Partial<FullLocalBackup>;
 if(b.schemaVersion!==FULL_BACKUP_SCHEMA_VERSION&&b.schemaVersion!==LEGACY_FULL_BACKUP_SCHEMA_VERSION&&b.schemaVersion!==LEGACY_BACKUP_SCHEMA_VERSION)
  return{ok:false,reason:"Version de sauvegarde incompatible."};
 if(!b.tables||typeof b.tables!=="object")return{ok:false,reason:"Tables absentes ou invalides."};
 const required=b.schemaVersion===FULL_BACKUP_SCHEMA_VERSION||b.schemaVersion===LEGACY_FULL_BACKUP_SCHEMA_VERSION
  ?REQUIRED_BACKUP_TABLES:LEGACY_REQUIRED_BACKUP_TABLES;
 const missing=required.filter(t=>!Array.isArray(b.tables?.[t]));
 if(missing.length)return{ok:false,reason:`Tables obligatoires absentes : ${missing.join(", ")}.`};
 if(typeof b.checksum!=="string"||!b.checksum)return{ok:false,reason:"Empreinte de sauvegarde absente."};
 if(b.schemaVersion===FULL_BACKUP_SCHEMA_VERSION&&b.databaseVersion!==BACKUP_DATABASE_VERSION)
  return{ok:false,reason:"Version de base de données incompatible."};
 if(b.schemaVersion===FULL_BACKUP_SCHEMA_VERSION&&b.checksumAlgorithm!=="SHA-256")
  return{ok:false,reason:"Algorithme d’empreinte incompatible."};
 if(b.schemaVersion===LEGACY_FULL_BACKUP_SCHEMA_VERSION&&b.databaseVersion!==LEGACY_FULL_BACKUP_DATABASE_VERSION)
  return{ok:false,reason:"Version de base de données incompatible."};
 if(b.schemaVersion===LEGACY_FULL_BACKUP_SCHEMA_VERSION&&b.checksumAlgorithm!=="SHA-256")
  return{ok:false,reason:"Algorithme d’empreinte incompatible."};
 if(b.schemaVersion===FULL_BACKUP_SCHEMA_VERSION){
  const invalidSession=(b.tables.sessions as unknown[]).some(row=>{
   if(!row||typeof row!=="object"||!("number_of_hands" in row))return true;
   const hands=(row as Record<string,unknown>).number_of_hands;
   return hands!==null&&hands!==1&&hands!==2;
  });
  if(invalidSession)return{ok:false,reason:"Nombre de mains absent ou invalide dans une séance de la sauvegarde v13."};
 }
 return{ok:true,backup:b as FullLocalBackup};
}
export async function validateBackupChecksum(value:unknown,digest:(body:string)=>Promise<string>):Promise<
 {ok:true;backup:FullLocalBackup}|{ok:false;reason:string}>{
 const structural=validateBackup(value);if(!structural.ok)return structural;
 const actual=await digest(backupChecksumBody(structural.backup.tables));
 if(actual.toLowerCase()!==structural.backup.checksum.toLowerCase())
  return{ok:false,reason:"L’empreinte de la sauvegarde ne correspond pas à son contenu."};
 return structural;
}
export function restorationPlan(existingRows:number,backup:FullLocalBackup){
 return{requiresPreRestoreBackup:existingRows>0,mayOverwrite:false,mode:existingRows>0?"import_as_copy":"restore_empty_database",
  message:existingRows>0?"Les données existantes ne seront pas écrasées. Effectuez d’abord une sauvegarde, puis importez comme copie.":"La restauration peut être effectuée dans la base vide."};
}
export function prepareBackupTablesForV13Restore(backup:FullLocalBackup):Record<string,unknown[]>{
 const sessions=(backup.tables.sessions??[]).map(row=>{
  if(!row||typeof row!=="object")return row;
  if(backup.schemaVersion===FULL_BACKUP_SCHEMA_VERSION)return{...(row as Record<string,unknown>)};
  return{...(row as Record<string,unknown>),number_of_hands:null};
 });
 return{...backup.tables,sessions};
}
