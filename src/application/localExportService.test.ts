import { describe, expect, it, vi } from "vitest";
import { Database, SqlParameter } from "../infrastructure/database/types";
import { buildSessionReport } from "./localExportService";

vi.mock("expo-file-system", () => ({ File: class {}, Paths: { cache: "" } }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: async () => false, shareAsync: async () => undefined }));
vi.mock("expo-crypto", () => ({ CryptoDigestAlgorithm: { SHA256: "SHA-256" }, digestStringAsync: async () => "digest" }));

function database(session: Record<string, unknown>): Database {
  return {
    execAsync: async () => undefined,
    runAsync: async () => ({ changes: 0 }),
    getFirstAsync: async () => null,
    getAllAsync: async <T>(sql: string, ..._params: SqlParameter[]) =>
      (sql.startsWith("SELECT * FROM sessions ") ? [session] : []) as T[],
    withTransactionAsync: async (task) => task(),
  };
}

describe("export unitaire de séance", () => {
  it("inclut number_of_hands lorsqu’il existe", async () => {
    const report = await buildSessionReport(database({ id: "session-1", number_of_hands: 1 }), "session-1");
    expect(report.session).toMatchObject({ id: "session-1", number_of_hands: 1 });
  });

  it("accepte une ancienne séance exportée sans le champ", async () => {
    const report = await buildSessionReport(database({ id: "legacy-session" }), "legacy-session");
    expect(report.session).toEqual({ id: "legacy-session" });
  });
});
