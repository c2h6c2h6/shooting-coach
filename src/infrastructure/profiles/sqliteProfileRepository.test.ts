import { describe, expect, it } from "vitest";
import { ShooterProfileDraft } from "../../domain/profile";
import { Database, SqlParameter } from "../database/types";
import { SqliteProfileRepository } from "./sqliteProfileRepository";

type Row = Record<string, string>;

class ProfileDatabase implements Database {
  rows: Row[] = [];
  activeId: string | null = null;
  sessionCount = 0;
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("INSERT INTO shooter_profiles")) {
      const [id, display_name, laterality, declared_level, primary_weapon, created_at, updated_at] = params as string[];
      this.rows.push({ id, display_name, laterality, declared_level, primary_weapon, created_at, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("UPDATE app_settings")) {
      this.activeId = params[0] as string;
      return { changes: 1 };
    }
    if (sql.includes("UPDATE shooter_profiles")) {
      const [display_name, laterality, declared_level, primary_weapon, updated_at, id] = params as string[];
      const row = this.rows.find((item) => item.id === id);
      if (!row) return { changes: 0 };
      Object.assign(row, { display_name, laterality, declared_level, primary_weapon, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("DELETE FROM shooter_profiles")) {
      const id = params[0] as string;
      this.rows = this.rows.filter((item) => item.id !== id);
      if (this.activeId === id) this.activeId = null;
      return { changes: 1 };
    }
    return { changes: 0 };
  }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("COUNT(*) AS count FROM sessions")) {
      return { count: this.sessionCount } as T;
    }
    if (sql.includes("active_profile_id FROM app_settings")) {
      return { active_profile_id: this.activeId } as T;
    }
    const id = sql.includes("JOIN app_settings") ? this.activeId : params[0];
    return (this.rows.find((row) => row.id === id) ?? null) as T | null;
  }
  async getAllAsync<T>() { return [...this.rows] as T[]; }
}

const draft: ShooterProfileDraft = {
  displayName: " Alex ",
  laterality: "left",
  declaredLevel: "beginner",
  primaryWeapon: "glock-19",
};

describe("SqliteProfileRepository", () => {
  it("crée le premier profil, normalise son nom et le rend actif", async () => {
    const db = new ProfileDatabase();
    const repository = new SqliteProfileRepository(db, () => "profile-1", () => "2026-07-26T12:00:00.000Z");
    const profile = await repository.create(draft);
    expect(profile.displayName).toBe("Alex");
    expect((await repository.getActive())?.id).toBe("profile-1");
  });

  it("modifie puis liste un profil persisté", async () => {
    const db = new ProfileDatabase();
    const repository = new SqliteProfileRepository(db, () => "profile-1", () => "2026-07-26T12:00:00.000Z");
    await repository.create(draft);
    await repository.update("profile-1", { ...draft, displayName: "Sam", laterality: "right" });
    expect(await repository.list()).toMatchObject([{ displayName: "Sam", laterality: "right" }]);
  });

  it("supprime le profil actif et vide la sélection", async () => {
    const db = new ProfileDatabase();
    const repository = new SqliteProfileRepository(db, () => "profile-1", () => "2026-07-26T12:00:00.000Z");
    await repository.create(draft);
    await repository.delete("profile-1");
    expect(await repository.getActive()).toBeNull();
    expect(await repository.list()).toEqual([]);
  });

  it("refuse de persister un profil sans latéralité", async () => {
    const repository = new SqliteProfileRepository(new ProfileDatabase(), () => "unused");
    await expect(repository.create({ ...draft, laterality: null })).rejects.toThrow("Profil invalide");
  });

  it("refuse la suppression d’un profil possédant une séance", async () => {
    const db = new ProfileDatabase();
    const repository = new SqliteProfileRepository(db, () => "profile-1");
    await repository.create(draft);
    db.sessionCount = 1;
    await expect(repository.delete("profile-1")).rejects.toThrow("possède des séances");
    expect(await repository.getById("profile-1")).not.toBeNull();
  });
});
