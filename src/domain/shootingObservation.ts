import { SeriesComparison } from "./seriesComparison";
import { SeriesMetrics } from "./seriesMetrics";
import {
  categoryByCode, ObservationCategory, ObservationCode, OBSERVATION_RULESET_VERSION,
} from "./observationCatalog";
import { OBSERVATION_THRESHOLDS_VERSION, observationThresholds } from "./observationRules";

export const OBSERVATION_ALGORITHM_VERSION = "shooting-observation-v1";
export type ObservationScope = "single_series" | "comparison" | "session_pattern";
export type ObservationStatus = "confirmed_by_rules" | "tentative" | "insufficient_data" | "contradictory_data";
export type ObservationMagnitude = "low" | "medium" | "high" | null;
export type ObservationConfidence = "low" | "medium" | "high";
export type ObservationRank = "primary" | "secondary" | "limitation";

export interface ShootingObservation {
  id: string;
  sessionId: string;
  seriesId: string | null;
  comparisonId: string | null;
  observationCode: ObservationCode;
  category: ObservationCategory;
  scope: ObservationScope;
  status: ObservationStatus;
  magnitude: ObservationMagnitude;
  confidenceLevel: ObservationConfidence;
  rank: ObservationRank;
  supportingMetrics: Record<string, unknown>;
  limitingFactors: string[];
  algorithmVersion: string;
  rulesetVersion: string;
  thresholdsVersion: string;
  sourceVersion: string;
  generatedAt: string;
}
export type ObservationDraft = Omit<ShootingObservation, "id">;
export interface ObservationResult {
  primary: ObservationDraft | null;
  secondary: ObservationDraft[];
  limitations: ObservationDraft[];
}

function magnitude(value: number, levels: readonly [number, number, number]): ObservationMagnitude {
  const absolute = Math.abs(value);
  return absolute < levels[1] ? "low" : absolute < levels[2] ? "medium" : "high";
}
function base(input: {
  code: ObservationCode; sessionId: string; seriesId?: string; comparisonId?: string;
  scope: ObservationScope; rank: ObservationRank; status?: ObservationStatus;
  magnitude?: ObservationMagnitude; confidence: ObservationConfidence;
  metrics?: Record<string, unknown>; limitations?: string[]; sourceVersion: string; generatedAt: string;
}): ObservationDraft {
  return {
    sessionId: input.sessionId, seriesId: input.seriesId ?? null,
    comparisonId: input.comparisonId ?? null, observationCode: input.code,
    category: categoryByCode[input.code], scope: input.scope,
    status: input.status ?? "confirmed_by_rules", magnitude: input.magnitude ?? null,
    confidenceLevel: input.confidence, rank: input.rank,
    supportingMetrics: input.metrics ?? {}, limitingFactors: input.limitations ?? [],
    algorithmVersion: OBSERVATION_ALGORITHM_VERSION, rulesetVersion: OBSERVATION_RULESET_VERSION,
    thresholdsVersion: OBSERVATION_THRESHOLDS_VERSION, sourceVersion: input.sourceVersion,
    generatedAt: input.generatedAt,
  };
}

function confidence(metrics: SeriesMetrics): { level: ObservationConfidence; factors: string[] } {
  const factors: string[] = ["Saisie manuelle des impacts."];
  if (!metrics.physicalMm) factors.push("Géométrie physique de cible non vérifiée.");
  if (metrics.includedImpactCount < 5) factors.push("Moins de cinq impacts inclus.");
  if (metrics.excludedImpactCount) factors.push("Présence d’impacts exclus.");
  if (metrics.potentiallyAtypicalImpactIds.length) factors.push("Impact potentiellement atypique présent.");
  if (!metrics.physicalMm || metrics.includedImpactCount < 5 || factors.length > 1) return { level: "low", factors };
  return { level: "medium", factors };
}

