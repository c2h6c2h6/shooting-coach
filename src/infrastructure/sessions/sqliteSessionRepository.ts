import { SessionRepository } from "../../application/sessionRepository";
import { Laterality } from "../../domain/profile";
import {
  assertValidSnapshot,
  NumberOfHands,
  provisionalSkills,
  Session,
  SessionDraft,
  SessionMode,
  SessionStatus,
  TargetTypeReference,
  validateSessionDraft,
  WeaponReference,
} from "../../domain/session";
import { Database } from "../database/types";
import { SqliteSeriesRepository } from "../series/sqliteSeriesRepository";

interface SessionRow {
  id: string;
  shooter_profile_id: string;
  mode: SessionMode;
  status: SessionStatus;
  weapon_id: string;
  distance_mm: number;
  number_of_hands: number | null;
  target_type_id: string;
  objective_type: "free_text" | "provisional_skill" | null;
  objective_label: string | null;
  selected_skill_id: string | null;
  shooter_display_name_snapshot: string;
  shooter_laterality_snapshot: Laterality;
  weapon_name_snapshot: string;
  target_type_name_snapshot: string;
  target_width_mm_snapshot: number | null;
  target_height_mm_snapshot: number | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileSnapshotRow {
  display_name: string;
  laterality: Laterality | null;
}

interface WeaponRow {
  id: string;
  name: string;
  active: number;
}

interface TargetRow extends WeaponRow {
  width_mm: number | null;
  height_mm: number | null;
}

const sessionColumns = `id, shooter_profile_id, mode, status, weapon_id, distance_mm,
  number_of_hands, target_type_id, objective_type, objective_label, selected_skill_id,
  shooter_display_name_snapshot, shooter_laterality_snapshot, weapon_name_snapshot,
  target_type_name_snapshot, target_width_mm_snapshot, target_height_mm_snapshot,
  started_at, completed_at, created_at, updated_at`;

function mapSession(row: SessionRow): Session {
  if (row.number_of_hands !== null && row.number_of_hands !== 1 && row.number_of_hands !== 2) {
    throw new Error("Nombre de mains enregistré invalide.");
  }
  return {
    id: row.id,
    shooterProfileId: row.shooter_profile_id,
    mode: row.mode,
    status: row.status,
    weaponId: row.weapon_id,
    distanceMm: row.distance_mm,
    numberOfHands: row.number_of_hands as NumberOfHands | null,
    targetTypeId: row.target_type_id,
    objectiveType: row.objective_type,
    objectiveLabel: row.objective_label,
    selectedSkillId: row.selected_skill_id,
    shooterDisplayName: row.shooter_display_name_snapshot,
    shooterLaterality: row.shooter_laterality_snapshot,
    weaponName: row.weapon_name_snapshot,
    targetTypeName: row.target_type_name_snapshot,
    targetWidthMm: row.target_width_mm_snapshot,
    targetHeightMm: row.target_height_mm_snapshot,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SqliteSessionRepository implements SessionRepository {
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async list(): Promise<Session[]> {
    const rows = await this.database.getAllAsync<SessionRow>(
      `SELECT ${sessionColumns} FROM sessions ORDER BY created_at DESC`,
    );
    return rows.map(mapSession);
  }

  async listByProfile(profileId: string): Promise<Session[]> {
    const rows = await this.database.getAllAsync<SessionRow>(
      `SELECT ${sessionColumns} FROM sessions
       WHERE shooter_profile_id = ?
       ORDER BY COALESCE(completed_at, started_at, created_at) DESC`,
      profileId,
    );
    return rows.map(mapSession);
  }

  async getById(id: string): Promise<Session | null> {
    const row = await this.database.getFirstAsync<SessionRow>(
      `SELECT ${sessionColumns} FROM sessions WHERE id = ?`,
      id,
    );
    return row ? mapSession(row) : null;
  }

  async listWeapons(): Promise<WeaponReference[]> {
    const rows = await this.database.getAllAsync<WeaponRow>(
      "SELECT id, name, active FROM weapons WHERE active = 1 ORDER BY name",
    );
    return rows.map((row) => ({ id: row.id, name: row.name, active: row.active === 1 }));
  }

  async listTargetTypes(): Promise<TargetTypeReference[]> {
    const rows = await this.database.getAllAsync<TargetRow>(
      "SELECT id, name, active, width_mm, height_mm FROM target_types WHERE active = 1 ORDER BY name",
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      active: row.active === 1,
      widthMm: row.width_mm,
      heightMm: row.height_mm,
    }));
  }

  async create(draft: SessionDraft): Promise<Session> {
    if (Object.keys(validateSessionDraft(draft)).length > 0) throw new Error("Séance invalide.");
    const profile = await this.database.getFirstAsync<ProfileSnapshotRow>(
      "SELECT display_name, laterality FROM shooter_profiles WHERE id = ?",
      draft.shooterProfileId!,
    );
    if (!profile) throw new Error("Profil tireur introuvable.");
    const weapon = await this.database.getFirstAsync<WeaponRow>(
      "SELECT id, name, active FROM weapons WHERE id = ? AND active = 1",
      draft.weaponId!,
    );
    if (!weapon) throw new Error("Arme indisponible.");
    const target = await this.database.getFirstAsync<TargetRow>(
      "SELECT id, name, active, width_mm, height_mm FROM target_types WHERE id = ? AND active = 1",
      draft.targetTypeId!,
    );
    if (!target) throw new Error("Type de cible indisponible.");

    const snapshot = {
      shooterDisplayName: profile.display_name,
      shooterLaterality: profile.laterality!,
      weaponName: weapon.name,
      targetTypeName: target.name,
      targetWidthMm: target.width_mm,
      targetHeightMm: target.height_mm,
    };
    assertValidSnapshot(snapshot);

    const id = this.createId();
    const timestamp = this.now();
    const objectiveLabel =
      draft.objectiveLabel?.trim() ||
      provisionalSkills.find((skill) => skill.id === draft.selectedSkillId)?.label ||
      null;
    const objectiveType = draft.selectedSkillId
      ? "provisional_skill"
      : objectiveLabel
        ? "free_text"
        : null;
    await this.database.runAsync(
      `INSERT INTO sessions (
        id, shooter_profile_id, mode, status, weapon_id, distance_mm, number_of_hands, target_type_id,
        objective_type, objective_label, selected_skill_id,
        shooter_display_name_snapshot, shooter_laterality_snapshot, weapon_name_snapshot,
        target_type_name_snapshot, target_width_mm_snapshot, target_height_mm_snapshot,
        started_at, completed_at, created_at, updated_at
      ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
      id, draft.shooterProfileId!, draft.mode, draft.weaponId!, draft.distanceMm!,
      draft.numberOfHands, draft.targetTypeId!, objectiveType, objectiveLabel, draft.selectedSkillId ?? null,
      snapshot.shooterDisplayName, snapshot.shooterLaterality, snapshot.weaponName,
      snapshot.targetTypeName, snapshot.targetWidthMm, snapshot.targetHeightMm,
      timestamp, timestamp,
    );
    return (await this.getById(id))!;
  }

  async start(id: string): Promise<Session> {
    const timestamp = this.now();
    await this.database.withTransactionAsync(async () => {
      const result = await this.database.runAsync(
        `UPDATE sessions SET status = 'active', started_at = ?, updated_at = ?
         WHERE id = ? AND status = 'draft'`,
        timestamp,
        timestamp,
        id,
      );
      if (result.changes === 0) throw new Error("Seule une séance en brouillon peut être démarrée.");
      const session = await this.getById(id);
      if (session?.mode === "coaching_free") {
        const seriesRepository = new SqliteSeriesRepository(
          this.database,
          this.createId,
          this.now,
        );
        await seriesRepository.ensureReferenceSeries(id);
      }
    });
    return (await this.getById(id))!;
  }

  async complete(id: string): Promise<Session> {
    const timestamp = this.now();
    const update = () => this.database.runAsync(
      `UPDATE sessions SET status = 'completed', completed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'active'
       AND NOT EXISTS (
         SELECT 1 FROM series WHERE session_id = sessions.id AND status = 'active'
       )`,
      timestamp, timestamp, id,
    );
    let result;
    try {
      result = await update();
    } catch (reason) {
      if (!isForeignKeyFailure(reason)) throw reason;
      await this.repairLegacySessionReferences(id);
      result = await update();
    }
    if (result.changes === 0) {
      const activeSeries = await this.database.getFirstAsync<{ id: string }>(
        "SELECT id FROM series WHERE session_id = ? AND status = 'active' LIMIT 1",
        id,
      );
      if (activeSeries) throw new Error("Terminez d’abord la série en cours.");
      throw new Error("Seule une séance en cours peut être terminée.");
    }
    return (await this.getById(id))!;
  }

  /**
   * Early pilot builds could leave a session pointing at a reference row that
   * was later replaced. Keep the immutable snapshots as the source for
   * restoring those catalogue rows; no session, series or impact is deleted.
   */
  private async repairLegacySessionReferences(id: string): Promise<void> {
    const row = await this.database.getFirstAsync<{
      weapon_id: string;
      weapon_name_snapshot: string;
      target_type_id: string;
      target_type_name_snapshot: string;
      target_width_mm_snapshot: number | null;
      target_height_mm_snapshot: number | null;
    }>(
      `SELECT weapon_id, weapon_name_snapshot, target_type_id, target_type_name_snapshot,
              target_width_mm_snapshot, target_height_mm_snapshot
       FROM sessions WHERE id = ?`,
      id,
    );
    if (!row) throw new Error("Séance introuvable.");
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        "INSERT OR IGNORE INTO weapons(id, name, active) VALUES (?, ?, 1)",
        row.weapon_id, row.weapon_name_snapshot,
      );
      await this.database.runAsync(
        `INSERT OR IGNORE INTO target_types(id, name, active, width_mm, height_mm)
         VALUES (?, ?, 1, ?, ?)`,
        row.target_type_id, row.target_type_name_snapshot,
        row.target_width_mm_snapshot, row.target_height_mm_snapshot,
      );
    });
  }
}

function isForeignKeyFailure(reason: unknown): boolean {
  return reason instanceof Error && /foreign key constraint failed/i.test(reason.message);
}
