import { describe, expect, it } from "vitest";
import { ShootingObservation } from "../../domain/shootingObservation";
import type { TechnicalHypothesis } from "../../domain/technicalHypothesis";
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

class HistoricalB5Database implements Database {
  readonly writes: string[] = [];
  constructor(readonly persisted: TechnicalHypothesis) {}
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async getFirstAsync<T>(sql: string) {
    if (sql.includes("FROM series s JOIN sessions")) return {
      session_id: "session", recorded_shot_count: 5, shooter_laterality_snapshot: "right", number_of_hands: 2,
    } as T;
    return null;
  }
  async getAllAsync<T>(sql: string) {
    if (sql.includes("FROM technical_hypotheses")) return [{
      result_json: JSON.stringify(this.persisted), latest_outcome: null,
    }] as T[];
    return [] as T[];
  }
  async runAsync(sql: string, ..._params: SqlParameter[]) {
    this.writes.push(sql);
    return { changes: 1 };
  }
}

it("relit B5 sous D2 sans modifier evidence, rang, score ni SQLite", async () => {
  const persisted: TechnicalHypothesis = {
    id: "legacy-b5", sessionId: "session", seriesId: "series", comparisonId: null, observationId: "observation",
    hypothesisCode: "DOMINANT_HAND_OVERGRIP", category: "grip", status: "requires_confirmation",
    plausibilityLevel: "medium", confidenceLevel: "low", rank: 3, internalScore: 7,
    supportingEvidence: [{ code: "PERSISTED_EVIDENCE", labelFr: "Evidence historique", source: "observation" }],
    contradictingEvidence: [], missingEvidence: [], applicableContext: { numberOfHands: 2 },
    sourceRules: ["legacy-rule"], rulesetVersion: "legacy", generatedAt: "then",
  };
  const database = new HistoricalB5Database(persisted);
  const [reread] = await new SqliteTechnicalHypothesisRepository(database, () => "unused", () => "unused")
    .generateForSeries("series");
  expect(reread).toMatchObject({ hypothesisCode: "TRIGGER_FINGER_HAND_COACTIVATION", category: "trigger",
    rank: 3, internalScore: 7, sourceRules: ["legacy-rule"] });
  expect(reread.supportingEvidence).toEqual(persisted.supportingEvidence);
  expect(database.writes).toEqual([]);
});

it.each([
  "GRIP_CHANGES_BETWEEN_SHOTS", "LOSS_OF_TECHNIQUE_DURING_SERIES",
  "INCONSISTENT_BODY_POSITION", "FATIGUE", "ABRUPT_TRIGGER_PRESS", "INCONSISTENT_TRIGGER_PRESS",
] as const)("relit %s comme code réservé sans réécriture", async (hypothesisCode) => {
  const persisted: TechnicalHypothesis = {
    id: `legacy-${hypothesisCode}`, sessionId: "session", seriesId: "series", comparisonId: null,
    observationId: "observation", hypothesisCode, category: "context_equipment", status: "requires_confirmation",
    plausibilityLevel: "medium", confidenceLevel: "low", rank: 2, internalScore: 5,
    supportingEvidence: [{ code: "PERSISTED_EVIDENCE", labelFr: "Evidence historique", source: "observation" }],
    contradictingEvidence: [], missingEvidence: [], applicableContext: {}, sourceRules: ["legacy-rule"],
    rulesetVersion: "legacy", generatedAt: "then",
  };
  const database = new HistoricalB5Database(persisted);
  const [reread] = await new SqliteTechnicalHypothesisRepository(database, () => "unused", () => "unused")
    .generateForSeries("series");
  expect(reread).toMatchObject({ hypothesisCode, rank: 2, internalScore: 5, sourceRules: ["legacy-rule"] });
  expect(reread.supportingEvidence).toEqual(persisted.supportingEvidence);
  expect(database.writes).toEqual([]);
});
