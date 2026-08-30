import { describe, expect, it } from "vitest";
import { ShootingObservation } from "../../domain/shootingObservation";
import { Database, SqlParameter } from "../database/types";
import { SqliteTechnicalHypothesisRepository } from "./sqliteTechnicalHypothesisRepository";

class HypothesisDatabase implements Database {
  readonly saved: unknown[] = [];
  constructor(readonly numberOfHands: 1 | 2 | null) {}
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getFirstAsync<T>(sql: string) {
    if (sql.includes("FROM series s JOIN sessions")) return {
      session_id: "session", recorded_shot_count: 5, shooter_laterality_snapshot: "right",
      number_of_hands: this.numberOfHands,
    } as T;
    return null;
  }
  async getAllAsync<T>(sql: string) {
    if (sql.includes("FROM shooting_observations")) return [{ result_json: JSON.stringify(observation()) }] as T[];
    return [] as T[];
  }
  async runAsync(sql: string, ...params: SqlParameter[]) {
    if (sql.includes("INSERT INTO technical_hypotheses")) this.saved.push(JSON.parse(String(params.at(-1))));
    return { changes: 1 };
  }
}

function observation(): ShootingObservation {
  return {
    id: "observation", sessionId: "session", seriesId: "series", comparisonId: null,
    observationCode: "HORIZONTAL_SPREAD", category: "dispersion_shape", scope: "single_series",
    status: "confirmed_by_rules", magnitude: "medium", confidenceLevel: "low", rank: "primary",
    supportingMetrics: {}, limitingFactors: [], algorithmVersion: "test", rulesetVersion: "test",
    thresholdsVersion: "test", sourceVersion: "test", generatedAt: "now",
  };
}

describe("contexte numberOfHands des séries d’une séance", () => {
  it.each(["series-diagnostic", "series-corrective"])("transmet le contexte de séance à %s", async (seriesId) => {
    const database = new HypothesisDatabase(1);
    const result = await new SqliteTechnicalHypothesisRepository(database, () => "hypothesis", () => "now")
      .generateForSeries(seriesId);
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((item) => item.applicableContext.numberOfHands === 1)).toBe(true);
    expect(result.some((item) => item.hypothesisCode === "UNBALANCED_HAND_PRESSURE")).toBe(false);
  });
});
