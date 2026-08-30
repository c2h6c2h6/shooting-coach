import { Database } from "../infrastructure/database/types";
import { FullLocalBackup } from "../domain/mvpValidationTypes";
import { BACKUP_DATABASE_VERSION,backupChecksumBody,FULL_BACKUP_SCHEMA_VERSION,REQUIRED_BACKUP_TABLES } from "../domain/localExports";

export const RECOVERY_HARDENING_APP_VERSION="0.1.0-step-16-recovery-hardening";

function partitionOf(value:unknown){
 if(!value||typeof value!=="object")return"real";
 const partition=(value as Record<string,unknown>).data_partition;
 return partition==="demo"||partition==="automated_test"?partition:"real";
}

export async function buildFullBackupData(input:{
 db:Database;digest:(body:string)=>Promise<string>;exportedAt?:string;
}):Promise<FullLocalBackup>{
 const tables:Record<string,unknown[]>={};
 for(const table of REQUIRED_BACKUP_TABLES)tables[table]=await input.db.getAllAsync<Record<string,unknown>>(`SELECT * FROM ${table}`);
 const sessions=tables.sessions??[];
 return{
  schemaVersion:FULL_BACKUP_SCHEMA_VERSION,
  databaseVersion:BACKUP_DATABASE_VERSION,
  appVersion:RECOVERY_HARDENING_APP_VERSION,
  exportedAt:input.exportedAt??new Date().toISOString(),tables,
  checksumAlgorithm:"SHA-256",
  checksum:await input.digest(backupChecksumBody(tables)),
  partitionCounts:{
   real:sessions.filter(x=>partitionOf(x)==="real").length,
   demo:sessions.filter(x=>partitionOf(x)==="demo").length,
   automated_test:sessions.filter(x=>partitionOf(x)==="automated_test").length,
  },
 };
}
