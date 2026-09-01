import {describe,expect,it} from "vitest";
import type {CoachingCycle,SafetyContext} from "./coachingTypes";
import {trainingDrillCatalog} from "./trainingDrillCatalog";
import {completeTechnicalObservationControl,prepareTechnicalObservationControl,prepareTransferTechnicalObservationControl,technicalObservationSafetyBlockers,type TechnicalObservationControlDefinition} from "./technicalObservationControl";
import {d2LateralAcquisitionTechnicalControl,d2LateralTransferTechnicalControl,lateralTransferState,lateralTriggerPressurePedagogicalChain} from "./pedagogical-v2/lateralTriggerPressurePedagogicalChain";
import {d2TriggerHandTechnicalControl} from "./technicalObservationControl";
import {loadPedagogicalReferenceDV1} from "./pedagogical-v2/catalogs/pedagogical-reference-d-v1";
import {readFileSync} from "node:fs";
import {resolve} from "node:path";

const safe:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,weaponUnloadedVerified:true,
 magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,
 dummyRoundsAllowed:true,dummyRoundProcedureKnown:true,instructorPresent:true,canDryFire:true,canLiveFire:true};
const cycle=(transfer=false):CoachingCycle=>({id:"cycle",sessionId:"session",sourceSeriesId:"source",hypothesisId:"hypothesis",
 confirmationTestRunId:"test",recommendationId:null,drillCode:transfer?"DRILL_D2_LATERAL_ACQUISITION":null,controlSeriesId:null,status:"drill_pending",
 outcome:null,objective:"horizontal_stability",startedAt:"start",completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:"v",
 ...(transfer?{transferState:lateralTransferState()}:{}),});
const complete=(value:CoachingCycle,definition:TechnicalObservationControlDefinition,observationCode:string)=>completeTechnicalObservationControl({cycle:value,definition,observationCode,evaluationId:"evaluation",evidenceId:"evidence",evaluatedAt:"2026-09-01T00:00:00.000Z"});

