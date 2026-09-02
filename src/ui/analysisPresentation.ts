import { observationLabelsFr } from "../domain/observationCatalog";
import type { ObservationConfidence, ObservationResult } from "../domain/shootingObservation";
import type { PlausibilityLevel, TechnicalHypothesis } from "../domain/technicalHypothesis";

export interface HypothesisPresentation {
  readonly primary: TechnicalHypothesis | null;
  readonly visibleAlternative: TechnicalHypothesis | null;
  readonly additionalAlternatives: readonly TechnicalHypothesis[];
}

export function partitionHypothesesForDisplay(
  hypotheses: readonly TechnicalHypothesis[],
): HypothesisPresentation {
  return {
    primary: hypotheses[0] ?? null,
    visibleAlternative: hypotheses[1] ?? null,
    additionalAlternatives: hypotheses.slice(2),
  };
}

export const plausibilityLabels: Readonly<Record<PlausibilityLevel, string>> = {
  high: "Piste plausible",
  medium: "Piste possible",
  low: "Piste secondaire",
};

export const factualConfidenceLabels: Readonly<Record<ObservationConfidence, string>> = {
  low: "À interpréter avec prudence.",
  medium: "Observation à confirmer.",
  high: "Observation fondée sur les données disponibles.",
};

export const factualConfidenceLevelLabels: Readonly<Record<ObservationConfidence, string>> = {
  low: "faible",
  medium: "moyenne",
  high: "élevée",
};

export function userFacingHypothesisRationale(hypothesis: TechnicalHypothesis): string {
  return hypothesis.supportingEvidence.find((item) => item.code !== "COMPATIBLE_OBSERVATION")?.labelFr
    ?? "Cette piste est compatible avec les faits observés et reste à confirmer.";
}

export function userFacingHypothesisTitle(
  hypothesis: TechnicalHypothesis,
  defaultTitle: string,
): string {
  return hypothesis.rank === 1 && hypothesis.supportingEvidence.some(
    (item) => item.code === "PUNCTUAL_PERTURBATION_COMPATIBILITY",
  )
    ? "Perturbation ponctuelle au départ du coup"
    : defaultTitle;
}

export function seriesObservationSummary(result: ObservationResult): string | null {
  if (!result.primary) return null;
  const principalGroupCenteredAndCompact = result.primary.observationCode === "OUTLIER_TO_VERIFY"
    && result.secondary.some((item) => item.observationCode === "CENTERED_AND_COMPACT");
  return principalGroupCenteredAndCompact
    ? "Groupement principal proche du centre.\n1 impact isolé à vérifier."
    : observationLabelsFr[result.primary.observationCode];
}
