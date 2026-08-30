import { ProfileRepository } from "../../application/profileRepository";
import {
  DeclaredLevel,
  Laterality,
  ShooterProfile,
  ShooterProfileDraft,
  SupportedWeapon,
  validateProfile,
} from "../../domain/profile";
import { Database } from "../database/types";

interface ProfileRow {
  id: string;
  display_name: string;
  laterality: Laterality;
  declared_level: DeclaredLevel;
  primary_weapon: SupportedWeapon;
  created_at: string;
  updated_at: string;
}

const selectColumns =
  "id, display_name, laterality, declared_level, primary_weapon, created_at, updated_at";

function mapRow(row: ProfileRow): ShooterProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    laterality: row.laterality,
    declaredLevel: row.declared_level,
    primaryWeapon: row.primary_weapon,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function assertValid(draft: ShooterProfileDraft): asserts draft is ShooterProfileDraft & {
  laterality: Laterality;
} {
  if (Object.keys(validateProfile(draft)).length > 0) {
    throw new Error("Profil invalide.");
  }
}

export class SqliteProfileRepository implements ProfileRepository {
  constructor(
    private readonly database: Database,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async list(): Promise<ShooterProfile[]> {
    const rows = await this.database.getAllAsync<ProfileRow>(
      `SELECT ${selectColumns} FROM shooter_profiles ORDER BY lower(display_name), created_at`,
    );
    return rows.map(mapRow);
  }

  async getById(id: string): Promise<ShooterProfile | null> {
    const row = await this.database.getFirstAsync<ProfileRow>(
      `SELECT ${selectColumns} FROM shooter_profiles WHERE id = ?`,
      id,
    );
    return row ? mapRow(row) : null;
  }

  async create(draft: ShooterProfileDraft): Promise<ShooterProfile> {
    assertValid(draft);
    const id = this.createId();
    const timestamp = this.now();
    await this.database.withTransactionAsync(async () => {
      await this.database.runAsync(
        `INSERT INTO shooter_profiles
          (id, display_name, laterality, declared_level, primary_weapon, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        draft.displayName.trim(),
        draft.laterality,
        draft.declaredLevel,
        draft.primaryWeapon,
        timestamp,
        timestamp,
      );
      const active = await this.database.getFirstAsync<{ active_profile_id: string | null }>(
        "SELECT active_profile_id FROM app_settings WHERE singleton_key = 1",
      );
      if (!active?.active_profile_id) {
        await this.database.runAsync(
          "UPDATE app_settings SET active_profile_id = ? WHERE singleton_key = 1",
          id,
        );
      }
    });
    return (await this.getById(id))!;
  }

  async update(id: string, draft: ShooterProfileDraft): Promise<ShooterProfile> {
    assertValid(draft);
    const result = await this.database.runAsync(
      `UPDATE shooter_profiles
       SET display_name = ?, laterality = ?, declared_level = ?, primary_weapon = ?, updated_at = ?
       WHERE id = ?`,
      draft.displayName.trim(),
      draft.laterality,
      draft.declaredLevel,
      draft.primaryWeapon,
      this.now(),
      id,
    );
    if (result.changes === 0) throw new Error("Profil introuvable.");
    return (await this.getById(id))!;
  }

  async delete(id: string): Promise<void> {
    const count = await this.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM sessions WHERE shooter_profile_id = ?",
      id,
    );
    if ((count?.count ?? 0) > 0) {
      throw new Error("Ce profil possède des séances et ne peut pas être supprimé.");
    }
    await this.database.runAsync("DELETE FROM shooter_profiles WHERE id = ?", id);
  }

  async getActive(): Promise<ShooterProfile | null> {
    const row = await this.database.getFirstAsync<ProfileRow>(
      `SELECT ${selectColumns}
       FROM shooter_profiles p
       JOIN app_settings s ON s.active_profile_id = p.id
       WHERE s.singleton_key = 1`,
    );
    return row ? mapRow(row) : null;
  }

  async setActive(id: string): Promise<void> {
    if (!(await this.getById(id))) throw new Error("Profil introuvable.");
    await this.database.runAsync(
      "UPDATE app_settings SET active_profile_id = ? WHERE singleton_key = 1",
      id,
    );
  }
}