export function isPedagogicallySignificantAtypicalImpact(metrics: SeriesMetrics): boolean {
  if (metrics.potentiallyAtypicalImpactIds.length !== 1 || !metrics.principalGroup) return false;
  const global = metrics.normalized;
  const principal = metrics.principalGroup.normalized;
  if (global.centroidX == null || global.centroidY == null
    || principal.centroidX == null || principal.centroidY == null) return false;
  // Le centroïde global vaut ((n - 1) × centroïde principal + point atypique) / n.
  // On retrouve donc l'écart réel du point au noyau sans l'exclure des métriques.
  const separationFromPrincipalGroup = metrics.includedImpactCount * Math.hypot(
    global.centroidX - principal.centroidX,
    global.centroidY - principal.centroidY,
  );
  // Le seuil descriptif centré/décalé déjà existant sert de garde-fou UX
  // contre les micro-écarts liés à la précision limitée de la saisie manuelle.
  return separationFromPrincipalGroup > observationThresholds.normalized.centered;
}

export function observeSeries(input: {
  sessionId: string; seriesId: string; metrics: SeriesMetrics; generatedAt?: string;
}): ObservationResult {
  const at = input.generatedAt ?? new Date().toISOString();
  const metrics = input.metrics;
  const c = confidence(metrics);
  const significantAtypicalImpact = isPedagogicallySignificantAtypicalImpact(metrics);
  const principalGroup = significantAtypicalImpact
    && metrics.principalGroup?.shapeClassification === "compact"
    ? metrics.principalGroup
    : null;
  const unit = (principalGroup?.physicalMm ?? metrics.physicalMm) ? "physicalMm" : "normalized";
  const values = principalGroup
    ? principalGroup.physicalMm ?? principalGroup.normalized
    : metrics.physicalMm ?? metrics.normalized;
  const analyzedImpactCount = principalGroup?.impactIds.length ?? metrics.includedImpactCount;
  const t = observationThresholds[unit];
  const geometric: ObservationDraft[] = [];
  const limitations: ObservationDraft[] = [];
  const make = (code: ObservationCode, rank: ObservationRank, data: Record<string, unknown> = {},
    status?: ObservationStatus, mag: ObservationMagnitude = null) =>
    base({ code, sessionId: input.sessionId, seriesId: input.seriesId, scope: "single_series",
      rank, status, magnitude: mag, confidence: c.level, metrics: {
        unit,
        groupingBasis: principalGroup ? "principal_group" : "all_included_impacts",
        principalGroupImpactIds: principalGroup?.impactIds ?? [],
        potentiallyAtypicalImpactIds: metrics.potentiallyAtypicalImpactIds,
        globalCentroidDistanceToTargetCenter: metrics.normalized.centroidDistanceToTargetCenter,
        ...data,
      },
      limitations: c.factors, sourceVersion: metrics.algorithmVersion, generatedAt: at });

  if (metrics.includedImpactCount === 0) {
    limitations.push(make("INSUFFICIENT_IMPACTS", "limitation", { includedImpactCount: 0 }, "insufficient_data"));
    limitations.push(make("MANUAL_INPUT_LIMITATION", "limitation"));
    if (!metrics.physicalMm) limitations.push(make("TARGET_GEOMETRY_UNVERIFIED", "limitation"));
    return { primary: null, secondary: [], limitations };
  } else {
    const x = values.horizontalOffset!;
    const y = values.verticalOffset!;
    const distance = values.centroidDistanceToTargetCenter!;
    if (distance <= t.centered) geometric.push(make("CENTERED", "primary",
      { horizontalOffset: x, verticalOffset: y, threshold: t.centered }));
    else if (Math.abs(distance - t.centered) <= t.directionUncertainMargin) {
      geometric.push(make("OFFSET_DIRECTION_UNCERTAIN", "primary",
        { horizontalOffset: x, verticalOffset: y, threshold: t.centered }, "tentative", "low"));
    } else {
      const diagonal = Math.abs(x) >= t.diagonalComponent && Math.abs(y) >= t.diagonalComponent;
      const code: ObservationCode = diagonal
        ? y > 0 ? x < 0 ? "OFFSET_HIGH_LEFT" : "OFFSET_HIGH_RIGHT"
          : x < 0 ? "OFFSET_LOW_LEFT" : "OFFSET_LOW_RIGHT"
        : Math.abs(x) >= Math.abs(y) ? x < 0 ? "OFFSET_LEFT" : "OFFSET_RIGHT"
          : y < 0 ? "OFFSET_LOW" : "OFFSET_HIGH";
      geometric.push(make(code, "primary", { horizontalOffset: x, verticalOffset: y,
        centeredThreshold: t.centered, diagonalComponentThreshold: t.diagonalComponent },
      undefined, magnitude(distance, t.offsetMagnitude)));
    }
  }

  const minimumShapeImpactCount = principalGroup
    ? observationThresholds.minimum.cautiousShape
    : observationThresholds.minimum.shape;
  if (analyzedImpactCount < minimumShapeImpactCount) {
    geometric.push(make("SHAPE_UNDETERMINED", geometric.length ? "secondary" : "primary",
      { includedImpactCount: analyzedImpactCount,
        minimumImpactCount: minimumShapeImpactCount }, "insufficient_data"));
    if (metrics.includedImpactCount < 3) limitations.push(make("INSUFFICIENT_IMPACTS", "limitation",
      { includedImpactCount: metrics.includedImpactCount }, "insufficient_data"));
  } else {
    const width = values.spreadWidth!;
    const height = values.spreadHeight!;
    const extreme = values.extremeSpread!;
    const compact = width <= t.compactAxis && height <= t.compactAxis;
    const wide = width >= t.wideAxis || height >= t.wideAxis || extreme >= t.wideExtremeSpread;
    const orientedShape: ObservationCode =
      width / Math.max(height, Number.EPSILON) >= observationThresholds.axisRatio ? "HORIZONTAL_SPREAD"
      : height / Math.max(width, Number.EPSILON) >= observationThresholds.axisRatio ? "VERTICAL_SPREAD"
      : "TWO_AXIS_SPREAD";
    const shape: ObservationCode = compact ? "COMPACT_GROUP" : wide ? "WIDE_GROUP"
      : orientedShape;
    geometric.push(make(shape, "secondary", { spreadWidth: width, spreadHeight: height,
      extremeSpread: extreme, axisRatioThreshold: observationThresholds.axisRatio,
      compactAxisThreshold: t.compactAxis, wideAxisThreshold: t.wideAxis }));
    if (wide && orientedShape !== "TWO_AXIS_SPREAD") {
      geometric.push(make(orientedShape, "secondary", {
        spreadWidth: width, spreadHeight: height, axisRatioThreshold: observationThresholds.axisRatio,
      }));
    }
    const centered = geometric[0]?.observationCode === "CENTERED";
    const combined: ObservationCode = compact
      ? centered ? "CENTERED_AND_COMPACT" : "COMPACT_BUT_OFFSET"
      : wide ? centered ? "CENTERED_BUT_DISPERSED" : "OFFSET_AND_DISPERSED"
      : geometric[0].observationCode;
    if (combined !== geometric[0].observationCode) {
      geometric.unshift(make(combined, "primary", { derivedFrom: [geometric[0].observationCode, shape] }));
      geometric[1] = { ...geometric[1], rank: "secondary" };
    }
  }

  if (significantAtypicalImpact) {
    const outlierIsPrimary = Boolean(principalGroup)
      && geometric[0]?.observationCode === "CENTERED_AND_COMPACT";
    const outlier = make("OUTLIER_TO_VERIFY", outlierIsPrimary ? "primary" : "secondary", {
      impactIds: metrics.potentiallyAtypicalImpactIds,
      globalMetricsRemainInclusive: true,
      minimumMeaningfulSeparation: observationThresholds.normalized.centered,
    });
    if (outlierIsPrimary) {
      geometric[0] = { ...geometric[0], rank: "secondary" };
      geometric.unshift(outlier);
    } else {
      geometric.push(outlier);
    }
  }
  if (metrics.excludedImpactCount) limitations.push(make("EXCLUDED_IMPACTS_PRESENT", "limitation",
    { excludedImpactCount: metrics.excludedImpactCount }));
  if (metrics.recordedShotCount !== metrics.totalImpactCount) limitations.push(make("SHOT_COUNT_MISMATCH", "limitation",
    { recordedShotCount: metrics.recordedShotCount, impactCount: metrics.totalImpactCount }));
  limitations.push(make("MANUAL_INPUT_LIMITATION", "limitation"));
  if (!metrics.physicalMm) limitations.push(make("TARGET_GEOMETRY_UNVERIFIED", "limitation"));
  const [primary, ...rest] = geometric;
  return { primary: primary ?? null, secondary: rest.slice(0, 3), limitations };
}

