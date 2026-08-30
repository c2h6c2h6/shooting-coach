import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { loadSessionEvolutionMetrics } from "../../ui/sessionEvolutionMetrics";
import { SqliteSeriesComparisonRepository } from "../comparisons/sqliteSeriesComparisonRepository";
import { SqliteImpactRepository } from "../impacts/sqliteImpactRepository";
import { SqliteSeriesMetricsRepository } from "../metrics/sqliteSeriesMetricsRepository";
import { SqliteShootingObservationRepository } from "../observations/sqliteShootingObservationRepository";
import { SqliteSeriesRepository } from "../series/sqliteSeriesRepository";
import { SqliteSessionRepository } from "../sessions/sqliteSessionRepository";
import { migrateDatabase, migrations } from "./migrations";
import { Database, SqlParameter } from "./types";

class NodeSqliteDatabase implements Database {
  constructor(readonly raw = new DatabaseSync(":memory:")) {
    raw.exec("PRAGMA foreign_keys = ON");
  }
  async execAsync(sql: string) { this.raw.exec(sql); }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    const result = this.raw.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    return (this.raw.prepare(sql).get(...params) as T | undefined) ?? null;
  }
  async getAllAsync<T>(sql: string, ...params: SqlParameter[]) {
    return this.raw.prepare(sql).all(...params) as T[];
  }
  async withTransactionAsync(task: () => Promise<void>) {
    this.raw.exec("BEGIN");
    try {
      await task();
      this.raw.exec("COMMIT");
    } catch (reason) {
      this.raw.exec("ROLLBACK");
      throw reason;
    }
  }
}

const timestamp = "2026-08-25T08:00:00.000Z";

