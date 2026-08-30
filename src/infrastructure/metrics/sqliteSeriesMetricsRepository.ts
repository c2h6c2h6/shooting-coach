import { SeriesMetricsRepository } from "../../application/seriesMetricsRepository";
import {
  calculateSeriesMetrics,
  calculatePrincipalGroupMetrics,
  PointMetrics,
  SeriesMetrics,
  ShapeClassification,
} from "../../domain/seriesMetrics";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "../../domain/targetCoordinateConversion";
import { Database } from "../database/types";

interface ContextRow {
  expected_shot_count: number;
  recorded_shot_count: number;
  target_width_mm_snapshot: number | null;
  target_height_mm_snapshot: number | null;
}
interface ImpactRow { id: string; normalized_x: number; normalized_y: number; is_excluded: number }
interface MetricRow {
  algorithm_version: string; target_geometry_version: string; included_impact_ids_json: string;
  included_impact_count: number; excluded_impact_count: number; centroid_x: number | null;
  centroid_y: number | null; horizontal_offset: number | null; vertical_offset: number | null;
  centroid_distance_to_target_center: number | null; spread_width: number | null;
  spread_height: number | null; extreme_spread: number | null; mean_radius: number | null;
  radial_standard_deviation: number | null; mean_distance_to_target_center: number | null;
  physical_metrics_json: string | null; shape_classification: ShapeClassification;
  potentially_atypical_impact_ids_json: string; computed_at: string;
}
const metricColumns = `algorithm_version, target_geometry_version, included_impact_ids_json,
 included_impact_count, excluded_impact_count, centroid_x, centroid_y, horizontal_offset,
 vertical_offset, centroid_distance_to_target_center, spread_width, spread_height,
 extreme_spread, mean_radius, radial_standard_deviation, mean_distance_to_target_center,
 physical_metrics_json, shape_classification, potentially_atypical_impact_ids_json, computed_at`;

function pointMetrics(row: MetricRow): PointMetrics {
  return {
    centroidX: row.centroid_x, centroidY: row.centroid_y,
    horizontalOffset: row.horizontal_offset, verticalOffset: row.vertical_offset,
    centroidDistanceToTargetCenter: row.centroid_distance_to_target_center,
    spreadWidth: row.spread_width, spreadHeight: row.spread_height,
    extremeSpread: row.extreme_spread, meanRadius: row.mean_radius,
    radialStandardDeviation: row.radial_standard_deviation,
    meanDistanceToTargetCenter: row.mean_distance_to_target_center,
  };
}

export class SqliteSeriesMetricsRepository implements SeriesMetricsRepository {
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async calculateAndSave(seriesId: string): Promise<SeriesMetrics> {
    const context = await this.database.getFirstAsync<ContextRow>(
      `SELECT se.expected_shot_count, se.recorded_shot_count,
       s.target_width_mm_snapshot, s.target_height_mm_snapshot
       FROM series se JOIN sessions s ON s.id = se.session_id WHERE se.id = ?`,
      seriesId,
    );
    if (!context) throw new Error("Série introuvable.");
    const impacts = await this.database.getAllAsync<ImpactRow>(
      "SELECT id, normalized_x, normalized_y, is_excluded FROM impacts WHERE series_id = ? ORDER BY sequence_number",
      seriesId,
    );
    const hasPhysicalGeometry =
      context.target_width_mm_snapshot != null && context.target_height_mm_snapshot != null;
    const result = calculateSeriesMetrics({
      impacts: impacts.map((item) => ({
        id: item.id, normalizedX: item.normalized_x, normalizedY: item.normalized_y,
        isExcluded: item.is_excluded === 1,
      })),
      expectedShotCount: context.expected_shot_count,
      recordedShotCount: context.recorded_shot_count,
      geometry: {
        version: hasPhysicalGeometry ? "session-target-dimensions-v1" : UNVERIFIED_TARGET_GEOMETRY_VERSION,
        widthMm: context.target_width_mm_snapshot,
        heightMm: context.target_height_mm_snapshot,
        centerNormalizedX: .5,
        centerNormalizedY: .5,
      },
      computedAt: this.now(),
    });
    const n = result.normalized;
    await this.database.runAsync(
      `INSERT INTO series_metrics (id, series_id, ${metricColumns})
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(series_id, algorithm_version, target_geometry_version) DO UPDATE SET
       included_impact_ids_json=excluded.included_impact_ids_json,
       included_impact_count=excluded.included_impact_count,
       excluded_impact_count=excluded.excluded_impact_count,
       centroid_x=excluded.centroid_x, centroid_y=excluded.centroid_y,
       horizontal_offset=excluded.horizontal_offset, vertical_offset=excluded.vertical_offset,
       centroid_distance_to_target_center=excluded.centroid_distance_to_target_center,
       spread_width=excluded.spread_width, spread_height=excluded.spread_height,
       extreme_spread=excluded.extreme_spread, mean_radius=excluded.mean_radius,
       radial_standard_deviation=excluded.radial_standard_deviation,
       mean_distance_to_target_center=excluded.mean_distance_to_target_center,
       physical_metrics_json=excluded.physical_metrics_json,
       shape_classification=excluded.shape_classification,
       potentially_atypical_impact_ids_json=excluded.potentially_atypical_impact_ids_json,
       computed_at=excluded.computed_at`,
      this.createId(), seriesId, result.algorithmVersion, result.targetGeometryVersion,
      JSON.stringify(result.includedImpactIds), result.includedImpactCount, result.excludedImpactCount,
      n.centroidX, n.centroidY, n.horizontalOffset, n.verticalOffset,
      n.centroidDistanceToTargetCenter, n.spreadWidth, n.spreadHeight, n.extremeSpread,
      n.meanRadius, n.radialStandardDeviation, n.meanDistanceToTargetCenter,
      result.physicalMm ? JSON.stringify(result.physicalMm) : null, result.shapeClassification,
      JSON.stringify(result.potentiallyAtypicalImpactIds), result.computedAt,
    );
    return result;
  }

