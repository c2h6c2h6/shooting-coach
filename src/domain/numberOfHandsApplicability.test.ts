import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { selectConfirmationTest } from "./confirmationTestEngine";
import { proposeCoaching } from "./coachingCycleEngine";
import { SafetyContext } from "./coachingTypes";
import {
  competenceApplicabilityForNumberOfHands,
  hypothesisApplicabilityForNumberOfHands,
  isConfirmationTestApplicableForNumberOfHands,
  isTrainingDrillApplicableForNumberOfHands,
} from "./numberOfHandsApplicability";
import { ShootingObservation } from "./shootingObservation";
import { generateTechnicalHypotheses, TechnicalHypothesis } from "./technicalHypothesis";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

const safe: SafetyContext = {
  inAuthorizedRange: true, rangeRulesAccepted: true, safeDirectionAvailable: true,
  weaponUnloadedVerified: true, magazineRemoved: true, chamberVisualPhysicalCheck: true,
  liveAmmunitionRemovedFromArea: true, eyeAndEarProtection: true, dummyRoundsAllowed: false,
  dummyRoundProcedureKnown: false, instructorPresent: false, canDryFire: true, canLiveFire: true,
};

function observation(code: ShootingObservation["observationCode"]): ShootingObservation {
  return {
    id: `observation-${code}`, sessionId: "session", seriesId: "series", comparisonId: null,
    observationCode: code, category: "dispersion_shape", scope: "single_series",
    status: "confirmed_by_rules", magnitude: "medium", confidenceLevel: "low", rank: "primary",
    supportingMetrics: {}, limitingFactors: [], algorithmVersion: "test", rulesetVersion: "test",
    thresholdsVersion: "test", sourceVersion: "test", generatedAt: "2026-08-26T00:00:00.000Z",
  };
}

function hypotheses(numberOfHands: 1 | 2 | null, code: ShootingObservation["observationCode"] = "HORIZONTAL_SPREAD") {
  return generateTechnicalHypotheses({
    observations: [observation(code)], laterality: "right", impactCount: 5, numberOfHands,
    generatedAt: "2026-08-26T00:00:00.000Z",
  });
}

function weakHandHypothesis(numberOfHands: 1 | 2 | null): TechnicalHypothesis {
  return {
    id: "hypothesis", sessionId: "session", seriesId: "series", comparisonId: null,
    observationId: "observation", hypothesisCode: "WEAK_SUPPORT_HAND_PRESSURE", category: "grip",
    status: "requires_confirmation", plausibilityLevel: "medium", confidenceLevel: "low", rank: 1,
    internalScore: 4, supportingEvidence: [], contradictingEvidence: [], missingEvidence: [],
    applicableContext: { numberOfHands }, sourceRules: [], rulesetVersion: "test", generatedAt: "now",
  };
}