describe("D2.1 acquisition puis transfert live",()=>{
 it("conserve le cycle historique sans transfert inchangé",()=>{
  const completed=complete(prepareTechnicalObservationControl(cycle(),d2TriggerHandTechnicalControl),d2TriggerHandTechnicalControl,"fingers_stable");
  expect(completed).toMatchObject({status:"completed",outcome:"objective_improved",pedagogicalDecision:null,masteryEvent:null});
  expect(completed).not.toHaveProperty("transferState");
 });

 it("déclare un binding explicite TEST → TECH → EX → CONTROL sans fallback",()=>{
  expect(lateralTriggerPressurePedagogicalChain).toMatchObject({hypothesisCode:"LATERAL_TRIGGER_PRESSURE",confirmationTestCode:"TEST_TRIGGER_FINGER_PLACEMENT",
   pedagogicalTechniqueId:"technique-d2-lateral-pressure-01",acquisitionExerciseDefinitionId:"exercise-d2-lateral-acquisition-01",
   transferExerciseDefinitionId:"exercise-d2-lateral-transfer-02",acquisitionDrillCode:"DRILL_D2_LATERAL_ACQUISITION",transferDrillCode:"DRILL_D2_LATERAL_TRANSFER"});
 });

 it("décrit EX-D2-01 à sec et EX-D2-02 comme transfert",()=>{
  const catalog=loadPedagogicalReferenceDV1();
  expect(catalog.techniques.find(item=>item.code==="TECH-D2-01")?.name).toBe("Construire une action directionnellement neutre");
  expect(catalog.exercises.find(item=>item.code==="EX-D2-01")?.learningPhase).toBe("acquisition");
  expect(catalog.exercises.find(item=>item.code==="EX-D2-02")?.learningPhase).toBe("transfer");
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_D2_LATERAL_ACQUISITION")).toMatchObject({requiresDryFire:true,requiresLiveFire:false});
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_D2_LATERAL_TRANSFER")).toMatchObject({requiresDryFire:false,requiresLiveFire:true});
 });

 it("utilise technical_observation pour les contrôles acquisition et live",()=>{
  expect(d2LateralAcquisitionTechnicalControl).toMatchObject({definitionCode:"CONTROL-D2-01",mode:"technical_observation",requiresDryFire:true});
  expect(d2LateralTransferTechnicalControl).toMatchObject({definitionCode:"CONTROL-D2-02",mode:"technical_observation",requiresLiveFire:true});
 });

 it("une acquisition favorable conserve le cycle actif et ouvre le transfert pending",()=>{
  const completed=complete(prepareTechnicalObservationControl(cycle(true),d2LateralAcquisitionTechnicalControl),d2LateralAcquisitionTechnicalControl,"lateral_absent");
  expect(completed).toMatchObject({status:"drill_pending",outcome:null,competenceEvaluation:{structuredResult:{outcome:"objective_improved"}},
   transferState:{acquisitionControlCompleted:true,acquisitionOutcome:"objective_improved",transferStatus:"pending",transferOutcome:null},pedagogicalDecision:null,masteryEvent:null});
 });

 it.each([["lateral_reproducible","objective_stable"],["lateral_inconclusive","insufficient_data"]] as const)
 ("une acquisition %s ne déclenche pas le transfert",(observation,outcome)=>{
  const completed=complete(prepareTechnicalObservationControl(cycle(true),d2LateralAcquisitionTechnicalControl),d2LateralAcquisitionTechnicalControl,observation);
  expect(completed).toMatchObject({status:"completed",outcome,transferState:{transferStatus:"not_required",transferOutcome:null},pedagogicalDecision:null,masteryEvent:null});
 });

 it("bloque le contrôle live tant que la sécurité live n’est pas confirmée",()=>{
  expect(technicalObservationSafetyBlockers(d2LateralTransferTechnicalControl,{...safe,canLiveFire:false})).toContain("Prérequis complets du tir réel non confirmés.");
  expect(technicalObservationSafetyBlockers(d2LateralTransferTechnicalControl,safe)).toEqual([]);
 });

 it("prépare puis clôt seulement le contrôle live final",()=>{
  const acquisition=complete(prepareTechnicalObservationControl(cycle(true),d2LateralAcquisitionTechnicalControl),d2LateralAcquisitionTechnicalControl,"lateral_absent");
  const live=prepareTransferTechnicalObservationControl({...acquisition,transferState:{...acquisition.transferState!,transferStatus:"ready"}},d2LateralTransferTechnicalControl);
  expect(live).toMatchObject({status:"evaluation_pending",technicalControl:{definitionCode:"CONTROL-D2-02"},transferState:{transferStatus:"ready"}});
  const final=complete(live,d2LateralTransferTechnicalControl,"lateral_neutral_live");
  expect(final).toMatchObject({status:"completed",outcome:"objective_improved",transferState:{transferStatus:"completed",transferOutcome:"objective_improved",acquisitionOutcome:"objective_improved"},pedagogicalDecision:null,masteryEvent:null});
 });

 it("ne transforme pas la cible ni compareSeries en preuve D2.1",()=>{
  const source=readFileSync(resolve(process.cwd(),"src/domain/pedagogical-v2/lateralTriggerPressurePedagogicalChain.ts"),"utf8");
  expect(source).not.toContain("compareSeries");
  expect(source).not.toContain("MasteryEvent");
  expect(source).not.toContain("PedagogicalDecision");
 });

 it("présente distinctement la correction à sec et la validation live",()=>{
  const ui=readFileSync(resolve(process.cwd(),"app/sessions/[id]/series/[seriesId]/coaching.tsx"),"utf8");
  expect(ui).toContain("CORRECTION OBSERVÉE À SEC");
  expect(ui).toContain("Validation en tir réel restant à effectuer.");
  expect(ui).toContain("Passer au transfert en tir réel");
  expect(ui).toContain("Correction validée en tir réel.");
  expect(ui).toContain("safetyConfirmedForTest");
 });
});
