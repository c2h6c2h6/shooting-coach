import { describe, expect, it } from "vitest";
import { activeHypothesisCodes } from "./technicalHypothesisCatalog";
import { normalizeHistoricalE1Hypothesis } from "./e1AnticipationCompatibility";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import { selectConfirmationTest } from "./confirmationTestEngine";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { trainingDrillCatalog } from "./trainingDrillCatalog";
import { proposeCoaching } from "./coachingCycleEngine";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { completeTechnicalObservationControl, prepareTechnicalObservationControl } from "./technicalObservationControl";
import { e1AnticipationPedagogicalBinding, e1AnticipationTechnicalControl } from "./pedagogical-v2/e1AnticipationPedagogicalChain";
import { loadPedagogicalReferenceEV1 } from "./pedagogical-v2/catalogs/pedagogical-reference-e-v1";
import { competenceEvaluationSchema } from "./pedagogical-v2/inputSchemas";
import type { CoachingCycle, SafetyContext } from "./coachingTypes";
import type { TechnicalHypothesis } from "./technicalHypothesis";

const safety: SafetyContext = { inAuthorizedRange:true, rangeRulesAccepted:true, safeDirectionAvailable:true, weaponUnloadedVerified:true,
 magazineRemoved:true, chamberVisualPhysicalCheck:true, liveAmmunitionRemovedFromArea:true, eyeAndEarProtection:true,
 dummyRoundsAllowed:false, dummyRoundProcedureKnown:false, instructorPresent:true, canDryFire:true, canLiveFire:true };
const hypothesis = (code: TechnicalHypothesis["hypothesisCode"] = "SHOT_ANTICIPATION"): TechnicalHypothesis => ({ id:"h",sessionId:"s",seriesId:"series",comparisonId:null,observationId:"o",hypothesisCode:code,category:"anticipation",status:"requires_confirmation",plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],rulesetVersion:"v",generatedAt:"2026-08-30T00:00:00.000Z" });
const cycle = (): CoachingCycle => ({ id:"c",sessionId:"s",sourceSeriesId:"series",hypothesisId:"h",confirmationTestRunId:"t",recommendationId:null,drillCode:null,controlSeriesId:null,status:"drill_pending",outcome:null,objective:null,startedAt:"2026-08-30T00:00:00.000Z",completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:"v" });

