import { describe, expect, it } from "vitest";
import { LATEST_DATABASE_VERSION, migrateDatabase, migrations } from "./migrations";
import { Database, SqlParameter } from "./types";

class MigrationDatabase implements Database {
  version = 0;
  statements: string[] = [];
  transactions = 0;
  async execAsync(sql: string) {
    this.statements.push(sql);
    const match = sql.match(/PRAGMA user_version = (\d+)/);
    if (match) this.version = Number(match[1]);
  }
  async runAsync(_sql: string, ..._params: SqlParameter[]) { return { changes: 0 }; }
  async getFirstAsync<T>(_sql: string, ..._params: SqlParameter[]) {
    return { user_version: this.version } as T;
  }
  async getAllAsync<T>(_sql: string, ..._params: SqlParameter[]) { return [] as T[]; }
  async withTransactionAsync(task: () => Promise<void>) {
    this.transactions += 1;
    await task();
  }
}

describe("migrateDatabase", () => {
  it("crée le schéma initial dans une transaction", async () => {
    const database = new MigrationDatabase();
    await migrateDatabase(database);
    expect(database.version).toBe(LATEST_DATABASE_VERSION);
    expect(database.transactions).toBe(13);
    expect(database.statements.join("\n")).toContain("CREATE TABLE shooter_profiles");
    expect(database.statements.join("\n")).toContain("CREATE TABLE app_settings");
    expect(database.statements.join("\n")).toContain("CREATE TABLE sessions");
    expect(database.statements.join("\n")).toContain("CREATE TABLE weapons");
    expect(database.statements.join("\n")).toContain("CREATE TABLE target_types");
    expect(database.statements.join("\n")).toContain("CREATE TABLE series");
    expect(database.statements.join("\n")).toContain("UNIQUE(session_id, sequence_number)");
    expect(database.statements.join("\n")).toContain("series_one_active_per_session_idx");
    expect(database.statements.join("\n")).toContain("sessions_prevent_completion_with_active_series");
    expect(database.statements.join("\n")).toContain("CREATE TABLE impacts");
    expect(database.statements.join("\n")).toContain("CREATE TABLE series_metrics");
    expect(database.statements.join("\n")).toContain("CREATE TABLE series_comparisons");
    expect(database.statements.join("\n")).toContain("CREATE TABLE shooting_observations");
    expect(database.statements.join("\n")).toContain("CREATE TABLE technical_hypotheses");
    expect(database.statements.join("\n")).toContain("CREATE TABLE diagnostic_answers");
    expect(database.statements.join("\n")).toContain("CREATE TABLE confirmation_test_runs");
    expect(database.statements.join("\n")).toContain("CREATE TABLE reasoning_traces");
    expect(database.statements.join("\n")).toContain("CREATE TABLE synthetic_demo_runs");
    expect(database.statements.join("\n")).toContain("completed_series_immutable");
    expect(database.statements.join("\n")).toContain("CREATE TABLE coaching_recommendations");
    expect(database.statements.join("\n")).toContain("CREATE TABLE coaching_cycles");
    expect(database.statements.join("\n")).toContain("CREATE TABLE session_safety_contexts");
    expect(database.statements.join("\n")).toContain("ADD COLUMN number_of_hands INTEGER NULL");
    expect(database.statements.join("\n")).toContain("impacts_update_active_series_v8");
    expect(database.statements.join("\n")).toContain("UNIQUE(series_id, sequence_number)");
    expect(database.statements.join("\n")).toContain("impacts_insert_active_series");
    expect(database.statements.join("\n")).toContain("ON DELETE RESTRICT");
  });

  it("est idempotente lorsque la base est à jour", async () => {
    const database = new MigrationDatabase();
    database.version = LATEST_DATABASE_VERSION;
    await migrateDatabase(database);
    expect(database.transactions).toBe(0);
  });

  it("applique les migrations 2 à 13 à une base issue de l’étape 2", async () => {
    const database = new MigrationDatabase();
    database.version = 1;
    await migrateDatabase(database);
    expect(database.version).toBe(13);
    expect(database.transactions).toBe(12);
    expect(database.statements.join("\n")).toContain("CREATE TABLE sessions");
    expect(database.statements.join("\n")).not.toContain("CREATE TABLE shooter_profiles");
  });

  it("applique les migrations 3 à 13 à une base issue de l’étape 3", async () => {
    const database = new MigrationDatabase();
    database.version = 2;
    await migrateDatabase(database);
    expect(database.version).toBe(13);
    expect(database.transactions).toBe(11);
    expect(database.statements.join("\n")).toContain("CREATE TABLE series");
    expect(database.statements.join("\n")).not.toContain("CREATE TABLE sessions");
  });

  it("applique les migrations 4 à 13 à une base issue de l’étape 4", async () => {
    const database = new MigrationDatabase();
    database.version = 3;
    await migrateDatabase(database);
    expect(database.version).toBe(13);
    expect(database.transactions).toBe(10);
    expect(database.statements.join("\n")).toContain("CREATE TABLE impacts");
    expect(database.statements.join("\n")).not.toContain("CREATE TABLE series (");
  });

  it("applique les migrations 5 à 13 à une base issue de l’étape 5", async () => {
    const database = new MigrationDatabase();
    database.version = 4;
    await migrateDatabase(database);
    expect(database.version).toBe(13);
    expect(database.transactions).toBe(9);
    expect(database.statements.join("\n")).toContain("CREATE TABLE series_metrics");
    expect(database.statements.join("\n")).toContain("CREATE TABLE series_comparisons");
    expect(database.statements.join("\n")).toContain("series_metrics_invalidate_comparisons_update");
    expect(database.statements.join("\n")).not.toContain("CREATE TABLE impacts");
  });

  it("refuse une base plus récente que l’application", async () => {
    const database = new MigrationDatabase();
    database.version = LATEST_DATABASE_VERSION + 1;
    await expect(migrateDatabase(database)).rejects.toThrow("application limitée");
  });

  it("rétablit l’immuabilité SQLite des séries terminées", () => {
    const migration = migrations.find((item) => item.version === 8);
    expect(migration?.sql).toContain("DROP TRIGGER impacts_insert_editable_series");
    expect(migration?.sql).toContain("<> 'active'");
    expect(migration?.sql).toContain("completed impacts are read only");
  });

  it("ajoute exactement la colonne nullable contrôlée en migration 13", () => {
    const migration = migrations.find((item) => item.version === 13);
    expect(migration?.sql).toContain("ALTER TABLE sessions");
    expect(migration?.sql).toContain("ADD COLUMN number_of_hands INTEGER NULL");
    expect(migration?.sql).toContain("CHECK(number_of_hands IN (1, 2))");
  });
});
