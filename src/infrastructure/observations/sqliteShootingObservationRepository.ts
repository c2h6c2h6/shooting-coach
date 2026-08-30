import { ShootingObservationRepository } from "../../application/shootingObservationRepository";
import {
  ObservationDraft, ObservationResult, repeatedSessionObservations, ShootingObservation,
  observeComparison, observeSeries,
} from "../../domain/shootingObservation";
import { SeriesComparison } from "../../domain/seriesComparison";
import { Database } from "../database/types";
import { SqliteSeriesMetricsRepository } from "../metrics/sqliteSeriesMetricsRepository";

interface ObservationRow { result_json: string }
interface SeriesRow { id: string; session_id: string; sequence_number: number; status: string }
interface ComparisonRow { result_json: string }

export class SqliteShootingObservationRepository implements ShootingObservationRepository {
  private readonly metrics;
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {
    this.metrics = new SqliteSeriesMetricsRepository(database, createId, now);
  }

  private async persist(result: ObservationResult): Promise<ObservationResult> {
    const drafts = [result.primary, ...result.secondary, ...result.limitations]
      .filter((item): item is ObservationDraft => item !== null);
    const seriesId = drafts[0]?.seriesId ?? null;
    const comparisonId = drafts[0]?.comparisonId ?? null;
    if (seriesId) await this.database.runAsync("DELETE FROM shooting_observations WHERE series_id = ? AND scope = 'single_series'", seriesId);
    if (comparisonId) await this.database.runAsync("DELETE FROM shooting_observations WHERE comparison_id = ? AND scope = 'comparison'", comparisonId);
    const saved: ShootingObservation[] = [];
    for (const draft of drafts) {
      const observation: ShootingObservation = { id: this.createId(), ...draft };
      await this.database.runAsync(
        `INSERT INTO shooting_observations (
          id, session_id, series_id, comparison_id, observation_code, category, scope, status,
          magnitude, confidence_level, rank, algorithm_version, ruleset_version,
          thresholds_version, source_version, supporting_metrics_json, limiting_factors_json,
          generated_at, result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        observation.id, observation.sessionId, observation.seriesId, observation.comparisonId,
        observation.observationCode, observation.category, observation.scope, observation.status,
        observation.magnitude, observation.confidenceLevel, observation.rank,
        observation.algorithmVersion, observation.rulesetVersion, observation.thresholdsVersion,
        observation.sourceVersion, JSON.stringify(observation.supportingMetrics),
        JSON.stringify(observation.limitingFactors), observation.generatedAt,
        JSON.stringify(observation),
      );
      saved.push(observation);
    }
    return {
      primary: saved.find((item) => item.rank === "primary") ?? null,
      secondary: saved.filter((item) => item.rank === "secondary"),
      limitations: saved.filter((item) => item.rank === "limitation"),
    };
  }

  async generateForSeries(seriesId: string) {
    const series = await this.database.getFirstAsync<SeriesRow>(
      "SELECT id, session_id, sequence_number, status FROM series WHERE id = ?", seriesId);
    if (!series) throw new Error("Série introuvable.");
    if (series.status !== "completed") throw new Error("Les observations sont générées pour une série terminée.");
    const metrics = await this.metrics.getLatest(seriesId)
      ?? await this.metrics.calculateAndSave(seriesId);
    return this.persist(observeSeries({
      sessionId: series.session_id, seriesId, metrics, generatedAt: this.now(),
    }));
  }

  async generateForComparison(comparisonId: string) {
    const row = await this.database.getFirstAsync<ComparisonRow>(
      "SELECT result_json FROM series_comparisons WHERE id = ?", comparisonId);
    if (!row) throw new Error("Comparaison introuvable.");
    return this.persist(observeComparison({
      comparison: JSON.parse(row.result_json) as SeriesComparison, generatedAt: this.now(),
    }));
  }

  async listBySeries(seriesId: string) {
    const rows = await this.database.getAllAsync<ObservationRow>(
      `SELECT result_json FROM shooting_observations
       WHERE series_id = ? AND scope = 'single_series' ORDER BY generated_at, rank`,
      seriesId,
    );
    return rows.map((row) => JSON.parse(row.result_json) as ShootingObservation);
  }

  async listRepeatedForSession(sessionId: string) {
    const persistedPatterns = await this.database.getAllAsync<ObservationRow>(
      `SELECT result_json FROM shooting_observations
       WHERE session_id = ? AND scope = 'session_pattern' ORDER BY generated_at, rank`,
      sessionId,
    );
    if (persistedPatterns.length) {
      return persistedPatterns.map((row) => JSON.parse(row.result_json) as ShootingObservation);
    }
    const series = await this.database.getAllAsync<SeriesRow>(
      "SELECT id, session_id, sequence_number, status FROM series WHERE session_id = ? AND status = 'completed' ORDER BY sequence_number",
      sessionId,
    );
    const bySeries = [];
    for (const item of series) {
      const persisted = await this.listBySeries(item.id);
      const observations: ObservationResult = persisted.length ? {
        primary: persisted.find((observation) => observation.rank === "primary") ?? null,
        secondary: persisted.filter((observation) => observation.rank === "secondary"),
        limitations: persisted.filter((observation) => observation.rank === "limitation"),
      } : await this.generateForSeries(item.id);
      bySeries.push({ seriesId: item.id, sequenceNumber: item.sequence_number,
        observations });
    }
    const drafts = repeatedSessionObservations({ sessionId, bySeries, generatedAt: this.now() });
    const saved: ShootingObservation[] = [];
    for (const draft of drafts) {
      const observation: ShootingObservation = { id: this.createId(), ...draft };
      await this.database.runAsync(
        `INSERT INTO shooting_observations (
          id, session_id, series_id, comparison_id, observation_code, category, scope, status,
          magnitude, confidence_level, rank, algorithm_version, ruleset_version,
          thresholds_version, source_version, supporting_metrics_json, limiting_factors_json,
          generated_at, result_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        observation.id, observation.sessionId, null, null, observation.observationCode,
        observation.category, observation.scope, observation.status, observation.magnitude,
        observation.confidenceLevel, observation.rank, observation.algorithmVersion,
        observation.rulesetVersion, observation.thresholdsVersion, observation.sourceVersion,
        JSON.stringify(observation.supportingMetrics), JSON.stringify(observation.limitingFactors),
        observation.generatedAt, JSON.stringify(observation),
      );
      saved.push(observation);
    }
    return saved;
  }

  async invalidateForSeries(seriesId: string) {
    await this.database.runAsync(
      `DELETE FROM shooting_observations WHERE series_id = ? OR comparison_id IN (
        SELECT id FROM series_comparisons WHERE baseline_series_id = ? OR compared_series_id = ?
      )`, seriesId, seriesId, seriesId);
  }
}
