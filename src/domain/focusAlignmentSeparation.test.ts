import {describe,expect,it} from "vitest";
import {confirmationTestCatalog} from "./confirmationTestCatalog";
import {outcomeForTestObservation} from "./confirmationTestObservation";
import {selectConfirmationTest} from "./confirmationTestEngine";
import {proposeCoaching} from "./coachingCycleEngine";
import {coachingRecommendationCatalog} from "./coachingRecommendationCatalog";
import {trainingDrillCatalog} from "./trainingDrillCatalog";
import {diagnosticQuestionCatalog} from "./diagnosticQuestionCatalog";
import {observationHypothesisMappings} from "./observationHypothesisMappings";
import {loadPedagogicalReferenceCV1} from "./pedagogical-v2/catalogs/pedagogical-reference-c-v1";
import {sightAlignmentPedagogicalBinding,sightAlignmentTechnicalControl,sightAlignmentInterventionForOutcome} from "./pedagogical-v2/sightAlignmentPedagogicalChain";
import {buildTechnicalCompetenceEvaluation,completeTechnicalObservationControl,prepareTechnicalObservationControl,controlModeForCycle,d2TriggerHandTechnicalControl} from "./technicalObservationControl";
import {wristOrganizationTechnicalControl} from "./pedagogical-v2/wristStabilityPedagogicalChain";
import {competenceEvaluationSchema} from "./pedagogical-v2/inputSchemas";
import type {CoachingCycle,SafetyContext} from "./coachingTypes";
import type {TechnicalHypothesis} from "./technicalHypothesis";

const safety:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,weaponUnloadedVerified:true,
 magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,
 dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};
const hypothesis=(code:TechnicalHypothesis["hypothesisCode"]):TechnicalHypothesis=>({id:code,sessionId:"s",seriesId:"series",comparisonId:null,
 observationId:"o",hypothesisCode:code,category:"vision",status:"requires_confirmation",plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:5,
 supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],rulesetVersion:"v",generatedAt:"2026-08-28T00:00:00.000Z"});
const cycle=():CoachingCycle=>({id:"c",sessionId:"s",sourceSeriesId:"series",hypothesisId:"h",confirmationTestRunId:"t",recommendationId:null,
 drillCode:null,controlSeriesId:null,status:"drill_pending",outcome:null,objective:null,startedAt:"2026-08-28T00:00:00.000Z",completedAt:null,
 invalidatedAt:null,invalidationReason:null,rulesetVersion:"v"});

