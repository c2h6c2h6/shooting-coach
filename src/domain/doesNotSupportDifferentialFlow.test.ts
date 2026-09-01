import { describe, expect, it } from "vitest";
import {
  applyConfirmationOutcomeToHypothesis,
  completionTransitionForOutcome,
  nextTestableHypothesisAfterOutcome,
} from "./confirmationOutcomeTransition";
import type { TechnicalHypothesis } from "./technicalHypothesis";

function hypothesis(code: TechnicalHypothesis["hypothesisCode"], rank: number,
  overrides: Partial<TechnicalHypothesis> = {}): TechnicalHypothesis {
  return {
    id: `hypothesis-${rank}`, sessionId: "session", seriesId: "series", comparisonId: null,
    observationId: `observation-${rank}`, hypothesisCode: code, category: "trigger",
    status: "requires_confirmation", plausibilityLevel: "medium", confidenceLevel: "low",
    rank, internalScore: 5 - rank, supportingEvidence: [], contradictingEvidence: [], missingEvidence: [],
    applicableContext: { numberOfHands: 2 }, sourceRules: [],
    rulesetVersion: "technical-hypothesis-rules-v1", generatedAt: "2026-08-26T00:00:00.000Z",
    ...overrides,
  };
}

describe("does_not_support et poursuite différentielle", () => {
  it("affaiblit H1 sans changer son score ni son rang", () => {
    const h1 = hypothesis("LATERAL_TRIGGER_PRESSURE", 1);
    const updated = applyConfirmationOutcomeToHypothesis(h1, "does_not_support_hypothesis");
    expect(updated).toMatchObject({ status: "weakened", rank: 1, internalScore: 4 });
    expect(updated.hypothesisCode).toBe(h1.hypothesisCode);
  });

  it("termine le cycle H1 sans exercice", () => {
    expect(completionTransitionForOutcome("does_not_support_hypothesis")).toEqual({
      hypothesisStatus: "weakened", cycleStatus: "completed", shouldProposeDrill: false,
    });
  });

  it("passe de H1 affaiblie à H2 testable", () => {
    const h1 = applyConfirmationOutcomeToHypothesis(hypothesis("LATERAL_TRIGGER_PRESSURE", 1),
      "does_not_support_hypothesis");
    const h2 = hypothesis("SHOT_ANTICIPATION", 2, { category: "anticipation" });
    expect(nextTestableHypothesisAfterOutcome([h1, h2], "coaching_free")).toBe(h2);
  });

  it("saute H2 non testable et propose H3", () => {
    const h1 = applyConfirmationOutcomeToHypothesis(hypothesis("LATERAL_TRIGGER_PRESSURE", 1),
      "does_not_support_hypothesis");
    const h2 = hypothesis("ATTENTION_LOSS", 2, { category: "context_equipment" });
    const h3 = hypothesis("SHOT_ANTICIPATION", 3, { category: "anticipation" });
    expect(nextTestableHypothesisAfterOutcome([h1, h2, h3], "coaching_free")).toBe(h3);
  });

  it("ne crée aucun fallback si aucune autre hypothèse n’est testable", () => {
    const h1 = applyConfirmationOutcomeToHypothesis(hypothesis("LATERAL_TRIGGER_PRESSURE", 1),
      "does_not_support_hypothesis");
    expect(nextTestableHypothesisAfterOutcome([h1, hypothesis("ATTENTION_LOSS", 2)], "coaching_free"))
      .toBeNull();
  });

  it("ne repropose pas immédiatement le même test de H1", () => {
    const h1 = applyConfirmationOutcomeToHypothesis(hypothesis("LATERAL_TRIGGER_PRESSURE", 1),
      "does_not_support_hypothesis");
    expect(nextTestableHypothesisAfterOutcome([h1], "coaching_free")).toBeNull();
  });

  it.each(["inconclusive", "not_observed"] as const)("écarte temporairement le couple H1/test après %s", outcome => {
    const h1 = hypothesis("EQUIPMENT_OR_SIGHT_ISSUE", 1, { category: "context_equipment" });
    const h2 = hypothesis("SHOT_ANTICIPATION", 2, { category: "anticipation" });
    expect(nextTestableHypothesisAfterOutcome([h1, h2], "coaching_free", {
      hypothesisCode: h1.hypothesisCode, confirmationTestCode: "TEST_EQUIPMENT_CONTEXT_CHECK",
    })).toBe(h2);
    expect(applyConfirmationOutcomeToHypothesis(h1, outcome).status).toBe("requires_confirmation");
  });

  it("respecte numberOfHands pendant la poursuite", () => {
    const h1 = applyConfirmationOutcomeToHypothesis(hypothesis("LATERAL_TRIGGER_PRESSURE", 1),
      "does_not_support_hypothesis");
    const h2 = hypothesis("UNBALANCED_HAND_PRESSURE", 2, {
      category: "grip", applicableContext: { numberOfHands: 1 },
    });
    const h3 = hypothesis("SHOT_ANTICIPATION", 3, { category: "anticipation" });
    expect(nextTestableHypothesisAfterOutcome([h1, h2, h3], "coaching_free")).toBe(h3);
  });

  it.each([
    ["supports_hypothesis", "strengthened", "drill_pending", true],
    ["contradicts_hypothesis", "contradicted", "test_completed", false],
    ["inconclusive", "requires_confirmation", "test_completed", false],
    ["not_observed", "requires_confirmation", "test_completed", false],
  ] as const)("conserve la sémantique de %s", (outcome, status, cycleStatus, shouldProposeDrill) => {
    expect(completionTransitionForOutcome(outcome)).toEqual({
      hypothesisStatus: status, cycleStatus, shouldProposeDrill,
    });
  });
});
