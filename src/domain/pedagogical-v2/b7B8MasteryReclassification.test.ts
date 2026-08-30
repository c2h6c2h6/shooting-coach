import { describe,expect,it } from "vitest";
import { proposeCoaching } from "../coachingCycleEngine";
import type { SafetyContext } from "../coachingTypes";
import { confirmationTestCatalog } from "../confirmationTestCatalog";
import { competenceApplicabilityForNumberOfHands } from "../numberOfHandsApplicability";
import type { TechnicalHypothesis } from "../technicalHypothesis";
import { trainingDrillCatalog } from "../trainingDrillCatalog";
import { loadPedagogicalReferenceABV1 } from "./catalogs/pedagogical-reference-ab-v1";
import { domainBCompactTaxonomy,normalizeHistoricalDomainBCompetence } from "./domainBCompactTaxonomy";
import {
 gripConsistencyPedagogicalBindings,historicalGripConsistencyPedagogicalBindings,
} from "./twoHandContributionPedagogicalBinding";

const safety:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
 weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
 eyeAndEarProtection:true,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,
 canDryFire:true,canLiveFire:true};
const hypothesis=(code:TechnicalHypothesis["hypothesisCode"],rank=2,internalScore=6):TechnicalHypothesis=>({id:"h",
 sessionId:"s",seriesId:"a",comparisonId:null,observationId:"o",hypothesisCode:code,category:"grip",
 status:"strengthened",plausibilityLevel:"medium",confidenceLevel:"low",rank,internalScore,supportingEvidence:[],
 contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],rulesetVersion:"v",
 generatedAt:"now"});

describe("reclassification historique B7/B8 vers la maîtrise de competence:B3",()=>{
 const catalog=loadPedagogicalReferenceABV1();

 it("expose uniquement trois compétences fondamentales dans la taxonomie métier compacte",()=>{
  expect(domainBCompactTaxonomy.fundamentalCompetences).toEqual([
   {businessCode:"B1",technicalCompetenceId:"competence:B3",label:"Construire une prise fonctionnelle"},
   {businessCode:"B2",technicalCompetenceId:"competence:B4",label:"Coordonner la contribution des deux mains"},
   {businessCode:"B3",technicalCompetenceId:"competence:B6",label:"Organiser et stabiliser les poignets"},
  ]);
  expect(domainBCompactTaxonomy.fundamentalCompetences.flatMap(item=>[item.technicalCompetenceId]))
   .not.toEqual(expect.arrayContaining(["competence:B7","competence:B8"]));
 });

 it("rebinde TECH-B7-01 et EX-B7-01 vers competence:B3 sans changer leurs ids",()=>{
  expect(catalog.techniques.find(item=>item.id==="technique:B7:01")).toMatchObject({
   code:"TECH-B7-01",compatibleCompetenceIds:["competence:B3"]});
  expect(catalog.exercises.find(item=>item.id==="exercise:B7:01")).toMatchObject({
   code:"EX-B7-01",primaryCompetenceId:"competence:B3",learningPhase:"stabilization",
   prerequisiteCompetenceIds:["competence:B3"]});
 });

 it("conserve la chaîne active B7 avec une intention de stabilization/robustness",()=>{
  expect(gripConsistencyPedagogicalBindings).toHaveLength(2);
  expect(gripConsistencyPedagogicalBindings.every(item=>item.competenceId==="competence:B3" &&
   item.masteryIntents?.join(",")==="stabilization,robustness")).toBe(true);
  expect(gripConsistencyPedagogicalBindings.map(item=>item.hypothesisCode)).toEqual([
   "INCONSISTENT_GRIP_PRESSURE","GRIP_CHANGES_BETWEEN_SHOTS"]);
 });

 it("laisse test, drill et recommendation actifs sans hypothèse d’asymétrie",()=>{
  expect(confirmationTestCatalog.find(item=>item.code==="TEST_GRIP_CONSTANCY")).toBeDefined();
  expect(trainingDrillCatalog.find(item=>item.code==="DRILL_CONSTANT_GRIP")).toBeDefined();
  expect(gripConsistencyPedagogicalBindings.map(item=>item.hypothesisCode)).not.toEqual(expect.arrayContaining([
   "UNBALANCED_HAND_PRESSURE","TWO_HAND_CONTRIBUTION"]));
 });

 it.each(["INCONSISTENT_GRIP_PRESSURE","GRIP_CHANGES_BETWEEN_SHOTS"] as const)("propose la chaîne rebinding pour %s",code=>{
  const h=hypothesis(code),before={rank:h.rank,score:h.internalScore};
  const proposal=proposeCoaching({hypothesis:h,testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",
   level:"intermediate",numberOfHands:2,safety});
  expect(proposal?.drill.code).toBe("DRILL_CONSTANT_GRIP");
  expect(proposal?.pedagogicalBinding).toMatchObject({competenceId:"competence:B3",
   masteryIntents:["stabilization","robustness"]});
  expect({rank:h.rank,score:h.internalScore}).toEqual(before);
 });

 it("conserve les anciens bindings B7 lisibles et normalisables",()=>{
  expect(historicalGripConsistencyPedagogicalBindings.every(item=>item.competenceId==="competence:B7")).toBe(true);
  expect(historicalGripConsistencyPedagogicalBindings.map(item=>normalizeHistoricalDomainBCompetence(item.competenceId)))
   .toEqual([{canonicalCompetenceId:"competence:B3",masteryIntents:["stabilization","robustness"],deprecated:true},
    {canonicalCompetenceId:"competence:B3",masteryIntents:["stabilization","robustness"],deprecated:true}]);
 });

 it("conserve B8 lisible mais non fondamental et non actionnable",()=>{
  expect(catalog.competences.find(item=>item.id==="competence:B8")).toBeDefined();
  expect(normalizeHistoricalDomainBCompetence("competence:B8")).toEqual({canonicalCompetenceId:"competence:B3",
   masteryIntents:["transfer","robustness"],deprecated:true});
  expect(catalog.techniques.some(item=>item.compatibleCompetenceIds.includes("competence:B8"))).toBe(false);
  expect(catalog.exercises.some(item=>item.primaryCompetenceId==="competence:B8")).toBe(false);
  expect(trainingDrillCatalog.some(item=>item.code.includes("B8"))).toBe(false);
 });

 it("préserve l’applicabilité générale existante sans rendre B3 artificiellement universelle",()=>{
  expect(competenceApplicabilityForNumberOfHands("B3",1)).toBe("inapplicable");
  expect(competenceApplicabilityForNumberOfHands("B7",1)).toBe("applicable");
  expect(competenceApplicabilityForNumberOfHands("B8",1)).toBe("applicable");
 });

 it("laisse la chaîne B4 intacte",()=>expect(catalog.exercises.find(item=>item.code==="EX-B4-01"))
  .toMatchObject({primaryCompetenceId:"competence:B4",pedagogicalTechniqueIds:["technique:B4:01"]}));
});
