import { describe,expect,it } from "vitest";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { proposeCoaching } from "./coachingCycleEngine";
import { safetyBlockers } from "./coachingSafetyRules";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { firstStructurallyTestableHypothesis,selectConfirmationTest } from "./confirmationTestEngine";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import { applyConfirmationOutcomeToHypothesis } from "./confirmationOutcomeTransition";
import type { SafetyContext } from "./coachingTypes";
import { hypothesisApplicabilityForNumberOfHands } from "./numberOfHandsApplicability";
import type { TechnicalHypothesis } from "./technicalHypothesis";
import { normalizeTwoHandContributionHypothesis } from "./twoHandContributionCompatibility";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

const safe:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
 weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,
 liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,dummyRoundsAllowed:false,
 dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};
const hypothesis=(patch:Partial<TechnicalHypothesis>={}):TechnicalHypothesis=>({id:"h",sessionId:"s",seriesId:"a",
 comparisonId:null,observationId:"o",hypothesisCode:"TWO_HAND_CONTRIBUTION",category:"grip",
 status:"requires_confirmation",plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:4,
 supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},
 sourceRules:["existing-rule"],rulesetVersion:"v",generatedAt:"now",...patch});

describe("chaîne fonctionnelle de contribution des deux mains",()=>{
 const test=confirmationTestCatalog.find(item=>item.code==="TEST_TWO_HAND_CONTRIBUTION")!;
 const drill=trainingDrillCatalog.find(item=>item.code==="DRILL_TWO_HAND_CONTRIBUTION")!;

 it("est applicable uniquement à deux mains",()=>{
  expect(hypothesisApplicabilityForNumberOfHands("TWO_HAND_CONTRIBUTION",2)).toBe("applicable");
  expect(hypothesisApplicabilityForNumberOfHands("TWO_HAND_CONTRIBUTION",1)).toBe("inapplicable");
 });
 it("sélectionne le nouveau test comparatif à deux mains",()=>expect(selectConfirmationTest({hypothesis:hypothesis(),
  alternatives:[],sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:true,numberOfHands:2})
  .primary?.code).toBe("TEST_TWO_HAND_CONTRIBUTION"));
 it("bloque ce test à une main",()=>expect(selectConfirmationTest({hypothesis:hypothesis({applicableContext:{numberOfHands:1}}),
  alternatives:[],sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:true,numberOfHands:1})
  .primary).toBeNull());
 it.each([
  ["Amélioration reproductible","supports_hypothesis"],
  ["Dégradation reproductible","supports_hypothesis"],
  ["Aucune différence observable","does_not_support_hypothesis"],
  ["Résultat variable ou non interprétable","inconclusive"],
 ] as const)("mappe %s vers %s",(observation,outcome)=>expect(outcomeForTestObservation(test.code,
  "TWO_HAND_CONTRIBUTION",observation)).toBe(outcome));
 it("affaiblit une absence de différence sans exercice",()=>{
  expect(applyConfirmationOutcomeToHypothesis(hypothesis(),"does_not_support_hypothesis").status).toBe("weakened");
  expect(proposeCoaching({hypothesis:hypothesis(),testRunId:"t",outcome:"does_not_support_hypothesis",
   sessionId:"s",level:"beginner",numberOfHands:2,safety:safe})).toBeNull();
 });
 it("propose la technique et l’exercice dédiés après soutien",()=>{
  const proposal=proposeCoaching({hypothesis:hypothesis(),testRunId:"t",outcome:"supports_hypothesis",
   sessionId:"s",level:"intermediate",numberOfHands:2,safety:safe});
  expect(proposal?.recommendation).toMatchObject({recommendationCode:"REC_TWO_HAND_COORDINATION",
   title:"Coordonner la contribution des deux mains",objective:"consistency"});
  expect(proposal?.drill).toMatchObject({code:"DRILL_TWO_HAND_CONTRIBUTION",
   title:"Reproduire la contribution efficace des deux mains",objective:"consistency"});
 });
 it("n’utilise aucun fallback de constance ou de follow-through",()=>{
  const proposal=proposeCoaching({hypothesis:hypothesis(),testRunId:"t",outcome:"supports_hypothesis",
   sessionId:"s",level:"beginner",numberOfHands:2,safety:safe});
  expect(proposal?.drill.code).not.toMatch(/DRILL_(FOLLOW_THROUGH|CONSTANT_GRIP)/);
 });
 it("ne contient aucun ratio universel dans les nouveaux objets pédagogiques",()=>{
  const recommendation=coachingRecommendationCatalog.find(item=>item.code==="REC_TWO_HAND_COORDINATION")!;
  expect(JSON.stringify([test,recommendation,drill])).not.toMatch(/60\s*\/\s*40|70\s*\/\s*30|pourcentage cible/i);
 });
 it("conserve rang, score et règles lors de la normalisation de l’ancien code",()=>{
  const legacy=hypothesis({hypothesisCode:"UNBALANCED_HAND_PRESSURE",rank:3,internalScore:7,
   sourceRules:["legacy-rule"]});
  expect(normalizeTwoHandContributionHypothesis(legacy)).toMatchObject({hypothesisCode:"TWO_HAND_CONTRIBUTION",
   rank:3,internalScore:7,sourceRules:["legacy-rule"]});
 });
 it("saute H1/H2 non testables sans reconstruire le classement",()=>{
  const ranked=[hypothesis({hypothesisCode:"ATTENTION_LOSS",category:"context_equipment",rank:1}),
   hypothesis({hypothesisCode:"BREATHING_DISRUPTION",category:"context_equipment",rank:2}),
   hypothesis({rank:3,internalScore:6})];
  const selected=firstStructurallyTestableHypothesis({hypotheses:ranked,sessionMode:"coaching_free"});
  expect(selected).toBe(ranked[2]);
  expect(ranked.map(item=>[item.rank,item.internalScore])).toEqual([[1,4],[2,4],[3,6]]);
 });
 it("ne crée aucun fallback lorsqu’aucune piste n’est testable",()=>expect(firstStructurallyTestableHypothesis({
  hypotheses:[hypothesis({hypothesisCode:"ATTENTION_LOSS",category:"context_equipment"})],
  sessionMode:"coaching_free"})).toBeNull());
 it("réutilise les blockers de sécurité existants pour l’exercice",()=>{
  expect(safetyBlockers(drill,{...safe,canLiveFire:false})).toContain("Prérequis complets du tir réel non confirmés.");
  expect(safetyBlockers(drill,safe)).toEqual([]);
 });
 it("laisse TEST_GRIP_CONSTANCY intact et réservé aux chaînes de constance",()=>{
  const grip=confirmationTestCatalog.find(item=>item.code==="TEST_GRIP_CONSTANCY")!;
  expect(grip.observationCriteria).toEqual(["Prise ressentie constante","Crispation croissante","Pression variable","Changement de placement"]);
  expect(grip.hypothesisCodes).not.toContain("TWO_HAND_CONTRIBUTION");
  expect(grip.hypothesisCodes).toContain("INCONSISTENT_GRIP_PRESSURE");
 });
});
