import {
  normalizedToLogical,
  normalizedToPhysical,
  TargetGeometry,
} from "./targetCoordinateConversion";

export const SERIES_METRICS_ALGORITHM_VERSION = "series-metrics-v1";
export const MIN_IMPACTS_FOR_SHAPE = 3;
export const MIN_IMPACTS_FOR_ATYPICAL = 5;

export type ShapeClassification =
  | "indeterminate"
  | "compact"
  | "horizontal"
  | "vertical"
  | "both_axes";

export interface MetricImpact {
  id: string;
  normalizedX: number;
  normalizedY: number;
  isExcluded: boolean;
}

export interface PointMetrics {
  centroidX: number | null;
  centroidY: number | null;
  horizontalOffset: number | null;
  verticalOffset: number | null;
  centroidDistanceToTargetCenter: number | null;
  spreadWidth: number | null;
  spreadHeight: number | null;
  extremeSpread: number | null;
  meanRadius: number | null;
  radialStandardDeviation: number | null;
  meanDistanceToTargetCenter: number | null;
}

export interface SeriesMetrics {
  algorithmVersion: string;
  targetGeometryVersion: string;
  computedAt: string;
  totalImpactCount: number;
  includedImpactCount: number;
  excludedImpactCount: number;
  expectedShotCount: number;
  recordedShotCount: number;
  includedImpactIds: string[];
  normalized: PointMetrics;
  physicalMm: PointMetrics | null;
  shapeClassification: ShapeClassification;
  potentiallyAtypicalImpactIds: string[];
  principalGroup?: PrincipalGroupMetrics | null;
}

export interface PrincipalGroupMetrics {
  impactIds: string[];
  normalized: PointMetrics;
  physicalMm: PointMetrics | null;
  shapeClassification: ShapeClassification;
}

const empty: PointMetrics = {
  centroidX: null, centroidY: null, horizontalOffset: null, verticalOffset: null,
  centroidDistanceToTargetCenter: null, spreadWidth: null, spreadHeight: null,
  extremeSpread: null, meanRadius: null, radialStandardDeviation: null,
  meanDistanceToTargetCenter: null,
};

interface Point { id: string; x: number; y: number }

function distance(a: Pick<Point, "x" | "y">, b: Pick<Point, "x" | "y">) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function calculate(points: Point[]): PointMetrics {
  if (points.length === 0) return { ...empty };
  const centroid = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
  const center = { x: 0, y: 0 };
  const radii = points.map((point) => distance(point, centroid));
  const meanRadius = radii.reduce((sum, value) => sum + value, 0) / radii.length;
  let extremeSpread: number | null = null;
  if (points.length >= 2) {
    extremeSpread = 0;
    for (let a = 0; a < points.length; a += 1) {
      for (let b = a + 1; b < points.length; b += 1) {
        extremeSpread = Math.max(extremeSpread, distance(points[a], points[b]));
      }
    }
  }
  return {
    centroidX: centroid.x,
    centroidY: centroid.y,
    horizontalOffset: centroid.x,
    verticalOffset: centroid.y,
    centroidDistanceToTargetCenter: distance(centroid, center),
    spreadWidth: points.length >= 2
      ? Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x))
      : null,
    spreadHeight: points.length >= 2
      ? Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y))
      : null,
    extremeSpread,
    meanRadius: points.length >= 2 ? meanRadius : null,
    radialStandardDeviation: points.length >= 2
      ? Math.sqrt(radii.reduce((sum, value) => sum + (value - meanRadius) ** 2, 0) / radii.length)
      : null,
    meanDistanceToTargetCenter:
      points.reduce((sum, point) => sum + distance(point, center), 0) / points.length,
  };
}

// Seuils provisoires v1 : forme à partir de 3 impacts ; rapport d’axes >= 1,5.
// « compacte » signifie ici que largeur et hauteur sont chacune <= 20 % de la zone.
function classify(metrics: PointMetrics, count: number): ShapeClassification {
  if (count < MIN_IMPACTS_FOR_SHAPE || metrics.spreadWidth == null || metrics.spreadHeight == null) {
    return "indeterminate";
  }
  const width = metrics.spreadWidth;
  const height = metrics.spreadHeight;
  if (width <= 0.2 && height <= 0.2) return "compact";
  if (height === 0 || width / height >= 1.5) return "horizontal";
  if (width === 0 || height / width >= 1.5) return "vertical";
  return "both_axes";
}