describe("applicabilité pédagogique selon le nombre de mains", () => {
  it("exclut totalement les hypothèses propres à la main faible à une main", () => {
    const result = hypotheses(1);
    expect(result.some((item) => ["WEAK_SUPPORT_HAND_PRESSURE", "EXCESSIVE_SUPPORT_HAND_PRESSURE", "UNBALANCED_HAND_PRESSURE", "TWO_HAND_CONTRIBUTION"]
      .includes(item.hypothesisCode))).toBe(false);
  });

  it("conserve une piste propre aux deux mains à deux mains si l’observation la soutient", () => {
    expect(hypotheses(2).some((item) => item.hypothesisCode === "TWO_HAND_CONTRIBUTION")).toBe(true);
  });

  it("ne fait remonter aucune piste propre aux deux mains sur le seul contexte 2 mains", () => {
    const result = hypotheses(2, "OUTLIER_TO_VERIFY");
    expect(result.some((item) => ["WEAK_SUPPORT_HAND_PRESSURE", "EXCESSIVE_SUPPORT_HAND_PRESSURE", "UNBALANCED_HAND_PRESSURE", "TWO_HAND_CONTRIBUTION"]
      .includes(item.hypothesisCode))).toBe(false);
  });

  it.each([1, 2] as const)("maintient B5 applicable à %s main(s)", (numberOfHands) => {
    expect(competenceApplicabilityForNumberOfHands("B5", numberOfHands)).toBe("applicable");
  });

  it.each(["D2", "D3", "D4", "D5", "D6"])("maintient %s applicable à une et deux mains", (code) => {
    expect(competenceApplicabilityForNumberOfHands(code, 1)).toBe("applicable");
    expect(competenceApplicabilityForNumberOfHands(code, 2)).toBe("applicable");
  });

  it("maintient E1 applicable à une et deux mains", () => {
    expect(competenceApplicabilityForNumberOfHands("E1", 1)).toBe("applicable");
    expect(competenceApplicabilityForNumberOfHands("E1", 2)).toBe("applicable");
  });

  it("ne propose pas à une main un test envisagé pour une hypothèse de main faible", () => {
    const hypothesis = weakHandHypothesis(1);
    const selection = selectConfirmationTest({ hypothesis, alternatives: [], sessionMode: "coaching_free",
      safety: safe, userCanPerform: true, contextKnown: true, numberOfHands: 1 });
    expect(selection.primary).toBeNull();
    expect(selection.blockers).toContain("Test incompatible avec une séance à une main.");
    const test = confirmationTestCatalog.find((item) => item.code === "TEST_GRIP_CONSTANCY")!;
    expect(isConfirmationTestApplicableForNumberOfHands(test, hypothesis.hypothesisCode, 1)).toBe(false);
  });

  it("ne propose pas à une main un exercice envisagé pour une hypothèse de main faible", () => {
    const hypothesis = weakHandHypothesis(1);
    expect(proposeCoaching({ hypothesis, testRunId: "test", outcome: "supports_hypothesis",
      sessionId: "session", level: "beginner", numberOfHands: 1, safety: safe })).toBeNull();
    const drill = trainingDrillCatalog.find((item) => item.code === "DRILL_CONSTANT_GRIP")!;
    expect(isTrainingDrillApplicableForNumberOfHands(drill, hypothesis.hypothesisCode, 1)).toBe(false);
  });

  it("laisse test et exercice disponibles à deux mains sans ajouter de soutien au score", () => {
    const hypothesis = weakHandHypothesis(2);
    expect(selectConfirmationTest({ hypothesis, alternatives: [], sessionMode: "coaching_free", safety: safe,
      userCanPerform: true, contextKnown: true, numberOfHands: 2 }).primary?.code).toBe("TEST_GRIP_CONSTANCY");
    expect(proposeCoaching({ hypothesis, testRunId: "test", outcome: "supports_hypothesis",
      sessionId: "session", level: "beginner", numberOfHands: 2, safety: safe })).not.toBeNull();
    expect(hypotheses(2).find((item) => item.hypothesisCode === "TWO_HAND_CONTRIBUTION")?.supportingEvidence
      .some((item) => item.code === "NUMBER_OF_HANDS_2")).toBe(false);
  });

  it("traite une séance historique sans nombre de mains comme information insuffisante", () => {
    expect(hypothesisApplicabilityForNumberOfHands("WEAK_SUPPORT_HAND_PRESSURE", null))
      .toBe("insufficient_information");
    const conditional = hypotheses(null).find((item) => item.hypothesisCode === "TWO_HAND_CONTRIBUTION");
    expect(conditional?.missingEvidence.some((item) => item.code === "number_of_hands_unknown")).toBe(true);
    expect(selectConfirmationTest({ hypothesis: weakHandHypothesis(null), alternatives: [], sessionMode: "coaching_free",
      safety: safe, userCanPerform: true, contextKnown: true, numberOfHands: null }).blockers)
      .toContain("Information insuffisante : nombre de mains non renseigné.");
  });
});
