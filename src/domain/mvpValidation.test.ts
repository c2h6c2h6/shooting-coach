import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { auditCatalogPrudence, auditCatalogSafety, auditPrudentText } from "./contentAudits";
import { MVP_VALIDATION_SCHEMA_VERSION } from "./mvpValidationTypes";
import { restorationPlan, validateBackup } from "./localExports";
import { createReasoningTrace } from "./reasoningJournal";
import { syntheticScenarioCatalog } from "./syntheticScenarioCatalog";
import { runSyntheticScenario } from "./syntheticScenarioRunner";

describe("consolidation du MVP",()=>{
 it("verrouille le catalogue réel à 16 tests de confirmation",()=>{
  expect(confirmationTestCatalog).toHaveLength(16);
  expect(new Set(confirmationTestCatalog.map(x=>x.code)).size).toBe(16);
 });
 it("versionne exactement les douze scénarios A à L",()=>{
  expect(syntheticScenarioCatalog.map(x=>x.code)).toEqual("ABCDEFGHIJKL".split(""));
  expect(new Set(syntheticScenarioCatalog.map(x=>x.version))).toEqual(new Set(["synthetic-scenarios-v1"]));
 });
 it.each(syntheticScenarioCatalog.map(s=>[s.code,s] as const))("exécute le scénario %s dans la partition de démonstration",(_,scenario)=>{
  const result=runSyntheticScenario(scenario);expect(result.partition).toBe("demo");
  expect(result.metrics.includedImpactCount).toBe(scenario.sourceImpacts.length);
  expect(result.hypotheses.every(h=>h.sourceRules.length>0)).toBe(true);
 });
 it("ne crée aucune cause négative pour la série A",()=>{
  expect(runSyntheticScenario(syntheticScenarioCatalog[0]).hypotheses).toEqual([]);
 });
 it("signale l’impact éloigné sans l’exclure",()=>{
  const result=runSyntheticScenario(syntheticScenarioCatalog[5]);
  expect(result.metrics.includedImpactCount).toBe(5);
  expect(result.metrics.excludedImpactCount).toBe(0);
  expect(result.metrics.potentiallyAtypicalImpactIds).toHaveLength(1);
 });
 it("conserve une confiance prudente avec la saisie manuelle",()=>{
  for(const s of syntheticScenarioCatalog)expect(runSyntheticScenario(s).hypotheses.every(h=>["very_low","low"].includes(h.confidenceLevel))).toBe(true);
 });
 it("les catalogues passent l’audit de prudence",()=>expect(auditCatalogPrudence()).toEqual([]));
 it("les catalogues passent l’audit de sécurité",()=>expect(auditCatalogSafety()).toEqual([]));
 it.each(["Votre erreur est le lâcher.","Vous anticipez.","Nous avons identifié la cause.","Résultat garanti."])("détecte la formulation interdite %s",text=>expect(auditPrudentText(text)).not.toEqual([]));
 it("le journal garde sources, versions, classement et métriques ciblées",()=>{
  const h=runSyntheticScenario(syntheticScenarioCatalog[3]).hypotheses;
  const trace=createReasoningTrace({id:"t",cycleId:"c",sessionId:"s",sourceSeriesId:"a",createdAt:"now",sourceSnapshot:{impactIds:["i1"]},
   retainedObservationCodes:["HORIZONTAL_SPREAD"],rejectedObservations:[{code:"SHOT_ANTICIPATION",reason:"Non observable sur la cible"}],
   hypotheses:h,rankingReason:"Score déterministe",testChoiceReason:"Test discriminant",recommendationChoiceReason:null,objective:"horizontal_stability",partition:"automated_test"});
  expect(trace.traceVersion).toBe("reasoning-trace-v1");expect(trace.evaluationMetricKeys).toEqual(["boundingBoxWidth","horizontalOffset"]);
  expect(trace.dataPartition).toBe("automated_test");expect(trace.limitations.length).toBeGreaterThan(0);
 });
 it("refuse une sauvegarde incompatible",()=>expect(validateBackup({schemaVersion:"future"})).toEqual({ok:false,reason:"Version de sauvegarde incompatible."}));
 it("refuse une sauvegarde incomplète",()=>expect(validateBackup({schemaVersion:MVP_VALIDATION_SCHEMA_VERSION,tables:{},checksum:"x"}).ok).toBe(false));
 it("n’écrase jamais silencieusement une base existante",()=>{
  expect(restorationPlan(4,{schemaVersion:MVP_VALIDATION_SCHEMA_VERSION,appVersion:"x",exportedAt:"x",tables:{},checksum:"x",partitionCounts:{real:0,demo:0,automated_test:0}}))
   .toMatchObject({requiresPreRestoreBackup:true,mayOverwrite:false,mode:"import_as_copy"});
 });
});
