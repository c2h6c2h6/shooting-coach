import { describe, expect, it } from "vitest";
import type { CoachingCycle, ConfirmationTestRun } from "../../domain/coachingTypes";
import type { TechnicalHypothesis } from "../../domain/technicalHypothesis";
import type { Database, SqlParameter } from "../database/types";
import { SqliteCoachingRepository } from "./sqliteCoachingRepository";
import { SqliteTechnicalHypothesisRepository } from "../hypotheses/sqliteTechnicalHypothesisRepository";

const timestamp = "2026-08-26T00:00:00.000Z";

function cycle(id: string, hypothesisId: string, testId: string, status: CoachingCycle["status"]): CoachingCycle {
  return { id, sessionId: "session", sourceSeriesId: "series", hypothesisId,
    confirmationTestRunId: testId, recommendationId: null, drillCode: null, controlSeriesId: null,
    status, outcome: null, objective: null, startedAt: timestamp, completedAt: null,
    invalidatedAt: null, invalidationReason: null, rulesetVersion: "coaching-rules-v1" };
}

function testRun(id: string, hypothesisId: string,
  outcome: ConfirmationTestRun["outcome"]): ConfirmationTestRun {
  return { id, sessionId: "session", sourceSeriesId: "series", hypothesisId,
    testCode: "TEST_SIGHT_STABILITY_DRY", status: "completed", startedAt: timestamp,
    completedAt: timestamp, outcome, observations: [], userAnswers: {}, confidenceBefore: "low",
    confidenceAfter: "low", hypothesisStatusBefore: "requires_confirmation",
    hypothesisStatusAfter: outcome === "does_not_support_hypothesis" ? "requires_confirmation" : null,
    generatedSeriesId: null, rulesetVersion: "coaching-rules-v1" };
}

class CompatibilityDatabase implements Database {
  constructor(
    private readonly cycles: CoachingCycle[],
    private readonly tests: ConfirmationTestRun[],
    private readonly hypotheses: Array<{ hypothesis: TechnicalHypothesis; outcome: ConfirmationTestRun["outcome"] }> = [],
  ) {}
  async execAsync(_sql: string) {}
  async withTransactionAsync(task: () => Promise<void>) { await task(); }
  async runAsync(_sql: string, ..._params: SqlParameter[]) { return { changes: 0 }; }
  async getFirstAsync<T>(sql: string, ..._params: SqlParameter[]) {
    if (sql.includes("FROM confirmation_test_runs WHERE id")) {
      const id = String(_params[0]);
      const value = this.tests.find(item => item.id === id);
      return (value ? { result_json: JSON.stringify(value) } : null) as T | null;
    }
    if (sql.includes("FROM series s JOIN sessions")) return {
      session_id: "session", recorded_shot_count: 5, shooter_laterality_snapshot: "right", number_of_hands: 2,
    } as T;
    return null;
  }
  async getAllAsync<T>(sql: string) {
    if (sql.includes("FROM coaching_cycles")) return this.cycles.map(item => ({ result_json: JSON.stringify(item) })) as T[];
    if (sql.includes("FROM technical_hypotheses th")) return this.hypotheses.map(item => ({
      result_json: JSON.stringify(item.hypothesis), latest_outcome: item.outcome,
    })) as T[];
    if (sql.includes("FROM shooting_observations")) return [] as T[];
    return [] as T[];
  }
}

function hypothesis(id: string, rank: number,
  code: TechnicalHypothesis["hypothesisCode"] = rank === 1 ? "LATERAL_TRIGGER_PRESSURE" : "ABRUPT_TRIGGER_PRESS"):
TechnicalHypothesis {
  return { id, sessionId: "session", seriesId: "series", comparisonId: null,
    observationId: `observation-${rank}`, hypothesisCode: code,
    category: "trigger", status: "requires_confirmation", plausibilityLevel: "medium", confidenceLevel: "low",
    rank, internalScore: 5 - rank, supportingEvidence: [], contradictingEvidence: [], missingEvidence: [],
    applicableContext: { numberOfHands: 2 }, sourceRules: [], rulesetVersion: "technical-hypothesis-rules-v1",
    generatedAt: timestamp };
}

describe("compatibilité de lecture v13 does_not_support", () => {
  it("ignore l’ancien cycle H1 test_completed et retrouve le cycle H2 actif", async () => {
    const h1Cycle = cycle("cycle-h1", "h1", "test-h1", "test_completed");
    const h2Cycle = cycle("cycle-h2", "h2", "test-h2", "test_pending");
    const repository = new SqliteCoachingRepository(new CompatibilityDatabase(
      [h1Cycle, h2Cycle],
      [testRun("test-h1", "h1", "does_not_support_hypothesis"), testRun("test-h2", "h2", null)],
    ));
    expect((await repository.getActiveCycle("session"))?.cycle.id).toBe("cycle-h2");
  });

  it("ne considère pas un ancien H1 négatif comme cycle actif s’il est seul", async () => {
    const repository = new SqliteCoachingRepository(new CompatibilityDatabase(
      [cycle("cycle-h1", "h1", "test-h1", "test_completed")],
      [testRun("test-h1", "h1", "does_not_support_hypothesis")],
    ));
    expect(await repository.getActiveCycle("session")).toBeNull();
  });

  it("relit H1 comme weakened sans modifier rang ni score et conserve H2", async () => {
    const h1 = hypothesis("h1", 1), h2 = hypothesis("h2", 2);
    const repository = new SqliteTechnicalHypothesisRepository(new CompatibilityDatabase([], [], [
      { hypothesis: h1, outcome: "does_not_support_hypothesis" }, { hypothesis: h2, outcome: null },
    ]), () => "unused", () => timestamp);
    const result = await repository.generateForSeries("series");
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "h1", status: "weakened", rank: 1, internalScore: 4 });
    expect(result[1]).toEqual(h2);
  });

  it.each(["TRIGGER_FINGER_TOO_LITTLE", "TRIGGER_FINGER_TOO_DEEP"] as const)(
    "relit une ancienne session %s comme D2 fonctionnelle sans migration", async historicalCode => {
      const historical = { ...hypothesis(`legacy-${historicalCode}`, 2, historicalCode), internalScore: 6 };
      const repository = new SqliteTechnicalHypothesisRepository(new CompatibilityDatabase([], [], [
        { hypothesis: historical, outcome: null },
      ]), () => "unused", () => timestamp);
      const [result] = await repository.generateForSeries("series");
      expect(result).toMatchObject({ id: historical.id, hypothesisCode: "LATERAL_TRIGGER_PRESSURE",
        rank: 2, internalScore: 6 });
      expect(result.supportingEvidence.at(-1)?.code).toBe("HISTORICAL_TRIGGER_FINGER_PLACEMENT");
    });
});
