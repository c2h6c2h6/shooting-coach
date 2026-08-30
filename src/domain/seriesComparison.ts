import { SeriesStatus } from "./series";
import { NumberOfHands } from "./session";
import { PointMetrics, SeriesMetrics, ShapeClassification } from "./seriesMetrics";

export const SERIES_COMPARISON_ALGORITHM_VERSION = "series-comparison-v1";
export const COMPARISON_THRESHOLDS_VERSION = "comparison-thresholds-v1";
export const RELATIVE_EPSILON = 0.001;

export type ComparisonType = "reference" | "previous" | "manual";
export type ComparisonStatus = "comparable" | "partially_comparable" | "not_comparable";
export type ReliabilityLevel = "limited" | "acceptable" | "reinforced";
export type VariationLevel = "stable" | "slight" | "notable";
export type NumericMetricKey =
  | "horizontalOffset" | "verticalOffset" | "centroidDistanceToTargetCenter"
  | "spreadWidth" | "spreadHeight" | "extremeSpread" | "meanRadius"
  | "meanDistanceToTargetCenter";

export interface ComparableSeriesContext {
  id: string; sessionId: string; status: SeriesStatus; weaponId: string;
  distanceMm: number; numberOfHands: NumberOfHands | null; targetTypeId: string; targetGeometryVersion: string;
}
export interface NumericDifference {
  baselineValue: number; comparedValue: number; delta: number;
  relativePercent: number | null; variation: VariationLevel;
  percentageLimitation: string | null;
}
export interface SeriesComparison {
  id: string; sessionId: string; baselineSeriesId: string; comparedSeriesId: string;
  comparisonType: ComparisonType; status: ComparisonStatus; reliability: ReliabilityLevel;
  algorithmVersion: string; thresholdsVersion: string; baselineMetricsVersion: string;
  comparedMetricsVersion: string; unit: "mm" | "normalized"; reasons: string[];
  limitations: string[]; differences: Partial<Record<NumericMetricKey, NumericDifference>>;
  counts: {
    expectedShotCount: NumericDifference; recordedShotCount: NumericDifference;
    includedImpactCount: NumericDifference; excludedImpactCount: NumericDifference;
  };
  shape: { baselineValue: ShapeClassification; comparedValue: ShapeClassification; changed: boolean };
  computedAt: string;
}
export type ComparisonDraft = Omit<SeriesComparison, "id" | "computedAt">;

// Seuils provisoires v1, calibrés prudemment pour une saisie manuelle.
// En normalisé, 0,01 = 1 % de la largeur/hauteur de la zone.
const thresholds: Record<NumericMetricKey, { normalized: [number, number]; mm: [number, number] }> = {
  horizontalOffset: { normalized: [0.01, 0.03], mm: [2, 5] },
  verticalOffset: { normalized: [0.01, 0.03], mm: [2, 5] },
  centroidDistanceToTargetCenter: { normalized: [0.01, 0.03], mm: [2, 5] },
  spreadWidth: { normalized: [0.015, 0.05], mm: [3, 8] },
  spreadHeight: { normalized: [0.015, 0.05], mm: [3, 8] },
  extremeSpread: { normalized: [0.015, 0.05], mm: [3, 8] },
  meanRadius: { normalized: [0.01, 0.03], mm: [2, 5] },
  meanDistanceToTargetCenter: { normalized: [0.01, 0.03], mm: [2, 5] },
};

function difference(a: number, b: number, stable: number, notable: number): NumericDifference {
  const delta = b - a;
  const magnitude = Math.abs(delta);
  return {
    baselineValue: a, comparedValue: b, delta,
    relativePercent: Math.abs(a) <= RELATIVE_EPSILON ? null : delta / Math.abs(a) * 100,
    variation: magnitude <= stable ? "stable" : magnitude < notable ? "slight" : "notable",
    percentageLimitation: Math.abs(a) <= RELATIVE_EPSILON
      ? "Pourcentage non calculable : valeur de référence nulle ou trop proche de zéro." : null,
  };
}
const countDifference = (a: number, b: number) => difference(a, b, 0, 1);
const valuesFor = (metrics: SeriesMetrics, unit: "mm" | "normalized"): PointMetrics =>
  unit === "mm" ? metrics.physicalMm! : metrics.normalized;

