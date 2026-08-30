import {describe,expect,it} from "vitest";
import {confirmationTestCatalog} from "./confirmationTestCatalog";
import {outcomeForTestObservation} from "./confirmationTestObservation";
import {selectConfirmationTest} from "./confirmationTestEngine";
import {proposeCoaching} from "./coachingCycleEngine";
import {coachingRecommendationCatalog} from "./coachingRecommendationCatalog";
import {trainingDrillCatalog} from "./trainingDrillCatalog";
import {observationHypothesisMappings} from "./observationHypothesisMappings";
import {buildTechnicalCompetenceEvaluation,completeTechnicalObservationControl,prepareTechnicalObservationControl,controlModeForCycle,d2TriggerHandTechnicalControl} from "./technicalObservationControl";
import {loadPedagogicalReferenceABV1} from "./pedagogical-v2/catalogs/pedagogical-reference-ab-v1";
import {competenceEvaluationSchema} from "./pedagogical-v2/inputSchemas";
import {returnToLineTechnicalControl,wristInterventionForOutcome,wristOrganizationTechnicalControl,wristPedagogicalBindings} from "./pedagogical-v2/wristStabilityPedagogicalChain";
import type {CoachingCycle,SafetyContext} from "./coachingTypes";
import type {TechnicalHypothesis} from "./technicalHypothesis";

const safety:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
 weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
 eyeAndEarProtection:true,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};
const hypothesis=(code:"WRIST_INSTABILITY"|"POOR_RECOIL_RETURN",hands:1|2=2):TechnicalHypothesis=>({id:code,sessionId:"s",seriesId:"series",comparisonId:null,
 observationId:"o",hypothesisCode:code,category:"grip",status:"requires_confirmation",plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:5,
 supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:hands},sourceRules:[],rulesetVersion:"v",generatedAt:"2026-08-28T00:00:00.000Z"});
const cycle=():CoachingCycle=>({id:"c",sessionId:"s",sourceSeriesId:"series",hypothesisId:"h",confirmationTestRunId:"t",recommendationId:null,
 drillCode:null,controlSeriesId:null,status:"drill_pending",outcome:null,objective:null,startedAt:"2026-08-28T00:00:00.000Z",completedAt:null,
 invalidatedAt:null,invalidationReason:null,rulesetVersion:"v"});

