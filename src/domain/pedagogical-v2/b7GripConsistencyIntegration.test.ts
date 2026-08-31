import { describe,expect,it } from "vitest";
import { proposeCoaching } from "../coachingCycleEngine";
import type { SafetyContext } from "../coachingTypes";
import type { TechnicalHypothesis } from "../technicalHypothesis";
import { loadPedagogicalReferenceABV1 } from "./catalogs/pedagogical-reference-ab-v1";
import { gripConsistencyPedagogicalBindings } from "./twoHandContributionPedagogicalBinding";

const safety:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
 weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
 eyeAndEarProtection:true,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,
 canDryFire:true,canLiveFire:true};
const hypothesis=(code:TechnicalHypothesis["hypothesisCode"]):TechnicalHypothesis=>({id:"h",sessionId:"s",seriesId:"a",
 comparisonId:null,observationId:"o",hypothesisCode:code,category:"grip",status:"strengthened",
 plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],contradictingEvidence:[],
 missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],rulesetVersion:"v",generatedAt:"now"});

describe("rattachement des chaînes historiques B7 à la maîtrise de B3",()=>{
 const catalog=loadPedagogicalReferenceABV1();

 it("conserve la technique historique B7 rebinding vers B3",()=>expect(catalog.techniques.find(item=>item.code==="TECH-B7-01"))
  .toMatchObject({id:"technique:B7:01",compatibleCompetenceIds:["competence:B3"]}));

 it("conserve l’exercice historique B7 lié à B3",()=>expect(catalog.exercises.find(item=>item.code==="EX-B7-01"))
  .toMatchObject({id:"exercise:B7:01",primaryCompetenceId:"competence:B3",learningPhase:"stabilization",
   pedagogicalTechniqueIds:["technique:B7:01"],defaultVariables:{shotCount:5}}));

 it("rattache uniquement l’hypothèse canonique de variation",()=>expect(gripConsistencyPedagogicalBindings
  .map(item=>item.hypothesisCode)).toEqual(["INCONSISTENT_GRIP_PRESSURE"]));

 it("transporte B3 et l’intention de maîtrise pour l’hypothèse canonique",()=>{
  const code="INCONSISTENT_GRIP_PRESSURE" as const;
  expect(proposeCoaching({hypothesis:hypothesis(code),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",
   level:"intermediate",numberOfHands:2,safety})?.pedagogicalBinding).toMatchObject({
    confirmationTestCode:"TEST_GRIP_CONSTANCY",competenceId:"competence:B3",
    pedagogicalTechniqueId:"technique:B7:01",recommendationCode:"REC_GRIP_CONSTANCY",
    trainingDrillCode:"DRILL_CONSTANT_GRIP",exerciseDefinitionId:"exercise:B7:01",controlObjective:"consistency",
    masteryIntents:["stabilization","robustness"],
   });
 });

 it("laisse B8 sans technique ni exercice",()=>{
  expect(catalog.techniques.some(item=>item.compatibleCompetenceIds.includes("competence:B8"))).toBe(false);
  expect(catalog.exercises.some(item=>item.primaryCompetenceId==="competence:B8")).toBe(false);
 });
});
