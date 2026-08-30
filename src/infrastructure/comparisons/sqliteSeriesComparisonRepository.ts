import { ComparisonOption, SeriesComparisonRepository } from "../../application/seriesComparisonRepository";
import {
  ComparableSeriesContext, ComparisonType, SeriesComparison, compareSeries,
} from "../../domain/seriesComparison";
import { SeriesStatus } from "../../domain/series";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "../../domain/targetCoordinateConversion";
import { Database } from "../database/types";
import { SqliteSeriesMetricsRepository } from "../metrics/sqliteSeriesMetricsRepository";

interface ContextRow {
  id: string; session_id: string; status: SeriesStatus; sequence_number: number; type: string;
  weapon_id: string; distance_mm: number; target_type_id: string;
  number_of_hands: 1 | 2 | null;
  target_width_mm_snapshot: number | null; target_height_mm_snapshot: number | null;
}
interface ComparisonRow { result_json: string }
const contextSql = `SELECT se.id, se.session_id, se.status, se.sequence_number, se.type,
  s.weapon_id, s.distance_mm, s.number_of_hands, s.target_type_id, s.target_width_mm_snapshot, s.target_height_mm_snapshot
  FROM series se JOIN sessions s ON s.id = se.session_id`;

function geometryVersion(row: ContextRow) {
  return row.target_width_mm_snapshot != null && row.target_height_mm_snapshot != null
    ? "session-target-dimensions-v1" : UNVERIFIED_TARGET_GEOMETRY_VERSION;
}
function context(row: ContextRow): ComparableSeriesContext {
  return {
    id: row.id, sessionId: row.session_id, status: row.status, weaponId: row.weapon_id,
    distanceMm: row.distance_mm, numberOfHands: row.number_of_hands, targetTypeId: row.target_type_id,
    targetGeometryVersion: geometryVersion(row),
  };
}

export class SqliteSeriesComparisonRepository implements SeriesComparisonRepository {
  private readonly metrics: SqliteSeriesMetricsRepository;
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {
    this.metrics = new SqliteSeriesMetricsRepository(database, createId, now);
  }

  async getOptions(comparedSeriesId: string): Promise<ComparisonOption[]> {
    const current = await this.database.getFirstAsync<ContextRow>(`${contextSql} WHERE se.id = ?`, comparedSeriesId);
    if (!current || current.status !== "completed") return [];
    const completed = await this.database.getAllAsync<ContextRow>(
      `${contextSql} WHERE se.session_id = ? AND se.status = 'completed' AND se.sequence_number < ?
       ORDER BY se.sequence_number ASC`, current.session_id, current.sequence_number,
    );
    const options: ComparisonOption[] = [];
    const reference = completed.find((item) => item.type === "reference");
    const previous = completed.at(-1);
    if (reference) options.push({ type: "reference", baselineSeriesId: reference.id, baselineSequenceNumber: reference.sequence_number });
    if (previous && previous.id !== reference?.id) {
      options.push({ type: "previous", baselineSeriesId: previous.id, baselineSequenceNumber: previous.sequence_number });
    } else if (previous) {
      options.push({ type: "previous", baselineSeriesId: previous.id, baselineSequenceNumber: previous.sequence_number });
    }
    return options;
  }

  async compareAndSave(baselineSeriesId: string, comparedSeriesId: string, type: ComparisonType): Promise<SeriesComparison> {
    const baseline = await this.database.getFirstAsync<ContextRow>(`${contextSql} WHERE se.id = ?`, baselineSeriesId);
    const compared = await this.database.getFirstAsync<ContextRow>(`${contextSql} WHERE se.id = ?`, comparedSeriesId);
    if (!baseline || !compared) throw new Error("Série introuvable.");
    // Les impacts d'une série terminée sont immuables. Réutiliser les métriques persistées
    // évite de déclencher leurs triggers d'invalidation lors d'une simple consultation.
    const baselineMetrics = await this.metrics.getLatest(baselineSeriesId)
      ?? await this.metrics.calculateAndSave(baselineSeriesId);
    const comparedMetrics = await this.metrics.getLatest(comparedSeriesId)
      ?? await this.metrics.calculateAndSave(comparedSeriesId);
    const computedAt = this.now();
    const draft = compareSeries({ baseline: context(baseline), compared: context(compared),
      baselineMetrics, comparedMetrics, comparisonType: type });
    const existing = await this.database.getFirstAsync<{ id: string }>(
      `SELECT id FROM series_comparisons
       WHERE baseline_series_id = ? AND compared_series_id = ?
         AND comparison_type = ? AND algorithm_version = ?`,
      baselineSeriesId, comparedSeriesId, type, draft.algorithmVersion,
    );
    const id = existing?.id ?? this.createId();
    const result: SeriesComparison = { id, computedAt, ...draft };
    await this.database.runAsync(
      `INSERT INTO series_comparisons (
        id, session_id, baseline_series_id, compared_series_id, comparison_type, status,
        algorithm_version, thresholds_version, baseline_metrics_version, compared_metrics_version,
        result_json, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(baseline_series_id, compared_series_id, comparison_type, algorithm_version)
      DO UPDATE SET status=excluded.status, thresholds_version=excluded.thresholds_version,
        baseline_metrics_version=excluded.baseline_metrics_version,
        compared_metrics_version=excluded.compared_metrics_version,
        result_json=excluded.result_json, computed_at=excluded.computed_at`,
      id, result.sessionId, baselineSeriesId, comparedSeriesId, type, result.status,
      result.algorithmVersion, result.thresholdsVersion, result.baselineMetricsVersion,
      result.comparedMetricsVersion, JSON.stringify(result), computedAt,
    );
    return result;
  }

  async getById(id: string): Promise<SeriesComparison | null> {
    const row = await this.database.getFirstAsync<ComparisonRow>(
      "SELECT result_json FROM series_comparisons WHERE id = ?", id,
    );
    return row ? JSON.parse(row.result_json) as SeriesComparison : null;
  }
  async listBySession(sessionId: string): Promise<SeriesComparison[]> {
    const rows = await this.database.getAllAsync<ComparisonRow>(
      "SELECT result_json FROM series_comparisons WHERE session_id = ? ORDER BY computed_at", sessionId,
    );
    return rows.map((row) => JSON.parse(row.result_json) as SeriesComparison);
  }
  async invalidateForSeries(seriesId: string): Promise<void> {
    await this.database.runAsync(
      "DELETE FROM series_comparisons WHERE baseline_series_id = ? OR compared_series_id = ?",
      seriesId, seriesId,
    );
  }
}
