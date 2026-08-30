import { evaluateCoachingOutcome } from "./coachingOutcomeEvaluator";
import type { CoachingObjective, CoachingOutcome } from "./coachingTypes";
import { observationThresholds } from "./observationRules";
import { isPedagogicallySignificantAtypicalImpact } from "./shootingObservation";
import type { SeriesComparison } from "./seriesComparison";
import { MIN_IMPACTS_FOR_ATYPICAL, SeriesMetrics } from "./seriesMetrics";

export interface ControlSeriesInterpretation {
  outcome: CoachingOutcome;
  headline: string;
  interpretation: string;
  caution: string;
  nextAction: string;
  evaluatedProblem: "punctual_perturbation" | "centering" | "dispersion" | "cycle_objective";
}

function result(
  outcome: CoachingOutcome,
  evaluatedProblem: ControlSeriesInterpretation["evaluatedProblem"],
  headline: string,
  interpretation: string,
): ControlSeriesInterpretation {
  const nextAction = outcome === "objective_improved"
    ? "Maintenir ce travail et confirmer l’évolution sur une autre série."
    : outcome === "insufficient_data" || outcome === "mixed_result"
      ? "Information insuffisante : poursuivre avec prudence avant toute nouvelle conclusion."
      : "Poursuivre le travail ou réévaluer l’hypothèse avant de changer d’objectif.";
  const caution = outcome === "objective_improved"
    ? "À confirmer sur d’autres séries avant de considérer cette amélioration comme stable."
    : outcome === "insufficient_data" || outcome === "mixed_result"
      ? "Une nouvelle série réalisée dans des conditions comparables peut être nécessaire pour conclure."
      : "Une seule série ne permet pas de conclure définitivement à l’efficacité ou à l’inefficacité du travail.";
  return { outcome, evaluatedProblem, headline, interpretation, caution, nextAction };
}

function sourceRepresentsPunctualPerturbation(metrics: SeriesMetrics) {
  const group = metrics.principalGroup;
  return isPedagogicallySignificantAtypicalImpact(metrics)
    && group?.shapeClassification === "compact"
    && (group.normalized.centroidDistanceToTargetCenter ?? Number.POSITIVE_INFINITY)
      <= observationThresholds.normalized.centered;
}

function interpretPunctualPerturbation(
  sourceMetrics: SeriesMetrics,
  controlMetrics: SeriesMetrics,
  comparison: SeriesComparison,
) {
  if (comparison.status === "not_comparable"
      || sourceMetrics.includedImpactCount < MIN_IMPACTS_FOR_ATYPICAL
      || controlMetrics.includedImpactCount < MIN_IMPACTS_FOR_ATYPICAL) {
    return result("insufficient_data", "punctual_perturbation",
      "Cette série de contrôle ne permet pas de vérifier suffisamment la reproduction de l’impact isolé.",
      "Les données ou le contexte ne permettent pas de conclure suffisamment sur l’effet du travail.");
  }
  if (isPedagogicallySignificantAtypicalImpact(controlMetrics)) {
    return result("objective_stable", "punctual_perturbation",
      "Un impact isolé est de nouveau observé dans la série de contrôle.",
      "Le problème observé sur la série de référence reste présent. Le travail réalisé ne suffit pas encore à montrer une amélioration.");
  }
  if (controlMetrics.shapeClassification !== "compact") {
    return result("mixed_result", "punctual_perturbation",
      "L’impact isolé ne se reproduit pas, mais la structure du groupement a changé.",
      "Cette série de contrôle ne permet pas de conclure suffisamment sur l’effet du travail.");
  }
  const centered = (controlMetrics.normalized.centroidDistanceToTargetCenter ?? Number.POSITIVE_INFINITY)
    <= observationThresholds.normalized.centered;
  return result("objective_improved", "punctual_perturbation",
    centered
      ? "Le groupement est maintenant resserré et l’impact isolé observé sur la série de référence ne se reproduit pas."
      : "Le groupement est resserré et l’impact isolé observé sur la série de référence ne se reproduit pas.",
    "L’évolution est compatible avec une amélioration du contrôle du départ.");
}

function objectiveText(objective: CoachingObjective, outcome: CoachingOutcome) {
  if (objective === "centering") {
    if (outcome === "objective_improved") return [
      "Le centre du groupement se rapproche du centre de la cible.",
      "L’évolution est compatible avec une amélioration du biais travaillé.",
    ] as const;
    if (outcome === "objective_stable" || outcome === "objective_worsened") return [
      "Le décalage du groupement reste présent dans la série de contrôle.",
      "Le travail réalisé ne suffit pas encore à montrer une amélioration du biais.",
    ] as const;
  }
  if (objective === "dispersion" || objective === "consistency") {
    if (outcome === "objective_improved") return [
      "La dispersion du groupement diminue dans la série de contrôle.",
      "L’évolution est compatible avec une amélioration de la régularité travaillée.",
    ] as const;
    if (outcome === "objective_stable" || outcome === "objective_worsened") return [
      "La dispersion ne montre pas d’amélioration claire dans la série de contrôle.",
      "Le travail réalisé ne suffit pas encore à montrer une amélioration de la régularité.",
    ] as const;
  }
  if (outcome === "objective_improved") return [
    "Les mesures liées à l’objectif du cycle évoluent favorablement.",
    "L’évolution est compatible avec une amélioration sur l’objectif travaillé.",
  ] as const;
  if (outcome === "objective_stable" || outcome === "objective_worsened") return [
    "Les mesures liées à l’objectif ne montrent pas d’amélioration claire.",
    "Le travail réalisé ne suffit pas encore à montrer une amélioration.",
  ] as const;
  return [
    "Cette série de contrôle produit un résultat insuffisant ou mixte.",
    "Cette série de contrôle ne permet pas de conclure suffisamment sur l’effet du travail.",
  ] as const;
}

export function interpretControlSeries(input: {
  objective: CoachingObjective | null;
  sourceMetrics: SeriesMetrics;
  controlMetrics: SeriesMetrics;
  comparison: SeriesComparison;
}): ControlSeriesInterpretation {
  if (sourceRepresentsPunctualPerturbation(input.sourceMetrics)) {
    return interpretPunctualPerturbation(input.sourceMetrics, input.controlMetrics, input.comparison);
  }
  if (!input.objective) return result("insufficient_data", "cycle_objective",
    "L’objectif du cycle n’est pas disponible.",
    "Cette série de contrôle ne permet pas de conclure suffisamment sur l’effet du travail.");
  const outcome = evaluateCoachingOutcome(input.comparison, input.objective);
  const [headline, interpretation] = objectiveText(input.objective, outcome);
  const evaluatedProblem = input.objective === "centering" ? "centering"
    : input.objective === "dispersion" || input.objective === "consistency" ? "dispersion"
      : "cycle_objective";
  return result(outcome, evaluatedProblem, headline, interpretation);
}
