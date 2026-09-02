import { describe, expect, it } from "vitest";
import { inconclusiveDiagnosticProjection } from "./inconclusiveDiagnostic";

describe("inconclusive diagnostic pilot", () => {
  it("routes an outlier to additional information without rerunning blindly", () => {
    expect(inconclusiveDiagnosticProjection({ outcome: "inconclusive", testCode: "controlled_follow_up_series", outlierContamination: true }))
      .toEqual({ reason: "OUTLIER_CONTAMINATION", nextAction: "COLLECT_MORE_INFORMATION" });
  });
  it("changes observation modality for D2/E1 non-observable results", () => {
    expect(inconclusiveDiagnosticProjection({ outcome: "not_observed", testCode: "TEST_TRIGGER_FINGER_PLACEMENT" }))
      .toEqual({ reason: "NOT_OBSERVABLE", nextAction: "CHANGE_OBSERVATION_MODALITY", changedVariable: "supervision" });
  });
  it("uses time only for an explicitly fast D4 observation", () => {
    expect(inconclusiveDiagnosticProjection({ outcome: "inconclusive", testCode: "TEST-D4-01", observation: "Action trop rapide pour être observée" }))
      .toEqual({ reason: "AMBIGUOUS_OBSERVATION", nextAction: "CHANGE_ONE_VARIABLE", changedVariable: "time" });
  });
  it("never proposes a changed variable for an ordinary ambiguous test", () => {
    expect(inconclusiveDiagnosticProjection({ outcome: "inconclusive", testCode: "TEST_ANTICIPATION_DRY" }))
      .toEqual({ reason: "AMBIGUOUS_OBSERVATION", nextAction: "TEST_ANOTHER_HYPOTHESIS" });
  });
});