async function populatedV12(): Promise<NodeSqliteDatabase> {
  const database = new NodeSqliteDatabase();
  for (const migration of migrations.filter((item) => item.version <= 12)) database.raw.exec(migration.sql);
  database.raw.exec("PRAGMA user_version = 12");

  await database.runAsync(
    `INSERT INTO shooter_profiles(id,display_name,laterality,declared_level,primary_weapon,created_at,updated_at)
     VALUES(?,?,?,?,?,?,?)`,
    "profile-1", "Alex", "right", "beginner", "glock-19", timestamp, timestamp,
  );
  await database.runAsync(
    `INSERT INTO sessions(
      id,shooter_profile_id,mode,status,weapon_id,distance_mm,target_type_id,
      objective_type,objective_label,selected_skill_id,shooter_display_name_snapshot,
      shooter_laterality_snapshot,weapon_name_snapshot,target_type_name_snapshot,
      target_width_mm_snapshot,target_height_mm_snapshot,started_at,completed_at,
      created_at,updated_at,data_partition,synthetic_scenario_code
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    "session-legacy", "profile-1", "coaching_free", "active", "glock-19", 7000,
    "generic-centered", null, null, null, "Alex", "right", "Glock 19",
    "Cible générique centrée", null, null, timestamp, null, timestamp, timestamp, "real", null,
  );
  await database.runAsync(
    `INSERT INTO series(
      id,session_id,sequence_number,type,status,expected_shot_count,recorded_shot_count,
      instruction,pedagogical_objective,selected_skill_id,duration_seconds,cadence_type,
      notes,started_at,completed_at,created_at,updated_at
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    "series-legacy", "session-legacy", 1, "reference", "active", 5, 5,
    null, null, null, null, "free", null, timestamp, null, timestamp, timestamp,
  );
  for (let index = 1; index <= 5; index += 1) {
    await database.runAsync(
      `INSERT INTO impacts(
        id,series_id,sequence_number,normalized_x,normalized_y,target_x,target_y,
        physical_x_mm,physical_y_mm,source,confidence,is_excluded,exclusion_reason,created_at,updated_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      `impact-${index}`, "series-legacy", index, .42 + index * .02, .47 + index * .01,
      null, null, null, null, "manual", null, 0, null, timestamp, timestamp,
    );
  }
  const metrics = new SqliteSeriesMetricsRepository(database, () => "metrics-legacy", () => timestamp);
  await metrics.calculateAndSave("series-legacy");
  await database.runAsync(
    "UPDATE series SET status='completed', completed_at=?, updated_at=? WHERE id=?",
    timestamp, timestamp, "series-legacy",
  );
  let observationSequence = 0;
  const observations = new SqliteShootingObservationRepository(
    database,
    () => `observation-${++observationSequence}`,
    () => timestamp,
  );
  await observations.generateForSeries("series-legacy");
  const sourceObservationId = (await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM shooting_observations
     WHERE series_id = ? AND scope = 'single_series' AND rank = 'primary' LIMIT 1`,
    "series-legacy",
  ))?.id;
  if (!sourceObservationId) throw new Error("La fixture attend une observation primaire de référence.");
  await database.runAsync(
    `INSERT INTO series(
      id,session_id,sequence_number,type,status,expected_shot_count,recorded_shot_count,
      instruction,pedagogical_objective,selected_skill_id,duration_seconds,cadence_type,
      notes,started_at,completed_at,created_at,updated_at
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    "series-corrective", "session-legacy", 2, "corrective", "active", 5, 5,
    null, null, null, null, "free", null, timestamp, null, timestamp, timestamp,
  );
  for (let index = 1; index <= 5; index += 1) {
    await database.runAsync(
      `INSERT INTO impacts(
        id,series_id,sequence_number,normalized_x,normalized_y,target_x,target_y,
        physical_x_mm,physical_y_mm,source,confidence,is_excluded,exclusion_reason,created_at,updated_at
       ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      `corrective-impact-${index}`, "series-corrective", index, .42 + index * .02, .47 + index * .01,
      null, null, null, null, "manual", null, 0, null, timestamp, timestamp,
    );
  }
  await new SqliteSeriesMetricsRepository(database, () => "metrics-corrective", () => timestamp)
    .calculateAndSave("series-corrective");
  await database.runAsync(
    "UPDATE series SET status='completed', completed_at=?, updated_at=? WHERE id=?",
    timestamp, timestamp, "series-corrective",
  );
  await observations.generateForSeries("series-corrective");
  await database.runAsync(
    `INSERT INTO technical_hypotheses(
      id,session_id,series_id,comparison_id,observation_id,hypothesis_code,category,status,
      plausibility_level,confidence_level,rank,internal_score,supporting_evidence_json,
      contradicting_evidence_json,missing_evidence_json,applicable_context_json,source_rules_json,
      ruleset_version,generated_at,result_json
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    "hypothesis-legacy", "session-legacy", "series-legacy", null, sourceObservationId,
    "SIGHT_ALIGNMENT_ERROR", "sight", "requires_confirmation", "medium", "low", 1, 3,
    "[]", "[]", "[]", "{}", "[]", "hypothesis-rules-v1", timestamp, "{}",
  );
  await database.runAsync(
    `INSERT INTO confirmation_test_runs(
      id,session_id,source_series_id,hypothesis_id,test_code,status,started_at,completed_at,
      outcome,ruleset_version,result_json
     ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    "test-run-legacy", "session-legacy", "series-legacy", "hypothesis-legacy",
    "TEST_FIXTURE", "completed", timestamp, timestamp, "inconclusive", "coaching-rules-v1", "{}",
  );
  return database;
}

describe("QA appareil — migration SQLite 13 numberOfHands", () => {
  it("préserve une base v12 peuplée et relit les métriques sans déclencher leur UPSERT", async () => {
    const database = await populatedV12();
    await migrateDatabase(database);

    expect((await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version"))?.user_version).toBe(13);
    expect(await database.getFirstAsync("PRAGMA foreign_key_check")).toBeNull();
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM sessions"))?.count).toBe(1);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series"))?.count).toBe(2);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM impacts"))?.count).toBe(10);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series_metrics"))?.count).toBe(2);

    const session = await new SqliteSessionRepository(database, () => "unused").getById("session-legacy");
    expect(session?.numberOfHands).toBeNull();
    const series = await new SqliteSeriesRepository(database, () => "unused").listBySession("session-legacy");
    expect(series).toHaveLength(2);
    expect(series[0]).toMatchObject({ id: "series-legacy", status: "completed", recordedShotCount: 5 });
    expect(await new SqliteImpactRepository(database, () => "unused").countBySeries("series-legacy")).toBe(5);

    const repository = new SqliteSeriesMetricsRepository(database, () => "replacement-metrics", () => timestamp);
    const persisted = await repository.getLatest("series-legacy");
    expect(persisted?.includedImpactCount).toBe(5);

    let completeRuntimeError = "";
    try {
      await repository.calculateAndSave("series-legacy");
    } catch (reason) {
      completeRuntimeError = reason instanceof Error ? reason.message : String(reason);
    }
    expect(completeRuntimeError).toContain("FOREIGN KEY constraint failed");

    let recalculations = 0;
    const evolution = await loadSessionEvolutionMetrics(series, {
      getLatest: (seriesId) => repository.getLatest(seriesId),
      calculate: async (seriesId) => { recalculations += 1; return repository.calculateAndSave(seriesId); },
    });
    expect(recalculations).toBe(0);
    expect(evolution["series-legacy"].includedImpactCount).toBe(5);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM shooting_observations"))?.count).toBe(10);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM technical_hypotheses"))?.count).toBe(1);
  });

  it("reproduit la FK résiduelle du chargement des observations répétées", async () => {
    const database = await populatedV12();
    await migrateDatabase(database);
    const comparison = await new SqliteSeriesComparisonRepository(
      database,
      () => "comparison-reference-corrective",
      () => timestamp,
    ).compareAndSave("series-legacy", "series-corrective", "manual");
    let loadObservationSequence = 0;
    const repository = new SqliteShootingObservationRepository(
      database,
      () => `load-observation-${++loadObservationSequence}`,
      () => timestamp,
    );

    const before = {
      metrics: (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series_metrics"))?.count,
      singleSeriesObservations: (await database.getFirstAsync<{ count: number }>(
        "SELECT COUNT(*) AS count FROM shooting_observations WHERE scope='single_series'"))?.count,
      hypotheses: (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM technical_hypotheses"))?.count,
      confirmations: (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM confirmation_test_runs"))?.count,
      comparisons: (await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series_comparisons"))?.count,
    };
    const repeated = await repository.listRepeatedForSession("session-legacy");
    const afterFirstLoad = (await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM shooting_observations WHERE scope='session_pattern'"))?.count;
    const repeatedReloaded = await repository.listRepeatedForSession("session-legacy");

    expect(repeated.length).toBeGreaterThan(0);
    expect(comparison).toMatchObject({
      baselineSeriesId: "series-legacy",
      comparedSeriesId: "series-corrective",
    });
    expect(repeatedReloaded).toEqual(repeated);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series_metrics"))?.count).toBe(before.metrics);
    expect((await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM shooting_observations WHERE scope='single_series'"))?.count)
      .toBe(before.singleSeriesObservations);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM technical_hypotheses"))?.count)
      .toBe(before.hypotheses);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM confirmation_test_runs"))?.count)
      .toBe(before.confirmations);
    expect((await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) AS count FROM series_comparisons"))?.count)
      .toBe(before.comparisons);
    expect((await database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM shooting_observations WHERE scope='session_pattern'"))?.count)
      .toBe(afterFirstLoad);
    expect(await database.getFirstAsync("PRAGMA foreign_key_check")).toBeNull();
  });
});
