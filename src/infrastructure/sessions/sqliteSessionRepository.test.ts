import { describe, expect, it } from "vitest";
import { SessionDraft } from "../../domain/session";
import { Database, SqlParameter } from "../database/types";
import { SqliteSessionRepository } from "./sqliteSessionRepository";

type Row = Record<string, string | number | null>;

class SessionDatabase implements Database {
  profile: Row | null = { id: "profile-1", display_name: "Alex", laterality: "left" };
  weapons: Row[] = [
    { id: "glock-19", name: "Glock 19", active: 1 },
    { id: "glock-48", name: "Glock 48", active: 1 },
  ];
  targets: Row[] = [
    { id: "generic-centered", name: "Cible générique centrée", active: 1, width_mm: null, height_mm: null },
  ];
  sessions: Row[] = [];
  series: Row[] = [];
  failNextCompletionWithForeignKey = false;

  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getAllAsync<T>(sql: string) {
    if (sql.includes("FROM weapons")) return this.weapons as T[];
    if (sql.includes("FROM target_types")) return this.targets as T[];
    if (sql.includes("FROM series")) return this.series as T[];
    return this.sessions as T[];
  }
  async getFirstAsync<T>(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("FROM shooter_profiles")) return (this.profile?.id === params[0] ? this.profile : null) as T | null;
    if (sql.includes("FROM weapons")) return (this.weapons.find((row) => row.id === params[0]) ?? null) as T | null;
    if (sql.includes("FROM target_types")) return (this.targets.find((row) => row.id === params[0]) ?? null) as T | null;
    if (sql.includes("FROM series")) return (this.series.find((row) => row.session_id === params[0]) ?? null) as T | null;
    return (this.sessions.find((row) => row.id === params[0]) ?? null) as T | null;
  }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("INSERT INTO series")) {
      const [
        id, session_id, sequence_number, type, expected_shot_count, instruction,
        pedagogical_objective, selected_skill_id, duration_seconds, cadence_type,
        notes, created_at, updated_at,
      ] = params;
      this.series.push({
        id, session_id, sequence_number, type, status: "planned", expected_shot_count,
        recorded_shot_count: 0, instruction, pedagogical_objective, selected_skill_id,
        duration_seconds, cadence_type, notes, started_at: null, completed_at: null,
        created_at, updated_at,
      });
      return { changes: 1 };
    }
    if (sql.includes("INSERT INTO sessions")) {
      const [
        id, shooter_profile_id, mode, weapon_id, distance_mm, number_of_hands, target_type_id,
        objective_type, objective_label, selected_skill_id, shooter_display_name_snapshot,
        shooter_laterality_snapshot, weapon_name_snapshot, target_type_name_snapshot,
        target_width_mm_snapshot, target_height_mm_snapshot, created_at, updated_at,
      ] = params;
      this.sessions.push({
        id, shooter_profile_id, mode, status: "draft", weapon_id, distance_mm, number_of_hands, target_type_id,
        objective_type, objective_label, selected_skill_id, shooter_display_name_snapshot,
        shooter_laterality_snapshot, weapon_name_snapshot, target_type_name_snapshot,
        target_width_mm_snapshot, target_height_mm_snapshot, started_at: null,
        completed_at: null, created_at, updated_at,
      });
      return { changes: 1 };
    }
    if (sql.includes("UPDATE sessions SET status = 'active'")) {
      const [started_at, updated_at, id] = params;
      const row = this.sessions.find((item) => item.id === id && item.status === "draft");
      if (!row) return { changes: 0 };
      Object.assign(row, { status: "active", started_at, updated_at });
      return { changes: 1 };
    }
    if (sql.includes("UPDATE sessions SET status = 'completed'")) {
      if (this.failNextCompletionWithForeignKey) {
        this.failNextCompletionWithForeignKey = false;
        throw new Error("FOREIGN KEY constraint failed");
      }
      const [completed_at, updated_at, id] = params;
      const hasActiveSeries = this.series.some((item) => item.session_id === id && item.status === "active");
      const row = this.sessions.find((item) => item.id === id && item.status === "active");
      if (!row || hasActiveSeries) return { changes: 0 };
      Object.assign(row, { status: "completed", completed_at, updated_at });
      return { changes: 1 };
    }
    return { changes: 0 };
  }
}

const draft: SessionDraft = {
  shooterProfileId: "profile-1",
  mode: "coaching_free",
  weaponId: "glock-48",
  distanceMm: 12500,
  numberOfHands: 2,
  targetTypeId: "generic-centered",
};

