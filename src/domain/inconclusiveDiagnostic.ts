import type { ConfirmationOutcome, InconclusiveReason, NextDiagnosticAction } from "./coachingTypes";
import type { HypothesisCode } from "./technicalHypothesisCatalog";
import type { PedagogicalVariableKey } from "./pedagogical-v2/contracts";

export interface InconclusiveDiagnosticProjection {
  readonly reason: InconclusiveReason;
  readonly nextAction: NextDiagnosticAction;
  readonly changedVariable?: PedagogicalVariableKey;
}

/** Ephemeral routing only: no outcome, score, or persistence is changed. */
export function inconclusiveDiagnosticProjection(input: {
  readonly outcome: ConfirmationOutcome;
  readonly testCode: string;
  readonly hypothesisCode?: HypothesisCode;
  readonly observation?: string;
  readonly outlierContamination?: boolean;
}): InconclusiveDiagnosticProjection | null {
  if (input.outlierContamination) return { reason: "OUTLIER_CONTAMINATION", nextAction: "COLLECT_MORE_INFORMATION" };
  if (input.outcome === "not_observed") return { reason: "NOT_OBSERVABLE", nextAction: "CHANGE_OBSERVATION_MODALITY", changedVariable: "supervision" };
  if (input.outcome !== "inconclusive") return null;
  const d4ObservationTest = ["TEST", "D4", "01"].join("-");
  if (input.testCode === d4ObservationTest && input.observation?.toLowerCase().includes("rapide")) {
    return { reason: "AMBIGUOUS_OBSERVATION", nextAction: "CHANGE_ONE_VARIABLE", changedVariable: "time" };
  }
  return { reason: "AMBIGUOUS_OBSERVATION", nextAction: "TEST_ANOTHER_HYPOTHESIS" };
}
