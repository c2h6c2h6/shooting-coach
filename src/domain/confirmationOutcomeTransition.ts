import type { ConfirmationOutcome, CoachingCycleStatus, SessionMode } from "./coachingTypes";
import { firstStructurallyTestableHypothesis } from "./confirmationTestEngine";
import { hypothesisEffect } from "./confirmationTestEngine";
import type { TechnicalHypothesis } from "./technicalHypothesis";

export interface ConfirmationCompletionTransition {
  readonly hypothesisStatus: TechnicalHypothesis["status"];
  readonly cycleStatus: CoachingCycleStatus;
  readonly shouldProposeDrill: boolean;
}

export function completionTransitionForOutcome(
  outcome: ConfirmationOutcome,
): ConfirmationCompletionTransition {
  const hypothesisStatus = hypothesisEffect(outcome).status;
  if (outcome === "does_not_support_hypothesis") {
    return { hypothesisStatus, cycleStatus: "completed", shouldProposeDrill: false };
  }
  if (outcome === "supports_hypothesis" || outcome === "weakly_supports_hypothesis") {
    return { hypothesisStatus, cycleStatus: "drill_pending", shouldProposeDrill: true };
  }
  return { hypothesisStatus, cycleStatus: "test_completed", shouldProposeDrill: false };
}

export function applyConfirmationOutcomeToHypothesis(
  hypothesis: TechnicalHypothesis,
  outcome: ConfirmationOutcome,
): TechnicalHypothesis {
  return { ...hypothesis, status: completionTransitionForOutcome(outcome).hypothesisStatus };
}

export function hypothesisStatusAfterHistoricalOutcome(
  hypothesis: TechnicalHypothesis,
  outcome: ConfirmationOutcome | null,
): TechnicalHypothesis {
  return outcome === "does_not_support_hypothesis"
    ? applyConfirmationOutcomeToHypothesis(hypothesis, outcome)
    : hypothesis;
}

export function nextTestableHypothesisAfterOutcome(
  hypotheses: TechnicalHypothesis[],
  sessionMode: SessionMode,
  exclude?: { hypothesisCode: TechnicalHypothesis["hypothesisCode"]; confirmationTestCode: string },
): TechnicalHypothesis | null {
  return firstStructurallyTestableHypothesis({ hypotheses, sessionMode, exclude });
}