export function compareSeries(input: {
  baseline: ComparableSeriesContext; compared: ComparableSeriesContext;
  baselineMetrics: SeriesMetrics; comparedMetrics: SeriesMetrics; comparisonType: ComparisonType;
}): ComparisonDraft {
  const reasons: string[] = [];
  const limitations: string[] = [];
  if (input.baseline.sessionId !== input.compared.sessionId) reasons.push("Les séries appartiennent à deux séances différentes.");
  if (input.baseline.status !== "completed" || input.compared.status !== "completed") reasons.push("Seules les séries terminées sont comparables.");
  if (input.baseline.weaponId !== input.compared.weaponId) reasons.push("Les armes utilisées diffèrent.");
  if (input.baseline.distanceMm !== input.compared.distanceMm) reasons.push("Les distances diffèrent.");
  if (input.baseline.numberOfHands === null || input.compared.numberOfHands === null) {
    reasons.push("Le nombre de mains n’est pas renseigné pour au moins une série.");
  } else if (input.baseline.numberOfHands !== input.compared.numberOfHands) {
    reasons.push("Les nombres de mains utilisés diffèrent.");
  }
  if (input.baseline.targetTypeId !== input.compared.targetTypeId) reasons.push("Les types de cible diffèrent.");
  if (input.baseline.targetGeometryVersion !== input.compared.targetGeometryVersion) reasons.push("Les versions de géométrie de cible diffèrent.");
  if (input.baselineMetrics.algorithmVersion !== input.comparedMetrics.algorithmVersion) reasons.push("Les versions de calcul des mesures sont incompatibles.");
  if (!input.baselineMetrics.includedImpactCount || !input.comparedMetrics.includedImpactCount) reasons.push("Au moins une série ne contient aucun impact inclus.");

  const unit = input.baselineMetrics.physicalMm && input.comparedMetrics.physicalMm ? "mm" : "normalized";
  if (unit === "normalized") limitations.push("Géométrie physique non vérifiée : comparaison en proportions de la zone.");
  limitations.push("Impacts placés manuellement : les petites variations peuvent refléter la précision de saisie.");
  const countGap = Math.abs(input.baselineMetrics.includedImpactCount - input.comparedMetrics.includedImpactCount);
  const maxCount = Math.max(input.baselineMetrics.includedImpactCount, input.comparedMetrics.includedImpactCount);
  if (countGap) limitations.push(`Nombre d’impacts inclus différent (${input.baselineMetrics.includedImpactCount} contre ${input.comparedMetrics.includedImpactCount}).`);
  if (maxCount && countGap / maxCount >= .4) limitations.push("Écart important d’effectif : conclusions de dispersion limitées.");
  if (input.baselineMetrics.excludedImpactCount !== input.comparedMetrics.excludedImpactCount) {
    limitations.push(`Exclusions différentes (${input.baselineMetrics.excludedImpactCount} contre ${input.comparedMetrics.excludedImpactCount}).`);
  }

  const a = valuesFor(input.baselineMetrics, unit);
  const b = valuesFor(input.comparedMetrics, unit);
  const differences: Partial<Record<NumericMetricKey, NumericDifference>> = {};
  for (const key of Object.keys(thresholds) as NumericMetricKey[]) {
    if (a[key] == null || b[key] == null) continue;
    differences[key] = difference(a[key]!, b[key]!, ...thresholds[key][unit]);
  }
  const dispersionKeys: NumericMetricKey[] = ["spreadWidth", "spreadHeight", "extremeSpread", "meanRadius"];
  const missingDispersion = dispersionKeys.some((key) => !differences[key]);
  if (missingDispersion) limitations.push("Certaines mesures de dispersion nécessitent au moins deux impacts inclus.");
  const status: ComparisonStatus = reasons.length ? "not_comparable" : missingDispersion ? "partially_comparable" : "comparable";
  let reliability: ReliabilityLevel = input.baselineMetrics.includedImpactCount >= 8 && input.comparedMetrics.includedImpactCount >= 8 ? "reinforced" : "acceptable";
  if (unit === "normalized" || input.baselineMetrics.includedImpactCount < 3 || input.comparedMetrics.includedImpactCount < 3 ||
      (maxCount > 0 && countGap / maxCount >= .4) || input.baselineMetrics.excludedImpactCount > 0 ||
      input.comparedMetrics.excludedImpactCount > 0 || status === "not_comparable") reliability = "limited";
  return {
    sessionId: input.compared.sessionId, baselineSeriesId: input.baseline.id,
    comparedSeriesId: input.compared.id, comparisonType: input.comparisonType, status, reliability,
    algorithmVersion: SERIES_COMPARISON_ALGORITHM_VERSION, thresholdsVersion: COMPARISON_THRESHOLDS_VERSION,
    baselineMetricsVersion: input.baselineMetrics.algorithmVersion,
    comparedMetricsVersion: input.comparedMetrics.algorithmVersion, unit, reasons, limitations,
    differences: status === "not_comparable" ? {} : differences,
    counts: {
      expectedShotCount: countDifference(input.baselineMetrics.expectedShotCount, input.comparedMetrics.expectedShotCount),
      recordedShotCount: countDifference(input.baselineMetrics.recordedShotCount, input.comparedMetrics.recordedShotCount),
      includedImpactCount: countDifference(input.baselineMetrics.includedImpactCount, input.comparedMetrics.includedImpactCount),
      excludedImpactCount: countDifference(input.baselineMetrics.excludedImpactCount, input.comparedMetrics.excludedImpactCount),
    },
    shape: { baselineValue: input.baselineMetrics.shapeClassification,
      comparedValue: input.comparedMetrics.shapeClassification,
      changed: input.baselineMetrics.shapeClassification !== input.comparedMetrics.shapeClassification },
  };
}
