import { describe, expect, it } from "vitest";
import { Database, SqlParameter } from "../database/types";
import { SqliteSeriesComparisonRepository } from "./sqliteSeriesComparisonRepository";

class FakeDatabase implements Database {
  comparisonJson: string | null = null;
  deleted = false;
  rejectMetricRewrite = false;
  metricWrites = 0;
  metrics: Record<string, Record<string, unknown>> = {};
  comparisonIds: Record<string, string> = {};
  contexts: Record<string, Record<string, unknown>> = {
    a: { id: "a", session_id: "s", status: "completed", sequence_number: 1, type: "reference",
      weapon_id: "glock-19", distance_mm: 10000, number_of_hands: 2, target_type_id: "fftir",
      target_width_mm_snapshot: null, target_height_mm_snapshot: null },
    b: { id: "b", session_id: "s", status: "completed", sequence_number: 2, type: "corrective",
      weapon_id: "glock-19", distance_mm: 10000, number_of_hands: 2, target_type_id: "fftir",
      target_width_mm_snapshot: null, target_height_mm_snapshot: null },
  };
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T | null> {
    if (sql.includes("FROM series_metrics WHERE series_id = ?")) {
      return (this.metrics[String(params[0])] ?? null) as T | null;
    }
    if (sql.includes("SELECT id FROM series_comparisons")) {
      const id = this.comparisonIds[String(params[2])];
      return (id ? { id } : null) as T | null;
    }
    if (sql.includes("se.expected_shot_count")) {
      return { expected_shot_count: 5, recorded_shot_count: 5,
        target_width_mm_snapshot: null, target_height_mm_snapshot: null } as T;
    }
    if (sql.includes("FROM series se JOIN sessions") && sql.includes("se.id = ?")) {
      return (this.contexts[String(params[0])] ?? null) as T | null;
    }
    if (sql.includes("FROM series_comparisons WHERE id")) {
      return this.comparisonJson ? { result_json: this.comparisonJson } as T : null;
    }
    return null;
  }
  async getAllAsync<T>(sql: string, ..._params: SqlParameter[]): Promise<T[]> {
    if (sql.includes("SELECT id, normalized_x")) {
      return [1,2,3,4,5].map((value) => ({
        id: String(value), normalized_x: .4 + value * .02,
        normalized_y: .45 + value * .01, is_excluded: 0,
      })) as T[];
    }
    if (sql.includes("se.sequence_number <")) return [this.contexts.a] as T[];
    if (sql.includes("FROM series_comparisons")) {
      return this.comparisonJson ? [{ result_json: this.comparisonJson }] as T[] : [];
    }
    return [];
  }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("INSERT INTO series_metrics")) {
      this.metricWrites += 1;
      if (this.rejectMetricRewrite) {
        throw new Error("FOREIGN KEY constraint failed: confirmation_test_runs.hypothesis_id");
      }
    }
    if (sql.includes("INSERT INTO series_comparisons")) {
      this.comparisonJson = String(params[10]);
      this.comparisonIds[String(params[4])] ??= String(params[0]);
    }
    if (sql.includes("DELETE FROM series_comparisons")) { this.deleted = true; this.comparisonJson = null; }
    return { changes: 1 };
  }
}

const cachedMetrics = {
  algorithm_version: "series-metrics-v1", target_geometry_version: "unverified-target-geometry-v1",
  included_impact_ids_json: '["1","2","3","4","5"]', included_impact_count: 5,
  excluded_impact_count: 0, centroid_x: .46, centroid_y: .48, horizontal_offset: -.04,
  vertical_offset: .02, centroid_distance_to_target_center: .045, spread_width: .08,
  spread_height: .04, extreme_spread: .09, mean_radius: .03, radial_standard_deviation: .01,
  mean_distance_to_target_center: .05, physical_metrics_json: null,
  shape_classification: "compact", potentially_atypical_impact_ids_json: "[]",
  computed_at: "2026-08-25T05:00:00.000Z",
};

describe("SqliteSeriesComparisonRepository", () => {
  it("ordonne et propose la référence puis la précédente", async () => {
    const db = new FakeDatabase();
    const repo = new SqliteSeriesComparisonRepository(db, () => "id");
    const options = await repo.getOptions("b");
    expect(options.map((item) => item.type)).toEqual(["reference", "previous"]);
    expect(options.every((item) => item.baselineSequenceNumber === 1)).toBe(true);
  });
  it("persiste puis relit une comparaison", async () => {
    const db = new FakeDatabase();
    const repo = new SqliteSeriesComparisonRepository(db, () => "comparison-id", () => "2026-07-29T10:00:00Z");
    const saved = await repo.compareAndSave("a", "b", "reference");
    const read = await repo.getById("comparison-id");
    expect(saved.status).toBe("comparable");
    expect(read).toEqual(saved);
    expect((await repo.listBySession("s"))[0]).toEqual(saved);
  });
  it("invalide toutes les comparaisons liées à une série", async () => {
    const db = new FakeDatabase();
    const repo = new SqliteSeriesComparisonRepository(db, () => "id");
    await repo.invalidateForSeries("a");
    expect(db.deleted).toBe(true);
  });
  it("sépare deux séances et ne calcule aucune conclusion métrique", async () => {
    const db = new FakeDatabase();
    db.contexts.b = { ...db.contexts.b, session_id: "other" };
    const repo = new SqliteSeriesComparisonRepository(db, () => "id");
    const result = await repo.compareAndSave("a", "b", "manual");
    expect(result.status).toBe("not_comparable");
    expect(result.differences).toEqual({});
  });
  it("ne propose rien pour une série active", async () => {
    const db = new FakeDatabase();
    db.contexts.b = { ...db.contexts.b, status: "active" };
    const repo = new SqliteSeriesComparisonRepository(db, () => "id");
    expect(await repo.getOptions("b")).toEqual([]);
  });
  it("compare série 2 à série 1 sans réécrire les métriques déjà persistées ni déclencher la FK", async () => {
    const db = new FakeDatabase();
    db.metrics = { a: cachedMetrics, b: { ...cachedMetrics, centroid_x: .47, horizontal_offset: -.03 } };
    db.rejectMetricRewrite = true;
    let id = 0;
    const repo = new SqliteSeriesComparisonRepository(db, () => `comparison-${++id}`, () => "2026-08-25T05:01:00.000Z");

    const reference = await repo.compareAndSave("a", "b", "reference");
    expect(reference).toMatchObject({
      baselineSeriesId: "a", comparedSeriesId: "b", comparisonType: "reference",
    });
    await expect(repo.compareAndSave("a", "b", "reference")).resolves.toMatchObject({ id: reference.id });
    await expect(repo.compareAndSave("a", "b", "previous")).resolves.toMatchObject({
      baselineSeriesId: "a", comparedSeriesId: "b", comparisonType: "previous",
    });
    expect(db.metricWrites).toBe(0);
  });
});
