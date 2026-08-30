import {describe,expect,it} from "vitest";
import {confirmationTestCatalog} from "./confirmationTestCatalog";
import {outcomeForTestObservation} from "./confirmationTestObservation";
import {applyConfirmationOutcomeToHypothesis} from "./confirmationOutcomeTransition";
import {selectConfirmationTest} from "./confirmationTestEngine";
import {technicalHypothesisCatalog} from "./technicalHypothesisCatalog";
import {proposeCoaching} from "./coachingCycleEngine";
import {trainingDrillCatalog} from "./trainingDrillCatalog";
import type {TechnicalHypothesis} from "./technicalHypothesis";
import type {SafetyContext} from "./coachingTypes";
import {normalizeHistoricalB5Hypothesis} from "./b5ToD2Compatibility";
import {loadPedagogicalReferenceABV1} from "./pedagogical-v2/catalogs/pedagogical-reference-ab-v1";
import {loadPedagogicalReferenceDV1} from "./pedagogical-v2/catalogs/pedagogical-reference-d-v1";
import {domainBCompactTaxonomy} from "./pedagogical-v2/domainBCompactTaxonomy";
import {triggerHandIndependenceInterventionForOutcome} from "./pedagogical-v2/triggerHandIndependencePedagogicalChain";

const code="TRIGGER_FINGER_HAND_COACTIVATION" as const;
const safe:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
 weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,
 eyeAndEarProtection:true,dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,
 canDryFire:true,canLiveFire:true};
const hypothesis=(historicalCode:TechnicalHypothesis["hypothesisCode"]=code,numberOfHands:1|2=1):TechnicalHypothesis=>({
 id:"h",sessionId:"s",seriesId:"x",comparisonId:null,observationId:"o",hypothesisCode:historicalCode,
 category:historicalCode==="DOMINANT_HAND_OVERGRIP"?"grip":"trigger",status:"requires_confirmation",
 plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],contradictingEvidence:[],
 missingEvidence:[],applicableContext:{numberOfHands},sourceRules:[],rulesetVersion:"v",generatedAt:"now",
});

describe("reclassification de l’ancien B5 sous D2",()=>{
 it("retire B5 de la taxonomie fondamentale tout en conservant son objet historique",()=>{
  expect(domainBCompactTaxonomy.fundamentalCompetences.flatMap(item=>[item.technicalCompetenceId]))
   .not.toContain("competence:B5");
  expect(loadPedagogicalReferenceABV1().competences.find(item=>item.id==="competence:B5")).toBeDefined();
 });

 it("déclare une hypothèse fonctionnelle neutre et son seul test diagnostique",()=>{
  expect(technicalHypothesisCatalog[code]).toMatchObject({category:"trigger",
   titleFr:"Indépendance de l’index vis-à-vis des autres doigts à vérifier"});
  expect(confirmationTestCatalog.filter(test=>test.hypothesisCodes.includes(code)).map(test=>test.code))
   .toEqual(["TEST_TRIGGER_HAND_INDEPENDENCE"]);
 });

 it("retire les deux faux raccordements historiques",()=>{
  expect(confirmationTestCatalog.find(test=>test.code==="TEST_GRIP_CONSTANCY")?.hypothesisCodes)
   .not.toContain("DOMINANT_HAND_OVERGRIP");
  expect(confirmationTestCatalog.find(test=>test.code==="TEST_SIGHT_STABILITY_DRY")?.hypothesisCodes)
   .not.toContain("TRIGGER_HAND_TENSION");
 });

 it("déclare exactement les quatre observations factuelles et leurs statuts",()=>{
  const test=confirmationTestCatalog.find(item=>item.code==="TEST_TRIGGER_HAND_INDEPENDENCE")!;
  expect(test.observationCriteria).toEqual(["Autres doigts sensiblement stables pendant l’action de l’index",
   "Augmentation reproductible de leur action ou pression synchronisée avec l’index",
   "Relâchement reproductible synchronisé avec l’index","Comportement variable ou non observable de manière fiable"]);
  expect(test.observationCriteria.map(observation=>outcomeForTestObservation(test.code,code,observation))).toEqual([
   "does_not_support_hypothesis","supports_hypothesis","supports_hypothesis","inconclusive"]);
 });

 it("does_not_support affaiblit sans changer le rang ni le score",()=>{
  expect(applyConfirmationOutcomeToHypothesis(hypothesis(),"does_not_support_hypothesis"))
   .toMatchObject({status:"weakened",rank:1,internalScore:4});
 });

 it.each([1,2] as const)("sélectionne le test à %s main(s)",numberOfHands=>{
  expect(selectConfirmationTest({hypothesis:hypothesis(code,numberOfHands),alternatives:[],sessionMode:"coaching_free",
   safety:safe,userCanPerform:true,contextKnown:true,numberOfHands}).primary?.code)
   .toBe("TEST_TRIGGER_HAND_INDEPENDENCE");
 });

 it("rattache le test, la technique et l’exercice à D2 sans contrôle géométrique",()=>{
  const catalog=loadPedagogicalReferenceDV1(),intervention=triggerHandIndependenceInterventionForOutcome("supports_hypothesis");
  expect(catalog.diagnosticTests.find(item=>item.code==="TEST-D2-INDEPENDENCE-01"))
   .toMatchObject({observedCompetenceId:"competence-d2"});
  expect(catalog.techniques.find(item=>item.code==="TECH-D2-INDEPENDENCE-01"))
   .toMatchObject({compatibleCompetenceIds:["competence-d2"]});
  expect(catalog.exercises.find(item=>item.code==="EX-D2-INDEPENDENCE-01"))
   .toMatchObject({primaryCompetenceId:"competence-d2",defaultVariables:{shotCount:null}});
  expect(intervention).toMatchObject({competenceId:"competence-d2",control:{mode:"technical_observation",
   definitionCode:"CONTROL-D2-INDEPENDENCE-01"}});
  expect(proposeCoaching({hypothesis:hypothesis(),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",
   level:"beginner",numberOfHands:1,safety:safe})).toBeNull();
  expect(trainingDrillCatalog.filter(item=>item.linkedHypothesisCodes.includes(code))).toEqual([]);
 });

 it("ne propose aucune intervention après résultat négatif ou inconclusif",()=>{
  expect(triggerHandIndependenceInterventionForOutcome("does_not_support_hypothesis")).toBeNull();
  expect(triggerHandIndependenceInterventionForOutcome("inconclusive")).toBeNull();
 });

 it.each(["DOMINANT_HAND_OVERGRIP","TRIGGER_HAND_TENSION"] as const)(
  "normalise le code historique %s sans modifier rang ni score",historicalCode=>{
   expect(normalizeHistoricalB5Hypothesis(hypothesis(historicalCode))).toMatchObject({hypothesisCode:code,rank:1,internalScore:4});
  });

 it("retire B5 du seul prérequis fondamental actif B6",()=>{
  expect(loadPedagogicalReferenceABV1().competences.find(item=>item.id==="competence:B6")?.prerequisiteIds)
   .not.toContain("competence:B5");
 });
});
