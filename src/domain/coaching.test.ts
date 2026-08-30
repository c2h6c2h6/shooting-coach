import { describe,expect,it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { selectConfirmationTest,hypothesisEffect } from "./confirmationTestEngine";
import { proposeCoaching,MAX_LIVE_SHOTS_PER_DRILL } from "./coachingCycleEngine";
import { evaluateCoachingOutcome } from "./coachingOutcomeEvaluator";
import { safetyBlockers } from "./coachingSafetyRules";
import { trainingDrillCatalog } from "./trainingDrillCatalog";
import { TechnicalHypothesis } from "./technicalHypothesis";
import { SafetyContext } from "./coachingTypes";
import { SeriesComparison } from "./seriesComparison";
const h=(patch:Partial<TechnicalHypothesis>={}):TechnicalHypothesis=>({id:"h",sessionId:"s",seriesId:"a",comparisonId:null,observationId:"o",
 hypothesisCode:"LATERAL_TRIGGER_PRESSURE",category:"trigger",status:"requires_confirmation",plausibilityLevel:"medium",
 confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],
 applicableContext:{},sourceRules:[],rulesetVersion:"v",generatedAt:"now",...patch});
const safe:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,weaponUnloadedVerified:true,
 magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,
 dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};
describe("étape 10",()=>{
 it("refuse une hypothèse trop faible",()=>expect(selectConfirmationTest({hypothesis:h({internalScore:1}),alternatives:[],sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:true}).primary).toBeNull());
 it("choisit un test disponible",()=>expect(selectConfirmationTest({hypothesis:h(),alternatives:[],sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:true}).primary?.code).toBe("TEST_SIGHT_STABILITY_DRY"));
 it("refuse un contexte inconnu",()=>expect(selectConfirmationTest({hypothesis:h(),alternatives:[],sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:false}).blockers).toContain("Contexte inconnu."));
 it("offre une alternative sans tir pour l’anticipation",()=>expect(selectConfirmationTest({hypothesis:h({hypothesisCode:"SHOT_ANTICIPATION",category:"anticipation"}),alternatives:[],sessionMode:"training",safety:safe,userCanPerform:true,contextKnown:true}).primary?.requiresDryFire).toBe(true));
 it("bloque le test instructeur absent",()=>{const t=confirmationTestCatalog.find(x=>x.requiresInstructor)!;expect(safetyBlockers(t,safe)).toContain("Instructeur requis mais absent.");});
 it("bloque la munition inerte non autorisée",()=>{const t=confirmationTestCatalog.find(x=>x.requiresDummyRounds)!;expect(safetyBlockers(t,safe)).toContain("Munition inerte non autorisée ou procédure non maîtrisée.");});
 it("bloque un contexte sec non sécurisé",()=>{const t=confirmationTestCatalog[0];expect(safetyBlockers(t,{...safe,chamberVisualPhysicalCheck:false})).toContain("Prérequis complets du travail à sec non confirmés.");});
 it.each([["supports_hypothesis",3,"strengthened"],["does_not_support_hypothesis",-2,"weakened"],["contradicts_hypothesis",-4,"contradicted"],["inconclusive",0,"requires_confirmation"]] as const)
  ("gère le résultat %s",(o,d,s)=>expect(hypothesisEffect(o)).toEqual({scoreDelta:d,status:s}));
 it("propose après soutien",()=>expect(proposeCoaching({hypothesis:h(),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"beginner",safety:safe})?.recommendation.priority).toBe(1));
 it("ne propose rien après résultat insuffisant",()=>expect(proposeCoaching({hypothesis:h(),testRunId:"t",outcome:"inconclusive",sessionId:"s",level:"beginner",safety:safe})).toBeNull());
 it("ne produit qu’une recommandation prioritaire",()=>expect(proposeCoaching({hypothesis:h(),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"advanced",safety:safe})?.recommendation.priority).toBe(1));
 it("contient douze exercices distincts",()=>expect(new Set(trainingDrillCatalog.map(x=>x.code)).size).toBe(12));
 it("adapte un débutant avec une consigne",()=>expect(proposeCoaching({hypothesis:h(),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"beginner",safety:safe})?.drill.executionSteps.length).toBe(1));
 it("conserve une autonomie avancée",()=>expect(proposeCoaching({hypothesis:h({hypothesisCode:"SHOT_ANTICIPATION",category:"anticipation"}),testRunId:"t",outcome:"supports_hypothesis",sessionId:"s",level:"advanced",safety:safe})?.drill.difficultyLevel).toContain("advanced"));
 it("limite le nombre de coups",()=>expect(Math.max(...trainingDrillCatalog.map(x=>x.numberOfShots))).toBeLessThanOrEqual(MAX_LIVE_SHOTS_PER_DRILL));
 it("définit réussite et arrêt",()=>trainingDrillCatalog.forEach(d=>{expect(d.successCriteria.length).toBeGreaterThan(0);expect(d.stopConditions.length).toBeGreaterThan(0);}));
 it("sépare strictement test, conseil et exercice",()=>{expect(confirmationTestCatalog[0]).not.toHaveProperty("successCriteria");expect(trainingDrillCatalog[0]).not.toHaveProperty("possibleOutcomes");});
 it("ne contient aucun conseil opérationnel ou modification",()=>{const text=JSON.stringify([confirmationTestCatalog,trainingDrillCatalog]).toLowerCase();expect(text).not.toContain("neutralisation");expect(text).not.toContain("dégain");expect(text).not.toContain("dissimulation");});
 it("ne contient aucune certitude catégorique",()=>expect(JSON.stringify([confirmationTestCatalog,trainingDrillCatalog])).not.toMatch(/cause définitivement confirmée|garantit/i));
});
const comparison=(delta:number,extra:Partial<SeriesComparison["differences"]>={}):SeriesComparison=>({id:"c",sessionId:"s",baselineSeriesId:"a",comparedSeriesId:"b",comparisonType:"manual",status:"comparable",reliability:"acceptable",algorithmVersion:"v",thresholdsVersion:"v",baselineMetricsVersion:"v",comparedMetricsVersion:"v",unit:"normalized",reasons:[],limitations:[],differences:{meanRadius:{baselineValue:.2,comparedValue:.2+delta,delta,relativePercent:delta/.2*100,variation:Math.abs(delta)>.03?"notable":"stable",percentageLimitation:null},...extra},counts:{} as never,shape:{baselineValue:"compact",comparedValue:"compact",changed:false},computedAt:"now"});
describe("évaluation ciblée",()=>{
 it("détecte amélioration",()=>expect(evaluateCoachingOutcome(comparison(-.05),"dispersion")).toBe("objective_improved"));
 it("détecte stabilité",()=>expect(evaluateCoachingOutcome(comparison(.001),"dispersion")).toBe("objective_stable"));
 it("détecte dégradation",()=>expect(evaluateCoachingOutcome(comparison(.05),"dispersion")).toBe("objective_worsened"));
 it("détecte résultat mixte",()=>expect(evaluateCoachingOutcome(comparison(-.05,{extremeSpread:{baselineValue:.2,comparedValue:.3,delta:.1,relativePercent:50,variation:"notable",percentageLimitation:null}}),"dispersion")).toBe("mixed_result"));
 it("détecte données insuffisantes",()=>expect(evaluateCoachingOutcome({...comparison(0),status:"not_comparable"},"centering")).toBe("insufficient_data"));
 it("ignore une mesure sans rapport",()=>expect(evaluateCoachingOutcome(comparison(-.05),"centering")).toBe("insufficient_data"));
});
