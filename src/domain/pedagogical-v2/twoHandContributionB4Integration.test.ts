import { describe,expect,it } from "vitest";
import { coachingRecommendationCatalog } from "../coachingRecommendationCatalog";
import { confirmationTestCatalog } from "../confirmationTestCatalog";
import { trainingDrillCatalog } from "../trainingDrillCatalog";
import { proposeCoaching } from "../coachingCycleEngine";
import type { SafetyContext } from "../coachingTypes";
import type { TechnicalHypothesis } from "../technicalHypothesis";
import { loadPedagogicalReferenceABV1 } from "./catalogs/pedagogical-reference-ab-v1";
import { twoHandContributionPedagogicalBinding } from "./twoHandContributionPedagogicalBinding";

describe("rattachement structurel de TWO_HAND_CONTRIBUTION à B4",()=>{
 const catalog=loadPedagogicalReferenceABV1();
 const safety:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
  weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
  eyeAndEarProtection:true,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,
  canDryFire:true,canLiveFire:true};
 const hypothesis:TechnicalHypothesis={id:"h",sessionId:"s",seriesId:"a",comparisonId:null,observationId:"o",
  hypothesisCode:"TWO_HAND_CONTRIBUTION",category:"grip",status:"strengthened",plausibilityLevel:"medium",
  confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],
  applicableContext:{numberOfHands:2},sourceRules:[],rulesetVersion:"v",generatedAt:"now"};

 it("réutilise exactement la compétence B4 sans créer de compétence supplémentaire",()=>{
  expect(catalog.competences).toHaveLength(12);
  expect(catalog.competences.find(item=>item.id==="competence:B4")).toMatchObject({
   code:"B4",name:"Construire une répartition stable des pressions entre main forte et main support",
   prerequisiteIds:["competence:B3"],
  });
 });

 it("déclare une vraie PedagogicalTechnique propre à B4",()=>{
  expect(catalog.techniques).toHaveLength(3);
  expect(catalog.techniques.find(item=>item.code==="TECH-B4-01")).toMatchObject({id:"technique:B4:01",code:"TECH-B4-01",
   compatibleCompetenceIds:["competence:B4"],instructorRequired:false});
 });

 it("déclare un vrai ExerciseDefinition lié à B4 et à sa technique",()=>{
  expect(catalog.exercises).toHaveLength(4);
  expect(catalog.exercises.find(item=>item.code==="EX-B4-01")).toMatchObject({id:"exercise:B4:01",code:"EX-B4-01",
   primaryCompetenceId:"competence:B4",pedagogicalTechniqueIds:["technique:B4:01"],
   defaultVariables:{numberOfHands:2,shotCount:5}});
 });

 it("relie explicitement les objets actifs aux références v2",()=>expect(twoHandContributionPedagogicalBinding).toEqual({
  hypothesisCode:"TWO_HAND_CONTRIBUTION",confirmationTestCode:"TEST_TWO_HAND_CONTRIBUTION",
  competenceId:"competence:B4",pedagogicalTechniqueId:"technique:B4:01",
  recommendationCode:"REC_TWO_HAND_COORDINATION",trainingDrillCode:"DRILL_TWO_HAND_CONTRIBUTION",
  exerciseDefinitionId:"exercise:B4:01",controlObjective:"consistency",
 }));

 it("transporte le rattachement B4 dans la proposition active",()=>expect(proposeCoaching({hypothesis,testRunId:"t",
  outcome:"supports_hypothesis",sessionId:"s",level:"intermediate",numberOfHands:2,safety})?.pedagogicalBinding)
  .toEqual(twoHandContributionPedagogicalBinding));

 it("conserve la Recommendation comme projection éditoriale",()=>{
  const recommendation=coachingRecommendationCatalog.find(item=>item.code==="REC_TWO_HAND_COORDINATION")!;
  expect(recommendation).toBeDefined();
  expect(recommendation).not.toHaveProperty("principle");
  expect(recommendation).not.toHaveProperty("compatibleCompetenceIds");
 });

 it("conserve les contenus actifs du test et du drill",()=>{
  expect(confirmationTestCatalog.find(item=>item.code==="TEST_TWO_HAND_CONTRIBUTION")?.hypothesisCodes)
   .toEqual(["TWO_HAND_CONTRIBUTION"]);
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_TWO_HAND_CONTRIBUTION")).toMatchObject({
   linkedRecommendationCodes:["REC_TWO_HAND_COORDINATION"],objective:"consistency",
  });
 });

 it("ne prescrit aucun ratio universel dans la nouvelle chaîne v2",()=>{
  expect(JSON.stringify([catalog.techniques,catalog.exercises])).not.toMatch(/60\s*\/\s*40|70\s*\/\s*30/);
 });
});
