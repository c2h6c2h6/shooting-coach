import type { ConfirmationOutcome, ConfirmationTestRun } from "../domain/coachingTypes";
import type { Series } from "../domain/series";
import type { SeriesComparison } from "../domain/seriesComparison";
import { observationThresholds } from "../domain/observationRules";

export const CONTROLLED_BIAS_CONFIRMATION_TEST_CODE = "controlled_follow_up_series";

export type DiagnosticConfirmationConclusion = "strengthened" | "weakened" | "inconclusive";

export interface DiagnosticConfirmationResult {
  readonly conclusion: DiagnosticConfirmationConclusion;
  readonly headline: string;
  readonly interpretation: string;
  readonly comparison: SeriesComparison;
  readonly sourceSeriesId: string;
  readonly diagnosticSeriesId: string;
}

export function deriveDiagnosticConfirmationResult(input: {
  readonly comparison: SeriesComparison;
  readonly sourceSeries: Series;
  readonly diagnosticSeries: Series;
}): DiagnosticConfirmationResult {
  const base = {
    comparison: input.comparison,
    sourceSeriesId: input.sourceSeries.id,
    diagnosticSeriesId: input.diagnosticSeries.id,
  };
  const cadenceComparable = input.sourceSeries.cadenceType == null
    || input.diagnosticSeries.cadenceType == null
    || input.sourceSeries.cadenceType === input.diagnosticSeries.cadenceType;
  const horizontal = input.comparison.differences.horizontalOffset;
  const vertical = input.comparison.differences.verticalOffset;
  const centerDistance = input.comparison.differences.centroidDistanceToTargetCenter;
  const materiallyLimited = input.comparison.limitations.some((item) =>
    item.startsWith("Écart important d’effectif") || item.startsWith("Exclusions différentes"));

  if (input.comparison.status === "not_comparable" || !cadenceComparable
      || !horizontal || !vertical || !centerDistance || materiallyLimited) {
    return {
      ...base,
      conclusion: "inconclusive",
      headline: "Cette série ne permet pas de conclure suffisamment.",
      interpretation: "Les conditions ou les données disponibles ne permettent pas de départager la piste d’un biais constant.",
    };
  }
  if (horizontal.variation !== "notable" && vertical.variation !== "notable") {
    return {
      ...base,
      conclusion: "strengthened",
      headline: "Le décalage se reproduit dans des conditions comparables.",
      interpretation: "La piste d’un biais constant est renforcée.",
    };
  }
  if (centerDistance.variation === "notable" && centerDistance.delta < 0) {
    const centeredThreshold = input.comparison.unit === "mm"
      ? observationThresholds.physicalMm.centered
      : observationThresholds.normalized.centered;
    const sourceVector = {
      x: horizontal.baselineValue,
      y: vertical.baselineValue,
    };
    const diagnosticVector = {
      x: horizontal.comparedValue,
      y: vertical.comparedValue,
    };
    const sameGeneralDirection = sourceVector.x * diagnosticVector.x
      + sourceVector.y * diagnosticVector.y > 0;
    const biasStillSignificant = centerDistance.comparedValue > centeredThreshold;
    if (sameGeneralDirection && biasStillSignificant) {
      return {
        ...base,
        conclusion: "inconclusive",
        headline: "Le décalage persiste dans la même direction, mais il diminue.",
        interpretation: "La piste d’un biais constant reste possible, sans être renforcée ni écartée par cette amélioration partielle.",
      };
    }
    return {
      ...base,
      conclusion: "weakened",
      headline: "Le décalage ne se reproduit pas dans cette série.",
      interpretation: "La piste d’un biais constant est affaiblie.",
    };
  }
  return {
    ...base,
    conclusion: "inconclusive",
    headline: "Cette série ne permet pas de conclure suffisamment.",
    interpretation: "Les deux séries diffèrent d’une manière qui ne permet ni de renforcer ni d’affaiblir prudemment la piste d’un biais constant.",
  };
}

export function confirmationOutcomeFor(result: DiagnosticConfirmationResult): ConfirmationOutcome {
  if (result.conclusion === "strengthened") return "supports_hypothesis";
  if (result.conclusion === "weakened") return "does_not_support_hypothesis";
  return "inconclusive";
}

export function isSameConfirmationRun(input: {
  readonly run: ConfirmationTestRun;
  readonly sourceSeriesId: string;
  readonly hypothesisId: string;
}): boolean {
  return input.run.sourceSeriesId === input.sourceSeriesId
    && input.run.hypothesisId === input.hypothesisId
    && input.run.testCode === CONTROLLED_BIAS_CONFIRMATION_TEST_CODE
    && input.run.generatedSeriesId !== null
    && input.run.status !== "cancelled";
}