// Signal prudent par médiane des distances au centroïde : distance > 2,5 × médiane,
// uniquement à partir de 5 impacts. Aucun impact n’est exclu par cette fonction.
function findPotentiallyAtypical(points: Point[]): string[] {
  if (points.length < MIN_IMPACTS_FOR_ATYPICAL) return [];
  const centroid = {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
  };
  const ranked = points.map((point) => ({ id: point.id, value: distance(point, centroid) }))
    .sort((a, b) => a.value - b.value);
  const middle = Math.floor(ranked.length / 2);
  const median = ranked.length % 2
    ? ranked[middle].value
    : (ranked[middle - 1].value + ranked[middle].value) / 2;
  if (median === 0) return ranked.filter((item) => item.value > 0).map((item) => item.id);
  return ranked.filter((item) => item.value > median * 2.5).map((item) => item.id);
}

export function calculatePrincipalGroupMetrics(input: {
  impacts: MetricImpact[];
  geometry: TargetGeometry;
  potentiallyAtypicalImpactIds: readonly string[];
}): PrincipalGroupMetrics | null {
  if (input.potentiallyAtypicalImpactIds.length !== 1) return null;
  const atypicalIds = new Set(input.potentiallyAtypicalImpactIds);
  const included = input.impacts.filter((impact) => !impact.isExcluded && !atypicalIds.has(impact.id));
  if (included.length < MIN_IMPACTS_FOR_SHAPE) return null;
  const normalizedPoints = included.map((impact) => ({
    id: impact.id,
    ...normalizedToLogical({ x: impact.normalizedX, y: impact.normalizedY }, input.geometry),
  }));
  const physicalPoints = included.map((impact) => {
    const point = normalizedToPhysical(
      { x: impact.normalizedX, y: impact.normalizedY },
      input.geometry,
    );
    return point ? { id: impact.id, ...point } : null;
  });
  const normalized = calculate(normalizedPoints);
  return {
    impactIds: included.map((impact) => impact.id),
    normalized,
    physicalMm: physicalPoints.length > 0 && physicalPoints.every((point) => point !== null)
      ? calculate(physicalPoints as Point[])
      : null,
    shapeClassification: classify(normalized, included.length),
  };
}

export function calculateSeriesMetrics(input: {
  impacts: MetricImpact[];
  expectedShotCount: number;
  recordedShotCount: number;
  geometry: TargetGeometry;
  computedAt?: string;
}): SeriesMetrics {
  const included = input.impacts.filter((impact) => !impact.isExcluded);
  const normalizedPoints: Point[] = included.map((impact) => {
    const point = normalizedToLogical(
      { x: impact.normalizedX, y: impact.normalizedY },
      input.geometry,
    );
    return { id: impact.id, ...point };
  });
  const physicalPoints = included.map((impact) => {
    const point = normalizedToPhysical(
      { x: impact.normalizedX, y: impact.normalizedY },
      input.geometry,
    );
    return point ? { id: impact.id, ...point } : null;
  });
  const normalized = calculate(normalizedPoints);
  const potentiallyAtypicalImpactIds = findPotentiallyAtypical(normalizedPoints);
  return {
    algorithmVersion: SERIES_METRICS_ALGORITHM_VERSION,
    targetGeometryVersion: input.geometry.version,
    computedAt: input.computedAt ?? new Date().toISOString(),
    totalImpactCount: input.impacts.length,
    includedImpactCount: included.length,
    excludedImpactCount: input.impacts.length - included.length,
    expectedShotCount: input.expectedShotCount,
    recordedShotCount: input.recordedShotCount,
    includedImpactIds: included.map((impact) => impact.id),
    normalized,
    physicalMm: physicalPoints.length > 0 && physicalPoints.every((point) => point !== null)
      ? calculate(physicalPoints as Point[])
      : null,
    shapeClassification: classify(normalized, included.length),
    potentiallyAtypicalImpactIds,
    principalGroup: calculatePrincipalGroupMetrics({
      impacts: input.impacts,
      geometry: input.geometry,
      potentiallyAtypicalImpactIds,
    }),
  };
}
