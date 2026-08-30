import {describe,expect,it} from "vitest";
import {Database,SqlParameter} from "../infrastructure/database/types";
import {buildFullBackupData,RECOVERY_HARDENING_APP_VERSION} from "./fullBackupBuilder";
import {BACKUP_DATABASE_VERSION,FULL_BACKUP_SCHEMA_VERSION,REQUIRED_BACKUP_TABLES} from "../domain/localExports";
import {migrations} from "../infrastructure/database/migrations";

function database(rowsByTable:Record<string,unknown[]>):{db:Database;queries:string[]}{
 const queries:string[]=[];
 return{queries,db:{
  execAsync:async()=>{},runAsync:async()=>({changes:0}),getFirstAsync:async()=>null,
  getAllAsync:async<T>(sql:string,..._params:SqlParameter[])=>{queries.push(sql);const table=sql.replace("SELECT * FROM ","");return(rowsByTable[table]??[]) as T[]},
  withTransactionAsync:async task=>task(),
 }};
}
const digest=async(body:string)=>`sha256:${body}`;

describe("certification de l’export complet v13",()=>{
 it("inventorie exactement les 24 tables du schéma v13",()=>expect(REQUIRED_BACKUP_TABLES).toEqual([
  "app_settings","coaching_cycles","coaching_recommendations","confirmation_test_runs","demo_state","diagnostic_answers",
  "diagnostic_questions","human_hypothesis_reviews","impacts","instructor_feedback","local_issue_reports","reasoning_traces",
  "series","series_comparisons","series_metrics","session_safety_contexts","sessions","shooter_feedback","shooter_profiles",
  "shooting_observations","synthetic_demo_runs","target_types","technical_hypotheses","weapons"]));
 it("correspond exactement aux tables créées par les migrations 1 à 13",()=>{const created=migrations.flatMap(migration=>
  [...migration.sql.matchAll(/CREATE TABLE\s+([a-z_]+)/g)].map(match=>match[1])).sort();
  expect([...REQUIRED_BACKUP_TABLES].sort()).toEqual(created);});
 it("interroge chacune des 24 tables sans omission",async()=>{const {db,queries}=database({});await buildFullBackupData({db,digest,exportedAt:"now"});
  expect(queries).toEqual(REQUIRED_BACKUP_TABLES.map(table=>`SELECT * FROM ${table}`));});
 it("versionne le format, la base, l’application et l’algorithme",async()=>{const {db}=database({});const backup=await buildFullBackupData({db,digest,exportedAt:"now"});
  expect(backup).toMatchObject({schemaVersion:FULL_BACKUP_SCHEMA_VERSION,databaseVersion:BACKUP_DATABASE_VERSION,
   appVersion:RECOVERY_HARDENING_APP_VERSION,checksumAlgorithm:"SHA-256",exportedAt:"now"});});
 it("inclut le contexte de sécurité de séance",async()=>{const row={session_id:"s"};const {db}=database({session_safety_contexts:[row]});
  expect((await buildFullBackupData({db,digest})).tables.session_safety_contexts).toEqual([row]);});
 it("inclut number_of_hands dans les séances exportées",async()=>{const row={id:"s",number_of_hands:1};const {db}=database({sessions:[row]});
  expect((await buildFullBackupData({db,digest})).tables.sessions).toEqual([row]);});
 it("compte séparément les partitions réelles, démo et tests",async()=>{const {db}=database({sessions:[{},
  {data_partition:"real"},{data_partition:"demo"},{data_partition:"automated_test"}]});
  expect((await buildFullBackupData({db,digest})).partitionCounts).toEqual({real:2,demo:1,automated_test:1});});
 it("calcule l’empreinte sur le contenu exact des tables",async()=>{const {db}=database({weapons:[{id:"w"}]});const backup=await buildFullBackupData({db,digest});
  expect(backup.checksum).toBe(`sha256:${JSON.stringify(backup.tables)}`);});
});
