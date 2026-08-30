import { describe, expect, it } from "vitest";
import { Database, SqlParameter } from "../database/types";
import { SqliteSeriesRepository } from "./sqliteSeriesRepository";

type Row = Record<string, string | number | null>;

class SeriesDatabase implements Database {
  session: Row | null = { id: "session-1", status: "active" };
  rows: Row[] = [];
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getAllAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("FROM series")) {
      return this.rows
        .filter((row) => row.session_id === params[0])
        .sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number)) as T[];
    }
    return [] as T[];
  }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("FROM sessions")) {
      return (this.session?.id === params[0] ? this.session : null) as T | null;
    }
    if (sql.includes("MAX(sequence_number)")) {
      const numbers = this.rows.filter((row) => row.session_id === params[0]).map((row) => Number(row.sequence_number));
      return { next_number: (numbers.length ? Math.max(...numbers) : 0) + 1 } as T;
    }
    if (sql.includes("COUNT(*)")) {
      return {
        count: this.rows.filter((row) => row.session_id === params[0] && row.status === "active").length,
      } as T;
    }
    if (sql.includes("WHERE session_id = ?")) {
      return (this.rows
        .filter((row) => row.session_id === params[0])
        .sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number))[0] ?? null) as T | null;
    }
    return (this.rows.find((row) => row.id === params[0]) ?? null) as T | null;
  }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("INSERT INTO series")) {
      const [id, session_id, sequence_number, type, expected_shot_count, instruction,
        pedagogical_objective, selected_skill_id, duration_seconds, cadence_type,
        notes, created_at, updated_at] = params;
      if (this.rows.some((row) => row.session_id === session_id && row.sequence_number === sequence_number)) {
        throw new Error("UNIQUE constraint failed");
      }
      this.rows.push({
        id, session_id, sequence_number, type, status: "planned", expected_shot_count,
        recorded_shot_count: 0, instruction, pedagogical_objective, selected_skill_id,
        duration_seconds, cadence_type, notes, started_at: null, completed_at: null,
        created_at, updated_at,
      });
      return { changes: 1 };
    }
    if (sql.includes("status = 'completed'")) {
      const [recorded_shot_count, completed_at, updated_at, id] = params;
      const row = this.rows.find((item) => item.id === id && item.status === "active");
      if (!row) return { changes: 0 };
      Object.assign(row, { status: "completed", recorded_shot_count, completed_at, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("SET status = 'active'")) {
      const [started_at, updated_at, id] = params;
      const row = this.rows.find((item) => item.id === id && item.status === "planned");
      if (!row) return { changes: 0 };
      Object.assign(row, { status: "active", started_at, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("status = 'cancelled'")) {
      const [updated_at, id] = params;
      const row = this.rows.find((item) => item.id === id && (item.status === "planned" || item.status === "active"));
      if (!row) return { changes: 0 };
      Object.assign(row, { status: "cancelled", updated_at });
      return { changes: 1 };
    }
    return { changes: 0 };
  }
}

describe("SqliteSeriesRepository", () => {
  it("crée, numérote et liste les séries dans l’ordre", async () => {
    const db = new SeriesDatabase();
    let id = 0;
    const repository = new SqliteSeriesRepository(db, () => `series-${++id}`);
    await repository.create({ sessionId: "session-1", type: "progression", expectedShotCount: 7 });
    await repository.create({ sessionId: "session-1", type: "corrective", expectedShotCount: 5 });
    expect((await repository.listBySession("session-1")).map((item) => item.sequenceNumber)).toEqual([1, 2]);
  });

  it.each(["draft", "completed", "cancelled"])("refuse une création dans une séance %s", async (status) => {
    const db = new SeriesDatabase();
    db.session!.status = status;
    const repository = new SqliteSeriesRepository(db, () => "series-1");
    await expect(repository.create({ sessionId: "session-1", type: "reference", expectedShotCount: 5 }))
      .rejects.toThrow("séance active");
  });

  it("garantit l’idempotence de la série de référence", async () => {
    const db = new SeriesDatabase();
    let id = 0;
    const repository = new SqliteSeriesRepository(db, () => `series-${++id}`);
    const first = await repository.ensureReferenceSeries("session-1");
    const second = await repository.ensureReferenceSeries("session-1");
    expect(second.id).toBe(first.id);
    expect(db.rows).toHaveLength(1);
  });

  it("démarre, horodate et termine avec un nombre différent du nombre prévu", async () => {
    const db = new SeriesDatabase();
    let now = "2026-07-26T14:00:00.000Z";
    const repository = new SqliteSeriesRepository(db, () => "series-1", () => now);
    await repository.create({ sessionId: "session-1", type: "diagnostic", expectedShotCount: 5 });
    now = "2026-07-26T14:01:00.000Z";
    const active = await repository.start("series-1");
    expect(active.startedAt).toBe(now);
    now = "2026-07-26T14:02:00.000Z";
    const completed = await repository.complete("series-1", 7);
    expect(completed).toMatchObject({ status: "completed", recordedShotCount: 7, completedAt: now });
    await expect(repository.start("series-1")).rejects.toThrow("planifiée");
  });

  it("n’autorise qu’une série active par séance", async () => {
    const db = new SeriesDatabase();
    let id = 0;
    const repository = new SqliteSeriesRepository(db, () => `series-${++id}`);
    await repository.create({ sessionId: "session-1", type: "diagnostic", expectedShotCount: 5 });
    await repository.create({ sessionId: "session-1", type: "corrective", expectedShotCount: 5 });
    await repository.start("series-1");
    await expect(repository.start("series-2")).rejects.toThrow("déjà active");
  });

  it("annule une série planifiée ou active", async () => {
    const db = new SeriesDatabase();
    let id = 0;
    const repository = new SqliteSeriesRepository(db, () => `series-${++id}`);
    await repository.create({ sessionId: "session-1", type: "diagnostic", expectedShotCount: 5 });
    expect((await repository.cancel("series-1")).status).toBe("cancelled");
    await repository.create({ sessionId: "session-1", type: "corrective", expectedShotCount: 5 });
    await repository.start("series-2");
    expect((await repository.cancel("series-2")).status).toBe("cancelled");
  });
});
