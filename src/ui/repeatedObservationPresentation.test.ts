import { describe, expect, it } from "vitest";
import { categoryByCode, ObservationCode } from "../domain/observationCatalog";
import { ShootingObservation } from "../domain/shootingObservation";
import { repeatedObservationRows } from "./repeatedObservationPresentation";

function repeated(
  id: string,
  observationCode: ObservationCode,
  seriesIds: string[],
): ShootingObservation {
  return {
    id,
    sessionId: "session-1",
    seriesId: null,
    comparisonId: null,
    observationCode,
    category: categoryByCode[observationCode],
    scope: "session_pattern",
    status: "confirmed_by_rules",
    magnitude: null,
    confidenceLevel: "medium",
    rank: "secondary",
    supportingMetrics: {
      occurrences: seriesIds.length,
      series: seriesIds.map((seriesId, index) => ({ seriesId, sequenceNumber: index + 1 })),
    },
    limitingFactors: [],
    algorithmVersion: "test",
    rulesetVersion: "test",
    thresholdsVersion: "test",
    sourceVersion: "test",
    generatedAt: "2026-08-26T00:00:00.000Z",
  };
}

describe("présentation des observations répétées", () => {
  it("reproduit puis élimine deux lignes persistées du même concept sur deux séries", () => {
    const rows = repeatedObservationRows([
      repeated("duplicate-a", "COMPACT_GROUP", ["series-1", "series-2"]),
      repeated("duplicate-b", "COMPACT_GROUP", ["series-1", "series-2"]),
    ]);

    expect(rows).toEqual([{ observationCode: "COMPACT_GROUP", seriesCount: 2 }]);
  });

  it("compte trois séries distinctes sans doubler les séries communes", () => {
    const rows = repeatedObservationRows([
      repeated("first-load", "COMPACT_GROUP", ["series-1", "series-2"]),
      repeated("reload", "COMPACT_GROUP", ["series-2", "series-3"]),
    ]);

    expect(rows).toEqual([{ observationCode: "COMPACT_GROUP", seriesCount: 3 }]);
  });

  it("conserve séparément deux concepts canoniques distincts", () => {
    const rows = repeatedObservationRows([
      repeated("tight", "COMPACT_GROUP", ["series-1", "series-2"]),
      repeated("centered", "CENTERED", ["series-1", "series-2"]),
    ]);

    expect(rows).toEqual([
      { observationCode: "COMPACT_GROUP", seriesCount: 2 },
      { observationCode: "CENTERED", seriesCount: 2 },
    ]);
  });

  it("reste stable après rechargements répétés du même résultat", () => {
    const persisted = repeated("persisted", "COMPACT_GROUP", ["series-1", "series-2"]);
    expect(repeatedObservationRows([persisted, { ...persisted, id: "reloaded" }]))
      .toEqual(repeatedObservationRows([persisted]));
  });
});