  async getLatest(seriesId: string): Promise<SeriesMetrics | null> {
    const row = await this.database.getFirstAsync<MetricRow>(
      `SELECT ${metricColumns} FROM series_metrics WHERE series_id = ? ORDER BY computed_at DESC LIMIT 1`,
      seriesId,
    );
    if (!row) return null;
    const context = await this.database.getFirstAsync<ContextRow>(
      `SELECT se.expected_shot_count, se.recorded_shot_count,
      s.target_width_mm_snapshot, s.target_height_mm_snapshot
       FROM series se JOIN sessions s ON s.id = se.session_id WHERE se.id = ?`, seriesId,
    );
    const impacts = await this.database.getAllAsync<ImpactRow>(
      "SELECT id, normalized_x, normalized_y, is_excluded FROM impacts WHERE series_id = ? ORDER BY sequence_number",
      seriesId,
    );
    const potentiallyAtypicalImpactIds = JSON.parse(row.potentially_atypical_impact_ids_json) as string[];
    const geometry = {
      version: row.target_geometry_version,
      widthMm: context?.target_width_mm_snapshot ?? null,
      heightMm: context?.target_height_mm_snapshot ?? null,
      centerNormalizedX: .5,
      centerNormalizedY: .5,
    };
    return {
      algorithmVersion: row.algorithm_version,
      targetGeometryVersion: row.target_geometry_version,
      computedAt: row.computed_at,
      totalImpactCount: row.included_impact_count + row.excluded_impact_count,
      includedImpactCount: row.included_impact_count,
      excludedImpactCount: row.excluded_impact_count,
      expectedShotCount: context?.expected_shot_count ?? 0,
      recordedShotCount: context?.recorded_shot_count ?? 0,
      includedImpactIds: JSON.parse(row.included_impact_ids_json) as string[],
      normalized: pointMetrics(row),
      physicalMm: row.physical_metrics_json ? JSON.parse(row.physical_metrics_json) as PointMetrics : null,
      shapeClassification: row.shape_classification,
      potentiallyAtypicalImpactIds,
      principalGroup: calculatePrincipalGroupMetrics({
        impacts: impacts.map((impact) => ({
          id: impact.id,
          normalizedX: impact.normalized_x,
          normalizedY: impact.normalized_y,
          isExcluded: impact.is_excluded === 1,
        })),
        geometry,
        potentiallyAtypicalImpactIds,
      }),
    };
  }

  async invalidate(seriesId: string) {
    await this.database.runAsync("DELETE FROM series_metrics WHERE series_id = ?", seriesId);
  }
}
