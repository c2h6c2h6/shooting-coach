import { describe, expect, it } from "vitest";
import { Database, SqlParameter } from "../database/types";
import { SqliteShootingObservationRepository } from "./sqliteShootingObservationRepository";

class ObservationDatabase implements Database {
  observations: Array<{ seriesId: string; result_json: string }> = [];
  status = "completed";
  async execAsync() {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("SELECT id, session_id, sequence_number, status FROM series")) {
      return { id: params[0], session_id: params[0] === "s2" ? "session-2" : "session-1",
        sequence_number: 1, status: this.status } as T;
    }
    if (sql.includes("expected_shot_count")) {
      return { expected_shot_count: 5, recorded_shot_count: 5,
        target_width_mm_snapshot: null, target_height_mm_snapshot: null } as T;
    }
    return null;
  }
  async getAllAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("FROM impacts")) return [
      { id: "i1", normalized_x: .49, normalized_y: .49, is_excluded: 0 },
      { id: "i2", normalized_x: .50, normalized_y: .49, is_excluded: 0 },
      { id: "i3", normalized_x: .51, normalized_y: .50, is_excluded: 0 },
      { id: "i4", normalized_x: .49, normalized_y: .51, is_excluded: 0 },
      { id: "i5", normalized_x: .51, normalized_y: .51, is_excluded: 0 },
    ] as T[];
    if (sql.includes("FROM shooting_observations")) {
      return this.observations.filter((item) => item.seriesId === params[0])
        .map(({ result_json }) => ({ result_json })) as T[];
    }
    return [] as T[];
  }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("DELETE FROM shooting_observations WHERE series_id = ?")) {
      this.observations = this.observations.filter((item) => item.seriesId !== params[0]);
    } else if (sql.includes("INSERT INTO shooting_observations")) {
      this.observations.push({ seriesId: String(params[2]), result_json: String(params[18]) });
    }
    return { changes: 1 };
  }
}

describe("SqliteShootingObservationRepository", () => {
  it("persiste et relit les codes structurés d’une série", async () => {
    const database = new ObservationDatabase();
    let id = 0;
    const repository = new SqliteShootingObservationRepository(database, () => `o${++id}`, () => "2026-01-01");
    const generated = await repository.generateForSeries("s1");
    const reloaded = await repository.listBySeries("s1");
    expect(reloaded.map((item) => item.observationCode)).toEqual(
      [generated.primary, ...generated.secondary, ...generated.limitations]
        .filter((item) => item !== null).map((item) => item!.observationCode),
    );
    expect(reloaded.every((item) => item.sessionId === "session-1")).toBe(true);
  });
  it("invalide sans toucher aux observations d’une autre série", async () => {
    const database = new ObservationDatabase();
    let id = 0;
    const repository = new SqliteShootingObservationRepository(database, () => `o${++id}`);
    await repository.generateForSeries("s1");
    await repository.generateForSeries("s2");
    await repository.invalidateForSeries("s1");
    expect(await repository.listBySeries("s1")).toEqual([]);
    expect((await repository.listBySeries("s2")).length).toBeGreaterThan(0);
  });
  it("refuse la génération pour une série encore active", async () => {
    const database = new ObservationDatabase();
    database.status = "active";
    const repository = new SqliteShootingObservationRepository(database, () => "o");
    await expect(repository.generateForSeries("s1")).rejects.toThrow("série terminée");
  });
});