describe("séparation focus visuel / alignement",()=>{
 it("retire uniquement l’alignement de TEST_VISUAL_FOCUS",()=>{
  const focus=confirmationTestCatalog.find(test=>test.code==="TEST_VISUAL_FOCUS")!;
  expect(focus.hypothesisCodes).toEqual(["FOCUS_ON_TARGET_INSTEAD_OF_SIGHTS","INCONSISTENT_VISUAL_FOCUS","LOSS_OF_VISUAL_FOCUS_AT_SHOT"]);
  expect(focus.hypothesisCodes).not.toContain("SIGHT_ALIGNMENT_VARIATION");
 });
 it.each(["FOCUS_ON_TARGET_INSTEAD_OF_SIGHTS","INCONSISTENT_VISUAL_FOCUS","LOSS_OF_VISUAL_FOCUS_AT_SHOT"] as const)
 ("conserve TEST_VISUAL_FOCUS pour %s",code=>expect(selectConfirmationTest({hypothesis:hypothesis(code),alternatives:[],sessionMode:"coaching_free",safety,
  userCanPerform:true,contextKnown:true,numberOfHands:2}).primary?.code).toBe("TEST_VISUAL_FOCUS"));
 it("sélectionne le nouveau test d’alignement à sec",()=>expect(selectConfirmationTest({hypothesis:hypothesis("SIGHT_ALIGNMENT_VARIATION"),alternatives:[],
  sessionMode:"coaching_free",safety,userCanPerform:true,contextKnown:true,numberOfHands:2}).primary)
  .toMatchObject({code:"TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY",requiresDryFire:true,requiresLiveFire:false}));
 it.each([
  ["Alignement reproduit de manière comparable","does_not_support_hypothesis"],
  ["Variation latérale reproductible de l’alignement","supports_hypothesis"],
  ["Variation verticale reproductible de l’alignement","supports_hypothesis"],
  ["Variation irrégulière ou non interprétable","inconclusive"],
  ["Alignement non observable de manière fiable","not_observed"],
 ] as const)("mappe l’observation d’alignement %s",(observation,outcome)=>expect(outcomeForTestObservation("TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY",
  "SIGHT_ALIGNMENT_VARIATION",observation)).toBe(outcome));
 it("réutilise exactement competence:C1",()=>{
  const catalog=loadPedagogicalReferenceCV1(),c1=catalog.competences.find(item=>item.id==="competence:C1")!;
  expect(c1.definition).toContain("relation géométrique correcte et reproductible");
  expect(c1.interpretationLimits).toContain("C1 ne traite pas encore du focus visuel");
  expect(catalog.competences).toHaveLength(8);
 });
 it("raccorde une vraie technique, un exercice et un DiagnosticTest v2",()=>{
  const catalog=loadPedagogicalReferenceCV1();
  expect(catalog.techniques.find(item=>item.id==="technique:C1:01")?.compatibleCompetenceIds).toEqual(["competence:C1"]);
  expect(catalog.exercises.find(item=>item.id==="exercise:C1:01")).toMatchObject({primaryCompetenceId:"competence:C1",pedagogicalTechniqueIds:["technique:C1:01"]});
  expect(catalog.diagnosticTests.find(item=>item.id==="diagnostic-test:C1:alignment-reproducibility:01")?.observedCompetenceId).toBe("competence:C1");
 });
 it("sélectionne explicitement recommendation et drill d’alignement",()=>expect(proposeCoaching({hypothesis:hypothesis("SIGHT_ALIGNMENT_VARIATION"),
  testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"intermediate",numberOfHands:2,safety})).toMatchObject({
   recommendation:{recommendationCode:"REC_SIGHT_ALIGNMENT_REPRODUCIBILITY"},drill:{code:"DRILL_SIGHT_ALIGNMENT_RECONSTRUCTION",numberOfShots:0},
   pedagogicalBinding:sightAlignmentPedagogicalBinding}));
 it("retire l’alignement des chaînes focus et série lente",()=>{
  expect(coachingRecommendationCatalog.find(item=>item.code==="REC_VISUAL_CONSTANCY")?.hypothesisCodes).not.toContain("SIGHT_ALIGNMENT_VARIATION");
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_SLOW_VALIDATION")?.linkedHypothesisCodes).not.toContain("SIGHT_ALIGNMENT_VARIATION");
  expect(diagnosticQuestionCatalog.find(item=>item.code==="FRONT_SIGHT_CLEAR")?.hypotheses).not.toContain("SIGHT_ALIGNMENT_VARIATION");
 });
 it("produit un contrôle technique et une CompetenceEvaluation C1 sans décision ni maîtrise",()=>{
  const completed=completeTechnicalObservationControl({cycle:prepareTechnicalObservationControl(cycle(),sightAlignmentTechnicalControl),
   definition:sightAlignmentTechnicalControl,observationCode:"alignment_improved",evaluationId:"e",evidenceId:"v",evaluatedAt:"2026-08-28T00:00:00.000Z"});
  expect(completed).toMatchObject({status:"completed",outcome:"mixed_result",controlSeriesId:null,pedagogicalDecision:null,masteryEvent:null,
   competenceEvaluation:{competenceSnapshot:{id:"competence:C1"},structuredResult:{exerciseDefinitionId:"exercise:C1:01"}}});
  expect(competenceEvaluationSchema.safeParse(completed.competenceEvaluation).success).toBe(true);
  expect(JSON.stringify(completed)).not.toMatch(/meanRadius|extremeSpread|compareSeries/);
 });
 it("différencie focus constant et alignement variable",()=>{
  expect(outcomeForTestObservation("TEST_VISUAL_FOCUS","INCONSISTENT_VISUAL_FOCUS","Repère visuel constant")).toBe("does_not_support_hypothesis");
  expect(outcomeForTestObservation("TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY","SIGHT_ALIGNMENT_VARIATION","Variation latérale reproductible de l’alignement")).toBe("supports_hypothesis");
 });
 it("différencie focus changeant et alignement reproductible",()=>{
  expect(outcomeForTestObservation("TEST_VISUAL_FOCUS","INCONSISTENT_VISUAL_FOCUS","Focalisation changeante")).toBe("supports_hypothesis");
  expect(outcomeForTestObservation("TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY","SIGHT_ALIGNMENT_VARIATION","Alignement reproduit de manière comparable")).toBe("does_not_support_hypothesis");
 });
 it("permet la coexistence des deux défauts",()=>{
  expect(outcomeForTestObservation("TEST_VISUAL_FOCUS","INCONSISTENT_VISUAL_FOCUS","Focalisation changeante")).toBe("supports_hypothesis");
  expect(outcomeForTestObservation("TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY","SIGHT_ALIGNMENT_VARIATION","Variation verticale reproductible de l’alignement")).toBe("supports_hypothesis");
 });
 it("n’en renforce aucun lorsque focus et alignement sont stables",()=>{
  expect(outcomeForTestObservation("TEST_VISUAL_FOCUS","INCONSISTENT_VISUAL_FOCUS","Repère visuel constant")).toBe("does_not_support_hypothesis");
  expect(outcomeForTestObservation("TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY","SIGHT_ALIGNMENT_VARIATION","Alignement reproduit de manière comparable")).toBe("does_not_support_hypothesis");
 });
 it("conserve les mappings cible comme simple source de plausibilité nécessitant le test",()=>{
  expect(observationHypothesisMappings.some(item=>item.hypothesis==="SIGHT_ALIGNMENT_VARIATION")).toBe(true);
  expect(confirmationTestCatalog.find(item=>item.code==="TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY")?.hypothesisCodes).toEqual(["SIGHT_ALIGNMENT_VARIATION"]);
 });
 it("préserve D2, B6 et les anciens cycles",()=>{
  expect(d2TriggerHandTechnicalControl.definitionCode).toBe("CONTROL-D2-INDEPENDENCE-01");
  expect(wristOrganizationTechnicalControl.definitionCode).toBe("CONTROL-B6-WRIST-ORGANIZATION-01");
  expect(controlModeForCycle(cycle())).toBe("series_comparison");
  expect(sightAlignmentInterventionForOutcome("does_not_support_hypothesis")).toBeNull();
 });
 it("conserve les objets historiques lisibles",()=>{
  expect(confirmationTestCatalog.some(item=>item.code==="TEST_VISUAL_FOCUS")).toBe(true);
  expect(coachingRecommendationCatalog.some(item=>item.code==="REC_VISUAL_CONSTANCY")).toBe(true);
  expect(trainingDrillCatalog.some(item=>item.code==="DRILL_SLOW_VALIDATION")).toBe(true);
 });
});