describe("consolidation B6 poignets",()=>{
 it("conserve competence:B6 comme unique compétence canonique avec taxonomie métier B3",()=>{
  const catalog=loadPedagogicalReferenceABV1(),b6=catalog.competences.find(item=>item.id==="competence:B6")!;
  expect(b6).toMatchObject({code:"B6",name:"Organiser et stabiliser les poignets",prerequisiteIds:["competence:B3","competence:B4"]});
  expect(catalog.competences.filter(item=>/retour en ligne/i.test(item.name))).toHaveLength(0);
 });
 it("raccorde une seule technique commune et deux exercices",()=>{
  const catalog=loadPedagogicalReferenceABV1();
  expect(catalog.techniques.find(item=>item.id==="technique:B6:01")?.compatibleCompetenceIds).toEqual(["competence:B6"]);
  expect(catalog.exercises.filter(item=>item.primaryCompetenceId==="competence:B6").map(item=>item.id))
   .toEqual(["exercise:B6:01","exercise:B6:02"]);
 });
 it.each([["WRIST_INSTABILITY","TEST_WRIST_STABILITY"],["POOR_RECOIL_RETURN","TEST_RETURN_TO_LINE"]] as const)
 ("sélectionne pour %s le test %s à une et deux mains",(code,testCode)=>{
  for(const hands of [1,2] as const)expect(selectConfirmationTest({hypothesis:hypothesis(code,hands),alternatives:[],sessionMode:"coaching_free",
   safety,userCanPerform:true,contextKnown:true,numberOfHands:hands}).primary?.code).toBe(testCode);
 });
 it.each([
  ["TEST_WRIST_STABILITY","WRIST_INSTABILITY","Organisation sensiblement stable","does_not_support_hypothesis"],
  ["TEST_WRIST_STABILITY","WRIST_INSTABILITY","Flexion ou rupture parasite reproductible","supports_hypothesis"],
  ["TEST_WRIST_STABILITY","WRIST_INSTABILITY","Variation irrégulière","inconclusive"],
  ["TEST_RETURN_TO_LINE","POOR_RECOIL_RETURN","Retour régulier et comparable","does_not_support_hypothesis"],
  ["TEST_RETURN_TO_LINE","POOR_RECOIL_RETURN","Retour variable d’un coup à l’autre","supports_hypothesis"],
  ["TEST_RETURN_TO_LINE","POOR_RECOIL_RETURN","Correction musculaire importante nécessaire","supports_hypothesis"],
  ["TEST_RETURN_TO_LINE","POOR_RECOIL_RETURN","Retour systématiquement décalé mais reproductible","inconclusive"],
 ] as const)("mappe %s / %s",(test,code,observation,outcome)=>expect(outcomeForTestObservation(test,code,observation)).toBe(outcome));
 it.each([
  ["WRIST_INSTABILITY","REC_WRIST_ORGANIZATION","DRILL_WRIST_ORGANIZATION"],
  ["POOR_RECOIL_RETURN","REC_RETURN_TO_LINE","DRILL_RETURN_TO_LINE"],
 ] as const)("sélectionne explicitement la chaîne %s",(code,recommendation,drill)=>{
  const proposal=proposeCoaching({hypothesis:hypothesis(code),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"intermediate",numberOfHands:2,safety});
  expect(proposal).toMatchObject({recommendation:{recommendationCode:recommendation},drill:{code:drill},pedagogicalBinding:{competenceId:"competence:B6",pedagogicalTechniqueId:"technique:B6:01"}});
  expect(proposal?.drill.code).not.toBe("DRILL_FOLLOW_THROUGH");
 });
 it("retire les poignets de REC_GRIP_CONSTANCY et des fallbacks inadaptés",()=>{
  expect(coachingRecommendationCatalog.find(item=>item.code==="REC_GRIP_CONSTANCY")?.hypothesisCodes)
   .not.toEqual(expect.arrayContaining(["WRIST_INSTABILITY","POOR_RECOIL_RETURN"]));
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_FOLLOW_THROUGH")?.linkedHypothesisCodes)
   .not.toEqual(expect.arrayContaining(["WRIST_INSTABILITY","POOR_RECOIL_RETURN"]));
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_CONSTANT_GRIP")?.linkedHypothesisCodes)
   .not.toEqual(expect.arrayContaining(["WRIST_INSTABILITY","POOR_RECOIL_RETURN"]));
 });
 it("conserve VERTICAL_SPREAD comme générateur de plausibilité seulement",()=>expect(observationHypothesisMappings)
  .toContainEqual(expect.objectContaining({observation:"VERTICAL_SPREAD",hypothesis:"WRIST_INSTABILITY"})));
 it.each([[wristOrganizationTechnicalControl,"wrist_stable","objective_improved"],[returnToLineTechnicalControl,"return_improved","mixed_result"]] as const)
 ("clôture le contrôle technique sans série, décision ni maîtrise",(control,observation,outcome)=>{
  const completed=completeTechnicalObservationControl({cycle:prepareTechnicalObservationControl(cycle(),control),definition:control,
   observationCode:observation,evaluationId:"e",evidenceId:"v",evaluatedAt:"2026-08-28T00:00:00.000Z"});
  expect(completed).toMatchObject({status:"completed",outcome,controlSeriesId:null,pedagogicalDecision:null,masteryEvent:null,
   competenceEvaluation:{competenceSnapshot:{id:"competence:B6"},structuredResult:{exerciseDefinitionId:control.exerciseDefinitionId}}});
  expect(competenceEvaluationSchema.safeParse(completed.competenceEvaluation).success).toBe(true);
 });
 it("produit une preuve technique sans métrique géométrique",()=>{
  const evaluation=buildTechnicalCompetenceEvaluation({definition:returnToLineTechnicalControl,observationCode:"return_regular",evaluationId:"e",evidenceId:"v",
   evaluatedAt:"2026-08-28T00:00:00.000Z",cycleId:"c"});
  expect(JSON.stringify(evaluation)).not.toMatch(/meanRadius|extremeSpread|compareSeries/);
 });
 it("préserve D2.2 et la lecture des anciens cycles",()=>{
  expect(d2TriggerHandTechnicalControl).toMatchObject({competenceId:"competence-d2",definitionCode:"CONTROL-D2-INDEPENDENCE-01"});
  expect(controlModeForCycle(cycle())).toBe("series_comparison");
 });
 it("n’active l’intervention que pour un résultat soutenant",()=>{
  expect(wristInterventionForOutcome("WRIST_INSTABILITY","supports_hypothesis")?.control).toBe(wristOrganizationTechnicalControl);
  expect(wristInterventionForOutcome("POOR_RECOIL_RETURN","supports_hypothesis")?.control).toBe(returnToLineTechnicalControl);
  expect(wristInterventionForOutcome("WRIST_INSTABILITY","does_not_support_hypothesis")).toBeNull();
  expect(wristPedagogicalBindings).toHaveLength(2);
 });
 it("conserve les codes historiques",()=>{
  expect(confirmationTestCatalog.some(item=>item.code==="TEST_RETURN_TO_LINE")).toBe(true);
  expect(trainingDrillCatalog.some(item=>item.code==="DRILL_RETURN_TO_LINE")).toBe(true);
 });
});
