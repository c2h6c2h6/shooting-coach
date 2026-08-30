import { describe, expect, it } from "vitest";
import { Database, SqlParameter } from "../database/types";
import { SqliteImpactRepository } from "./sqliteImpactRepository";

type Row = Record<string, string | number | null>;
class ImpactDatabase implements Database {
  series: Row[] = [{ id: "s1", status: "active" }, { id: "s2", status: "active" }];
  rows: Row[] = [];
  async execAsync() {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getAllAsync<T>(_sql: string, ...params: SqlParameter[]) {
    return this.rows.filter((r) => r.series_id === params[0])
      .sort((a, b) => Number(a.sequence_number) - Number(b.sequence_number)) as T[];
  }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("FROM series")) return (this.series.find((r) => r.id === params[0]) ?? null) as T | null;
    if (sql.includes("MAX(sequence_number)")) {
      const n = this.rows.filter((r) => r.series_id === params[0]).map((r) => Number(r.sequence_number));
      return { next_number: (n.length ? Math.max(...n) : 0) + 1 } as T;
    }
    if (sql.includes("COUNT(*)")) return { count: this.rows.filter((r) => r.series_id === params[0]).length } as T;
    return (this.rows.find((r) => r.id === params[0]) ?? null) as T | null;
  }
  async runAsync(sql: string, ...p: SqlParameter[]) {
    if (sql.includes("INSERT INTO impacts")) {
      const [id, series_id, sequence_number, normalized_x, normalized_y, target_x, target_y,
        physical_x_mm, physical_y_mm, source, confidence, is_excluded, exclusion_reason, created_at, updated_at] = p;
      if (this.rows.some((r) => r.series_id === series_id && r.sequence_number === sequence_number)) throw new Error("UNIQUE");
      this.rows.push({ id, series_id, sequence_number, normalized_x, normalized_y, target_x, target_y,
        physical_x_mm, physical_y_mm, source, confidence, is_excluded, exclusion_reason, created_at, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("normalized_x =")) {
      const [normalized_x, normalized_y, updated_at, id] = p; const row = this.rows.find((r) => r.id === id);
      if (row) Object.assign(row, { normalized_x, normalized_y, updated_at }); return { changes: row ? 1 : 0 };
    }
    if (sql.includes("DELETE FROM impacts WHERE id")) {
      const before = this.rows.length; this.rows = this.rows.filter((r) => r.id !== p[0]); return { changes: before - this.rows.length };
    }
    if (sql.includes("DELETE FROM impacts WHERE series_id")) {
      const before = this.rows.length; this.rows = this.rows.filter((r) => r.series_id !== p[0]); return { changes: before - this.rows.length };
    }
    return { changes: 1 };
  }
}

describe("SqliteImpactRepository", () => {
  it("ajoute, numérote, ordonne, compte et relit après recréation du repository", async () => {
    const db = new ImpactDatabase(); let id = 0;
    const repo = new SqliteImpactRepository(db, () => `i${++id}`);
    await repo.add({ seriesId: "s1", normalizedX: 0.5, normalizedY: 0.5 });
    await repo.add({ seriesId: "s1", normalizedX: 0.25, normalizedY: 0.75 });
    expect((await repo.listBySeries("s1")).map((i) => i.sequenceNumber)).toEqual([1, 2]);
    expect(await repo.getNextSequenceNumber("s1")).toBe(3);
    expect(await repo.countBySeries("s1")).toBe(2);
    const restarted = new SqliteImpactRepository(db, () => "unused");
    expect(await restarted.countBySeries("s1")).toBe(2);
  });
  it("sépare strictement deux séries", async () => {
    const db = new ImpactDatabase(); let id = 0; const repo = new SqliteImpactRepository(db, () => `i${++id}`);
    await repo.add({ seriesId: "s1", normalizedX: 0, normalizedY: 0 });
    await repo.add({ seriesId: "s2", normalizedX: 1, normalizedY: 1 });
    expect(await repo.countBySeries("s1")).toBe(1); expect((await repo.listBySeries("s2"))[0].seriesId).toBe("s2");
  });
  it.each(["planned", "cancelled"])("refuse l’ajout sur une série %s", async (status) => {
    const db = new ImpactDatabase(); db.series[0].status = status;
    await expect(new SqliteImpactRepository(db, () => "i1").add({ seriesId: "s1", normalizedX: .5, normalizedY: .5 }))
      .rejects.toThrow("série active");
  });
  it("refuse les modifications unitaires d’une série completed", async () => {
    const db = new ImpactDatabase(); const repo = new SqliteImpactRepository(db, () => "i1");
    await repo.add({ seriesId: "s1", normalizedX: .5, normalizedY: .5 }); db.series[0].status = "completed";
    await expect(repo.move("i1", .2, .3)).rejects.toThrow("série active");
  });
  it("refuse aussi le remplacement global d’une série completed", async () => {
    const db = new ImpactDatabase(); const repo = new SqliteImpactRepository(db, () => "i1");
    const impact = await repo.add({ seriesId: "s1", normalizedX: .5, normalizedY: .5 });
    db.series[0].status = "completed";
    await expect(repo.replaceForEditableSeries("s1", [{ ...impact, normalizedX: .2, normalizedY: .3 }]))
      .rejects.toThrow("série active");
  });
  it.each(["planned", "cancelled"])("refuse le remplacement d’une série %s", async (status) => {
    const db = new ImpactDatabase(); db.series[0].status = status;
    await expect(new SqliteImpactRepository(db, () => "i1").replaceForEditableSeries("s1", []))
      .rejects.toThrow("série active");
  });
  it("déplace puis supprime un impact actif sans renuméroter", async () => {
    const db = new ImpactDatabase(); let id = 0; const repo = new SqliteImpactRepository(db, () => `i${++id}`);
    await repo.add({ seriesId: "s1", normalizedX: .5, normalizedY: .5 });
    await repo.add({ seriesId: "s1", normalizedX: .7, normalizedY: .7 });
    expect((await repo.move("i1", .25, .75)).normalizedY).toBe(.75);
    await repo.remove("i1"); expect(await repo.getNextSequenceNumber("s1")).toBe(3);
  });
});