describe("SqliteSessionRepository", () => {
  it("crée et relit une séance avec une arme différente de l’arme principale", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1", () => "2026-07-26T14:00:00.000Z");
    const session = await repository.create(draft);
    expect(session).toMatchObject({
      id: "session-1",
      weaponId: "glock-48",
      weaponName: "Glock 48",
      distanceMm: 12500,
      numberOfHands: 2,
      status: "draft",
    });
    expect(await repository.getById("session-1")).toEqual(session);
  });

  it("persiste et relit une séance à 1 main", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    expect((await repository.create({ ...draft, numberOfHands: 1 })).numberOfHands).toBe(1);
    expect((await repository.getById("session-1"))?.numberOfHands).toBe(1);
  });

  it("conserve NULL lors de la lecture d’une ancienne séance", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await repository.create(draft);
    db.sessions[0].number_of_hands = null;
    expect((await repository.getById("session-1"))?.numberOfHands).toBeNull();
  });

  it("refuse une valeur persistée invalide", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await repository.create(draft);
    db.sessions[0].number_of_hands = 3;
    await expect(repository.getById("session-1")).rejects.toThrow("Nombre de mains enregistré invalide");
  });

  it("refuse de créer sans latéralité disponible pour le snapshot", async () => {
    const db = new SessionDatabase();
    db.profile = { id: "profile-1", display_name: "Alex", laterality: null };
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await expect(repository.create(draft)).rejects.toThrow("Snapshot de séance incomplet");
  });

  it("conserve le snapshot si le profil et les référentiels changent ensuite", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await repository.create(draft);
    db.profile!.display_name = "Nom modifié";
    db.weapons[1].name = "Arme renommée";
    const stored = await repository.getById("session-1");
    expect(stored?.shooterDisplayName).toBe("Alex");
    expect(stored?.weaponName).toBe("Glock 48");
  });

  it("fait passer une séance de draft à active et horodate son démarrage", async () => {
    const db = new SessionDatabase();
    let now = "2026-07-26T14:00:00.000Z";
    const repository = new SqliteSessionRepository(db, () => "session-1", () => now);
    await repository.create(draft);
    now = "2026-07-26T14:05:00.000Z";
    const active = await repository.start("session-1");
    expect(active.status).toBe("active");
    expect(active.startedAt).toBe(now);
    expect(db.series).toHaveLength(1);
    expect(db.series[0]).toMatchObject({
      session_id: "session-1",
      sequence_number: 1,
      type: "reference",
      expected_shot_count: 5,
    });
    await expect(repository.start("session-1")).rejects.toThrow("brouillon");
    expect(db.series).toHaveLength(1);
  });

  it("ne crée aucune série automatique en mode training", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "generated-id");
    await repository.create({ ...draft, mode: "training", objectiveLabel: "Stabilité" });
    await repository.start("generated-id");
    expect(db.series).toEqual([]);
  });

  it("termine et conserve une séance sans série active", async () => {
    const db = new SessionDatabase();
    let now = "2026-07-26T14:00:00.000Z";
    const repository = new SqliteSessionRepository(db, () => "session-1", () => now);
    await repository.create({ ...draft, mode: "training", objectiveLabel: "Stabilité" });
    await repository.start("session-1");
    now = "2026-07-26T15:00:00.000Z";
    const completed = await repository.complete("session-1");
    expect(completed).toMatchObject({ status: "completed", completedAt: now });
    expect(await repository.getById("session-1")).toEqual(completed);
  });

  it("répare une ancienne référence puis clôture sans perdre la séance", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await repository.create({ ...draft, mode: "training", objectiveLabel: "Stabilité" });
    await repository.start("session-1");
    db.failNextCompletionWithForeignKey = true;

    const completed = await repository.complete("session-1");

    expect(completed.status).toBe("completed");
    expect(await repository.getById("session-1")).toEqual(completed);
  });

  it("refuse de terminer tant qu’une série est active", async () => {
    const db = new SessionDatabase();
    const repository = new SqliteSessionRepository(db, () => "session-1");
    await repository.create({ ...draft, mode: "training", objectiveLabel: "Stabilité" });
    await repository.start("session-1");
    db.series.push({ id: "series-active", session_id: "session-1", status: "active" });
    await expect(repository.complete("session-1")).rejects.toThrow("série en cours");
  });
});