export function observeComparison(input: {
  comparison: SeriesComparison; generatedAt?: string;
}): ObservationResult {
  const comparison = input.comparison;
  const at = input.generatedAt ?? new Date().toISOString();
  const confidenceLevel: ObservationConfidence =
    comparison.reliability === "reinforced" ? "high" : comparison.reliability === "acceptable" ? "medium" : "low";
  const make = (code: ObservationCode, rank: ObservationRank, metrics: Record<string, unknown> = {}) =>
    base({ code, sessionId: comparison.sessionId, comparisonId: comparison.id, scope: "comparison",
      rank, confidence: confidenceLevel, metrics, limitations: comparison.limitations,
      sourceVersion: comparison.algorithmVersion, generatedAt: at });
  if (comparison.status === "not_comparable") return {
    primary: make("COMPARISON_LIMITED", "primary", { reasons: comparison.reasons }),
    secondary: [], limitations: [],
  };
  const selected: ObservationDraft[] = [];
  const center = comparison.differences.centroidDistanceToTargetCenter;
  if (center) selected.push(make(center.variation === "stable" ? "CENTER_POSITION_STABLE"
    : center.delta < 0 ? "CENTER_MOVED_CLOSER" : "CENTER_MOVED_FARTHER", "primary", { ...center }));
  const spread = comparison.differences.extremeSpread;
  if (spread) selected.push(make(spread.variation === "stable" ? "DISPERSION_STABLE"
    : spread.delta < 0 ? "GROUP_TIGHTER" : "GROUP_WIDER", selected.length ? "secondary" : "primary", { ...spread }));
  if (comparison.shape.changed) selected.push(make("SHAPE_CHANGED", "secondary", comparison.shape));
  const width = comparison.differences.spreadWidth;
  if (width && width.variation !== "stable") selected.push(make(
    width.delta < 0 ? "HORIZONTAL_SPREAD_REDUCED" : "HORIZONTAL_SPREAD_INCREASED", "secondary", { ...width }));
  const height = comparison.differences.spreadHeight;
  if (height && height.variation !== "stable") selected.push(make(
    height.delta < 0 ? "VERTICAL_SPREAD_REDUCED" : "VERTICAL_SPREAD_INCREASED", "secondary", { ...height }));
  const notable = Object.values(comparison.differences).some((item) => item?.variation === "notable");
  if (!notable && selected.every((item) =>
    ["CENTER_POSITION_STABLE", "DISPERSION_STABLE"].includes(item.observationCode))) {
    selected.unshift(make("NO_NOTABLE_CHANGE", "primary"));
  }
  const limitation = comparison.status === "partially_comparable" || comparison.limitations.length
    ? [make("COMPARISON_LIMITED", "limitation")] : [];
  return { primary: selected[0] ?? null, secondary: selected.slice(1, 4), limitations: limitation };
}

export function repeatedSessionObservations(input: {
  sessionId: string; bySeries: Array<{ seriesId: string; sequenceNumber: number; observations: ObservationResult }>;
  generatedAt?: string;
}): ObservationDraft[] {
  const at = input.generatedAt ?? new Date().toISOString();
  const occurrences = new Map<ObservationCode, Array<{ seriesId: string; sequenceNumber: number }>>();
  for (const item of input.bySeries) {
    for (const observation of [item.observations.primary, ...item.observations.secondary]) {
      if (!observation || observation.category === "combined" || observation.category === "data_quality") continue;
      const values = occurrences.get(observation.observationCode) ?? [];
      values.push({ seriesId: item.seriesId, sequenceNumber: item.sequenceNumber });
      occurrences.set(observation.observationCode, values);
    }
  }
  return [...occurrences.entries()].filter(([, values]) => values.length >= 2).map(([code, values]) =>
    base({ code, sessionId: input.sessionId, scope: "session_pattern", rank: "secondary",
      confidence: "medium", metrics: { occurrences: values.length, series: values },
      limitations: ["Répétition limitée à la séance en cours."], sourceVersion: OBSERVATION_ALGORITHM_VERSION,
      generatedAt: at }));
}
