import {describe,expect,it} from "vitest";
import {FullLocalBackup} from "./mvpValidationTypes";
import {BACKUP_DATABASE_VERSION,backupChecksumBody,FULL_BACKUP_SCHEMA_VERSION,LEGACY_BACKUP_SCHEMA_VERSION,
 LEGACY_FULL_BACKUP_DATABASE_VERSION,LEGACY_FULL_BACKUP_SCHEMA_VERSION,LEGACY_REQUIRED_BACKUP_TABLES,
 prepareBackupTablesForV13Restore,REQUIRED_BACKUP_TABLES,restorationPlan,validateBackup,validateBackupChecksum} from "./localExports";

const tables=(names:string[])=>Object.fromEntries(names.map(name=>[name,[]]));
const current=(patch:Partial<FullLocalBackup>={}):FullLocalBackup=>({schemaVersion:FULL_BACKUP_SCHEMA_VERSION,
 appVersion:"candidate",databaseVersion:BACKUP_DATABASE_VERSION,checksumAlgorithm:"SHA-256",exportedAt:"now",
 tables:tables(REQUIRED_BACKUP_TABLES),checksum:"valid",partitionCounts:{real:0,demo:0,automated_test:0},...patch});

describe("certification de validation des sauvegardes",()=>{
 it("accepte la structure complète v13",()=>expect(validateBackup(current()).ok).toBe(true));
 it("préserve la lecture structurelle du format historique v1",()=>expect(validateBackup({...current(),schemaVersion:LEGACY_BACKUP_SCHEMA_VERSION,
  databaseVersion:undefined,checksumAlgorithm:undefined,tables:tables(LEGACY_REQUIRED_BACKUP_TABLES)}).ok).toBe(true));
 it("refuse une sauvegarde v13 sans contexte de sécurité",()=>{const value=current();delete value.tables.session_safety_contexts;
  expect(validateBackup(value)).toEqual({ok:false,reason:"Tables obligatoires absentes : session_safety_contexts."});});
 it("refuse une version SQLite différente",()=>expect(validateBackup(current({databaseVersion:11}))).toEqual({ok:false,reason:"Version de base de données incompatible."}));
 it("refuse un algorithme d’empreinte absent",()=>expect(validateBackup({...current(),checksumAlgorithm:undefined})).toEqual({ok:false,reason:"Algorithme d’empreinte incompatible."}));
 it("vérifie réellement une empreinte correcte",async()=>{const value=current();value.checksum=`digest:${backupChecksumBody(value.tables)}`;
  expect((await validateBackupChecksum(value,async body=>`digest:${body}`)).ok).toBe(true);});
 it("détecte une sauvegarde altérée",async()=>{const value=current({checksum:"digest:original"});
  expect(await validateBackupChecksum(value,async body=>`digest:${body}`)).toEqual({ok:false,reason:"L’empreinte de la sauvegarde ne correspond pas à son contenu."});});
 it("maintient l’interdiction d’écrasement silencieux",()=>expect(restorationPlan(3,current())).toMatchObject({requiresPreRestoreBackup:true,mayOverwrite:false,mode:"import_as_copy"}));
 it("accepte une sauvegarde complète v12 et prépare ses séances avec NULL",()=>{
  const value=current({schemaVersion:LEGACY_FULL_BACKUP_SCHEMA_VERSION,databaseVersion:LEGACY_FULL_BACKUP_DATABASE_VERSION});
  value.tables.sessions=[{id:"legacy-session"}];
  expect(validateBackup(value).ok).toBe(true);
  expect(prepareBackupTablesForV13Restore(value).sessions).toEqual([{id:"legacy-session",number_of_hands:null}]);
 });
 it("conserve la valeur number_of_hands lors de la restauration v13",()=>{
  const value=current();value.tables.sessions=[{id:"session-1",number_of_hands:1},{id:"session-2",number_of_hands:2}];
  expect(validateBackup(value).ok).toBe(true);
  expect(prepareBackupTablesForV13Restore(value).sessions).toEqual(value.tables.sessions);
 });
 it("refuse un champ number_of_hands absent ou invalide dans un backup v13",()=>{
  const missing=current();missing.tables.sessions=[{id:"session-1"}];
  expect(validateBackup(missing).ok).toBe(false);
  const invalid=current();invalid.tables.sessions=[{id:"session-1",number_of_hands:3}];
  expect(validateBackup(invalid).ok).toBe(false);
 });
});
