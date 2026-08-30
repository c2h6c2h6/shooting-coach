import { ImpactRepository } from "../../application/impactRepository";
import { assertValidImpactDraft, Impact, ImpactDraft, ImpactSource } from "../../domain/impact";
import { Database } from "../database/types";

interface ImpactRow {
  id: string; series_id: string; sequence_number: number; normalized_x: number; normalized_y: number;
  target_x: number | null; target_y: number | null; physical_x_mm: number | null; physical_y_mm: number | null;
  source: ImpactSource; confidence: number | null; is_excluded: number; exclusion_reason: string | null;
  created_at: string; updated_at: string;
}
const columns = `id, series_id, sequence_number, normalized_x, normalized_y, target_x, target_y,
 physical_x_mm, physical_y_mm, source, confidence, is_excluded, exclusion_reason, created_at, updated_at`;

function map(row: ImpactRow): Impact {
  return {
    id: row.id, seriesId: row.series_id, sequenceNumber: row.sequence_number,
    normalizedX: row.normalized_x, normalizedY: row.normalized_y, targetX: row.target_x,
    targetY: row.target_y, physicalXmm: row.physical_x_mm, physicalYmm: row.physical_y_mm,
    source: row.source, confidence: row.confidence, isExcluded: row.is_excluded === 1,
    exclusionReason: row.exclusion_reason, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export class SqliteImpactRepository implements ImpactRepository {
  constructor(private readonly database: Database, private readonly createId: () => string,
    private readonly now = () => new Date().toISOString()) {}

  private async assertActiveSeries(seriesId: string) {
    const series = await this.database.getFirstAsync<{ status: string }>("SELECT status FROM series WHERE id = ?", seriesId);
    if (!series) throw new Error("Série introuvable.");
    if (series.status !== "active") throw new Error("Les impacts ne sont modifiables que dans une série active.");
  }
  async getById(id: string) {
    const row = await this.database.getFirstAsync<ImpactRow>(`SELECT ${columns} FROM impacts WHERE id = ?`, id);
    return row ? map(row) : null;
  }
  async listBySeries(seriesId: string) {
    const rows = await this.database.getAllAsync<ImpactRow>(
      `SELECT ${columns} FROM impacts WHERE series_id = ? ORDER BY sequence_number ASC`, seriesId);
    return rows.map(map);
  }
  async getNextSequenceNumber(seriesId: string) {
    const row = await this.database.getFirstAsync<{ next_number: number }>(
      "SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_number FROM impacts WHERE series_id = ?", seriesId);
    return row?.next_number ?? 1;
  }
  async countBySeries(seriesId: string) {
    const row = await this.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM impacts WHERE series_id = ?", seriesId);
    return row?.count ?? 0;
  }
  async add(input: Omit<ImpactDraft, "sequenceNumber" | "source"> & { sequenceNumber?: number }) {
    await this.assertActiveSeries(input.seriesId);
    const draft: ImpactDraft = { ...input, sequenceNumber: input.sequenceNumber ??
      await this.getNextSequenceNumber(input.seriesId), source: "manual" };
    assertValidImpactDraft(draft);
    const id = this.createId(), timestamp = this.now();
    await this.insert({ ...draft, id, isExcluded: draft.isExcluded ?? false, createdAt: timestamp, updatedAt: timestamp });
    return (await this.getById(id))!;
  }
  private async insert(impact: Impact) {
    await this.database.runAsync(`INSERT INTO impacts (${columns}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      impact.id, impact.seriesId, impact.sequenceNumber, impact.normalizedX, impact.normalizedY,
      impact.targetX ?? null, impact.targetY ?? null, impact.physicalXmm ?? null, impact.physicalYmm ?? null,
      impact.source, impact.confidence ?? null, impact.isExcluded ? 1 : 0, impact.exclusionReason ?? null,
      impact.createdAt, impact.updatedAt);
  }
  async move(id: string, normalizedX: number, normalizedY: number) {
    const impact = await this.getById(id);
    if (!impact) throw new Error("Impact introuvable.");
    await this.assertActiveSeries(impact.seriesId);
    assertValidImpactDraft({ ...impact, normalizedX, normalizedY });
    const timestamp = this.now();
    await this.database.runAsync("UPDATE impacts SET normalized_x = ?, normalized_y = ?, updated_at = ? WHERE id = ?",
      normalizedX, normalizedY, timestamp, id);
    return (await this.getById(id))!;
  }
  async remove(id: string) {
    const impact = await this.getById(id);
    if (!impact) throw new Error("Impact introuvable.");
    await this.assertActiveSeries(impact.seriesId);
    await this.database.runAsync("DELETE FROM impacts WHERE id = ?", id);
  }
  async setExcluded(id: string, isExcluded: boolean, reason?: string | null) {
    const impact = await this.getById(id);
    if (!impact) throw new Error("Impact introuvable.");
    await this.assertActiveSeries(impact.seriesId);
    const exclusionReason = isExcluded ? reason?.trim() || null : null;
    assertValidImpactDraft({ ...impact, isExcluded, exclusionReason });
    await this.database.runAsync("UPDATE impacts SET is_excluded = ?, exclusion_reason = ?, updated_at = ? WHERE id = ?",
      isExcluded ? 1 : 0, exclusionReason, this.now(), id);
    return (await this.getById(id))!;
  }
  async replaceForEditableSeries(seriesId: string, impacts: Impact[]) {
    await this.assertActiveSeries(seriesId);
    for (const impact of impacts) {
      if (impact.seriesId !== seriesId) throw new Error("Rattachement d’impact incohérent.");
      assertValidImpactDraft(impact);
    }
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync("DELETE FROM impacts WHERE series_id = ?", seriesId);
      for (const impact of impacts) await this.insert(impact);
    });
  }
}