describe("consolidation fonctionnelle E1", () => {
  it("n’active qu’une hypothèse E1 et conserve les manifestations historiques lisibles", () => {
    expect(activeHypothesisCodes).toContain("SHOT_ANTICIPATION");
    expect(activeHypothesisCodes).not.toEqual(expect.arrayContaining(["FLINCH_RESPONSE", "PUSHING_AGAINST_RECOIL"]));
    for (const code of ["FLINCH_RESPONSE", "PUSHING_AGAINST_RECOIL"] as const) expect(normalizeHistoricalE1Hypothesis(hypothesis(code))).toMatchObject({ hypothesisCode:"SHOT_ANTICIPATION", rank:1, internalScore:4 });
  });

  it("réserve le test temporel historique v1 à la seule hypothèse fonctionnelle", () => {
    const test = confirmationTestCatalog.find((item) => item.code === "TEST_ANTICIPATION_DRY")!;
    expect(test.hypothesisCodes).toEqual(["SHOT_ANTICIPATION"]);
    expect(test.objective).toMatch(/aucun recul réel/i);
    expect(selectConfirmationTest({ hypothesis:hypothesis(), alternatives:[], sessionMode:"coaching_free", safety, userCanPerform:true, contextKnown:true, numberOfHands:2 }).primary?.code).toBe("TEST_ANTICIPATION_DRY");
  });

  it.each([
    ["Aucune réaction anticipatrice observable", "does_not_support_hypothesis"],
    ["Abaissement anticipé reproductible", "supports_hypothesis"],
    ["Poussée anticipée reproductible", "supports_hypothesis"],
    ["Sursaut ou crispation anticipatrice reproductible", "supports_hypothesis"],
    ["Fermeture des yeux anticipatrice reproductible", "supports_hypothesis"],
    ["Autre réponse anticipatrice reproductible", "supports_hypothesis"],
    ["Résultat ambigu ou non interprétable", "inconclusive"],
    ["Réaction non observable de manière fiable", "not_observed"],
  ] as const)("mappe l’observation E1 %s", (observation, outcome) =>
    expect(outcomeForTestObservation("TEST_ANTICIPATION_DRY", "SHOT_ANTICIPATION", observation)).toBe(outcome));

  it("conserve les impacts comme plausibilité prudente, jamais comme confirmation", () => {
    expect(observationHypothesisMappings.some((item) => item.observation === "OFFSET_LOW" && item.hypothesis === "SHOT_ANTICIPATION")).toBe(true);
    expect(observationHypothesisMappings.some((item) => item.hypothesis === "FLINCH_RESPONSE" || item.hypothesis === "PUSHING_AGAINST_RECOIL")).toBe(false);
  });

  it("raccorde competence-e1, TECH-E1-01, EX-E1-01, Recommendation et drill dédiés", () => {
    const catalog = loadPedagogicalReferenceEV1();
    expect(catalog.exercises.find((item) => item.code === "EX-E1-01")).toMatchObject({ primaryCompetenceId:"competence-e1", pedagogicalTechniqueIds:["technique-e1-01"] });
    expect(e1AnticipationPedagogicalBinding).toEqual({ hypothesisCode:"SHOT_ANTICIPATION", confirmationTestCode:"TEST_ANTICIPATION_DRY", competenceId:"competence-e1", pedagogicalTechniqueId:"technique-e1-01", recommendationCode:"REC_ANTICIPATION", trainingDrillCode:"DRILL_ACCEPT_DEPARTURE_E1", exerciseDefinitionId:"exercise-e1-01", controlObjective:"consistency" });
    expect(proposeCoaching({ hypothesis:hypothesis(), testRunId:"t", outcome:"supports_hypothesis", sessionId:"s", level:"intermediate", numberOfHands:2, safety })).toMatchObject({ recommendation:{recommendationCode:"REC_ANTICIPATION"}, drill:{code:"DRILL_ACCEPT_DEPARTURE_E1"}, pedagogicalBinding:e1AnticipationPedagogicalBinding });
    expect(coachingRecommendationCatalog.find((item) => item.code === "REC_ANTICIPATION")?.hypothesisCodes).toEqual(["SHOT_ANTICIPATION"]);
    expect(trainingDrillCatalog.find((item) => item.code === "DRILL_DRY_CONTROLLED_RELEASES")?.linkedHypothesisCodes).not.toContain("SHOT_ANTICIPATION");
  });

  it("produit le contrôle technique et une CompetenceEvaluation sans décision ni maîtrise", () => {
    const completed = completeTechnicalObservationControl({ cycle:prepareTechnicalObservationControl(cycle(), e1AnticipationTechnicalControl), definition:e1AnticipationTechnicalControl, observationCode:"anticipation_reduced", evaluationId:"e", evidenceId:"v", evaluatedAt:"2026-08-30T00:00:00.000Z" });
    expect(completed).toMatchObject({ status:"completed", outcome:"mixed_result", controlSeriesId:null, pedagogicalDecision:null, masteryEvent:null, competenceEvaluation:{ competenceSnapshot:{id:"competence-e1"}, structuredResult:{exerciseDefinitionId:"exercise-e1-01"} } });
    expect(competenceEvaluationSchema.safeParse(completed.competenceEvaluation).success).toBe(true);
    expect(JSON.stringify(completed)).not.toMatch(/meanRadius|extremeSpread|compareSeries/);
  });

  it("ne confond pas le mouvement post-départ avec le contrôle E1", () =>
    expect(e1AnticipationTechnicalControl.knownLimitations.join(" ")).toMatch(/uniquement postérieure.*ne suffit pas/i));
});
