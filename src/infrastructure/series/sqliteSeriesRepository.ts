import { SeriesRepository } from "../../application/seriesRepository";
import {
  assertValidRecordedShotCount,
  DEFAULT_REFERENCE_INSTRUCTION,
  DEFAULT_REFERENCE_SHOT_COUNT,
  Series,
  SeriesDraft,
  SeriesStatus,
  SeriesType,
  CadenceType,
  validateSeriesDraft,
} from "../../domain/series";
import { Database } from "../database/types";

interface SeriesRow {
  id: string;
  session_id: string;
  sequence_number: number;
  type: SeriesType;
  status: SeriesStatus;
  expected_shot_count: number;
  recorded_shot_count: number;
  instruction: string | null;
  pedagogical_objective: string | null;
  selected_skill_id: string | null;
  duration_seconds: number | null;
  cadence_type: CadenceType | null;
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const columns = `id, session_id, sequence_number, type, status, expected_shot_count,
  recorded_shot_count, instruction, pedagogical_objective, selected_skill_id,
  duration_seconds, cadence_type, notes, started_at, completed_at, created_at, updated_at`;

function mapSeries(row: SeriesRow): Series {
  return {
    id: row.id,
    sessionId: row.session_id,
    sequenceNumber: row.sequence_number,
    type: row.type,
    status: row.status,
    expectedShotCount: row.expected_shot_count,
    recordedShotCount: row.recorded_shot_count,
    instruction: row.instruction,
    pedagogicalObjective: row.pedagogical_objective,
    selectedSkillId: row.selected_skill_id,
    durationSeconds: row.duration_seconds,
    cadenceType: row.cadence_type,
    notes: row.notes,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteSeriesRepository implements SeriesRepository {
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async listBySession(sessionId: string): Promise<Series[]> {
    const rows = await this.database.getAllAsync<SeriesRow>(
      `SELECT ${columns} FROM series WHERE session_id = ? ORDER BY sequence_number ASC`,
      sessionId,
    );
    return rows.map(mapSeries);
  }

  async getById(id: string): Promise<Series | null> {
    const row = await this.database.getFirstAsync<SeriesRow>(
      `SELECT ${columns} FROM series WHERE id = ?`,
      id,
    );
    return row ? mapSeries(row) : null;
  }

  async getNextSequenceNumber(sessionId: string): Promise<number> {
    const row = await this.database.getFirstAsync<{ next_number: number }>(
      "SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_number FROM series WHERE session_id = ?",
      sessionId,
    );
    return row?.next_number ?? 1;
  }

  async hasActiveSeries(sessionId: string): Promise<boolean> {
    const row = await this.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM series WHERE session_id = ? AND status = 'active'",
      sessionId,
    );
    return (row?.count ?? 0) > 0;
  }

  async create(input: Omit<SeriesDraft, "sequenceNumber"> & { sequenceNumber?: number }): Promise<Series> {
    const session = await this.database.getFirstAsync<{ status: string }>(
      "SELECT status FROM sessions WHERE id = ?",
      input.sessionId,
    );
    if (!session) throw new Error("Séance introuvable.");
    if (session.status !== "active") throw new Error("Une série ne peut être créée que dans une séance active.");

    const sequenceNumber = input.sequenceNumber ?? (await this.getNextSequenceNumber(input.sessionId));
    const draft: SeriesDraft = { ...input, sequenceNumber };
    if (Object.keys(validateSeriesDraft(draft)).length > 0) throw new Error("Série invalide.");
    const id = this.createId();
    const timestamp = this.now();
    await this.database.runAsync(
      `INSERT INTO series (
        id, session_id, sequence_number, type, status, expected_shot_count,
        recorded_shot_count, instruction, pedagogical_objective, selected_skill_id,
        duration_seconds, cadence_type, notes, started_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'planned', ?, 0, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      id, draft.sessionId, sequenceNumber, draft.type, draft.expectedShotCount,
      draft.instruction?.trim() || null, draft.pedagogicalObjective?.trim() || null,
      draft.selectedSkillId ?? null, draft.durationSeconds ?? null,
      draft.cadenceType ?? null, draft.notes?.trim() || null, timestamp, timestamp,
    );
    return (await this.getById(id))!;
  }

  async ensureReferenceSeries(sessionId: string): Promise<Series> {
    const existing = await this.database.getFirstAsync<SeriesRow>(
      `SELECT ${columns} FROM series WHERE session_id = ? ORDER BY sequence_number ASC LIMIT 1`,
      sessionId,
    );
    if (existing) return mapSeries(existing);
    return this.create({
      sessionId,
      type: "reference",
      expectedShotCount: DEFAULT_REFERENCE_SHOT_COUNT,
      instruction: DEFAULT_REFERENCE_INSTRUCTION,
      cadenceType: "free",
    });
  }

  async start(id: string): Promise<Series> {
    const series = await this.getById(id);
    if (!series || series.status !== "planned") {
      throw new Error("Seule une série planifiée peut être démarrée.");
    }
    if (await this.hasActiveSeries(series.sessionId)) {
      throw new Error("Une autre série est déjà active dans cette séance.");
    }
    const timestamp = this.now();
    const result = await this.database.runAsync(
      "UPDATE series SET status = 'active', started_at = ?, updated_at = ? WHERE id = ? AND status = 'planned'",
      timestamp, timestamp, id,
    );
    if (result.changes === 0) throw new Error("Démarrage de la série impossible.");
    return (await this.getById(id))!;
  }

  async complete(id: string, recordedShotCount: number): Promise<Series> {
    assertValidRecordedShotCount(recordedShotCount);
    const timestamp = this.now();
    const result = await this.database.runAsync(
      `UPDATE series SET status = 'completed', recorded_shot_count = ?,
       completed_at = ?, updated_at = ? WHERE id = ? AND status = 'active'`,
      recordedShotCount, timestamp, timestamp, id,
    );
    if (result.changes === 0) throw new Error("Seule une série active peut être terminée.");
    return (await this.getById(id))!;
  }

  async updateRecordedShotCount(id: string, recordedShotCount: number): Promise<Series> {
    assertValidRecordedShotCount(recordedShotCount);
    const result = await this.database.runAsync(
      "UPDATE series SET recorded_shot_count = ?, updated_at = ? WHERE id = ? AND status = 'active'",
      recordedShotCount, this.now(), id,
    );
    if (result.changes === 0) throw new Error("Le nombre de coups n’est modifiable que pour une série active.");
    return (await this.getById(id))!;
  }

  async cancel(id: string): Promise<Series> {
    const timestamp = this.now();
    const result = await this.database.runAsync(
      `UPDATE series SET status = 'cancelled', updated_at = ?
       WHERE id = ? AND status IN ('planned', 'active')`,
      timestamp, id,
    );
    if (result.changes === 0) throw new Error("Cette série ne peut pas être annulée.");
    return (await this.getById(id))!;
  }
}
