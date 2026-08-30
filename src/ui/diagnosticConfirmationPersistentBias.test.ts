import { describe, expect, it } from "vitest";
import type { Series } from "../domain/series";
import { compareSeries, type ComparableSeriesContext } from "../domain/seriesComparison";
import { calculateSeriesMetrics } from "../domain/seriesMetrics";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "../domain/targetCoordinateConversion";
import { deriveDiagnosticConfirmationResult } from "./diagnosticConfirmationFlow";

const timestamp = "2026-08-26T12:00:00.000Z";
const geometry = {
  version: UNVERIFIED_TARGET_GEOMETRY_VERSION,
  widthMm: null,
  heightMm: null,
  centerNormalizedX: .5,
  centerNormalizedY: .5,
};
const sourceSeries: Series = {
  id: "series-source", sessionId: "session-1", sequenceNumber: 1, type: "reference",
  expectedShotCount: 5, recordedShotCount: 5, status: "completed", cadenceType: "free",
  startedAt: timestamp, completedAt: timestamp, createdAt: timestamp, updatedAt: timestamp,
};
const diagnosticSeries: Series = {
  ...sourceSeries, id: "series-diagnostic", sequenceNumber: 2, type: "diagnostic",
};

function clustered(centerX: number, centerY = .5) {
  return [
    [centerX - .005, centerY - .005], [centerX + .005, centerY - .005],
    [centerX - .005, centerY + .005], [centerX + .005, centerY + .005],
    [centerX, centerY],
  ] as const;
}

function metrics(centerX: number) {
  return calculateSeriesMetrics({
    impacts: clustered(centerX).map(([normalizedX, normalizedY], index) => ({
      id: `impact-${index + 1}`, normalizedX, normalizedY, isExcluded: false,
    })),
    expectedShotCount: 5,
    recordedShotCount: 5,
    geometry,
    computedAt: timestamp,
  });
}

function context(id: string, numberOfHands: 1 | 2 = 2): ComparableSeriesContext {
  return {
    id, sessionId: "session-1", status: "completed", weaponId: "weapon-1",
    distanceMm: 7000, numberOfHands, targetTypeId: "target-1",
    targetGeometryVersion: geometry.version,
  };
}

function run(sourceCenterX: number, diagnosticCenterX: number, diagnosticHands: 1 | 2 = 2) {
  const comparison = {
    id: "comparison-1",
    computedAt: timestamp,
    ...compareSeries({
      baseline: context(sourceSeries.id),
      compared: context(diagnosticSeries.id, diagnosticHands),
      baselineMetrics: metrics(sourceCenterX),
      comparedMetrics: metrics(diagnosticCenterX),
      comparisonType: "manual",
    }),
  };
  return {
    comparison,
    result: deriveDiagnosticConfirmationResult({ comparison, sourceSeries, diagnosticSeries }),
  };
}

describe("confirmation contextuelle d’un biais constant", () => {
  it("renforce un décalage gauche quasi identique", () => {
    const { comparison, result } = run(.35, .355);

    expect(comparison.differences.horizontalOffset?.baselineValue).toBeCloseTo(-.15);
    expect(comparison.differences.horizontalOffset?.comparedValue).toBeCloseTo(-.145);
    expect(comparison.differences.horizontalOffset?.variation).toBe("stable");
    expect(result.conclusion).toBe("strengthened");
    expect(result.headline).toBe("Le décalage se reproduit dans des conditions comparables.");
  });

  it("ne déclare pas non reproduit un biais gauche qui persiste mais diminue", () => {
    const { comparison, result } = run(.35, .43);

    expect(comparison.differences.horizontalOffset?.baselineValue).toBeCloseTo(-.15);
    expect(comparison.differences.horizontalOffset?.comparedValue).toBeCloseTo(-.07);
    expect(comparison.differences.horizontalOffset?.variation).toBe("notable");
    expect(comparison.differences.centroidDistanceToTargetCenter?.baselineValue).toBeCloseTo(.15);
    expect(comparison.differences.centroidDistanceToTargetCenter?.comparedValue).toBeCloseTo(.07);
    expect(comparison.differences.centroidDistanceToTargetCenter?.delta).toBeCloseTo(-.08);
    expect(comparison.differences.centroidDistanceToTargetCenter?.variation).toBe("notable");
    expect(result).toMatchObject({
      conclusion: "inconclusive",
      headline: "Le décalage persiste dans la même direction, mais il diminue.",
      interpretation: "La piste d’un biais constant reste possible, sans être renforcée ni écartée par cette amélioration partielle.",
    });
  });

  it("affaiblit le biais quand la série diagnostique est centrée", () => {
    const { comparison, result } = run(.35, .5);

    expect(comparison.differences.centroidDistanceToTargetCenter?.comparedValue).toBeCloseTo(0);
    expect(result.conclusion).toBe("weakened");
    expect(result.headline).toBe("Le décalage ne se reproduit pas dans cette série.");
  });

  it("reste inconclusif lorsque le décalage passe de gauche à droite", () => {
    const { comparison, result } = run(.35, .65);

    expect(comparison.differences.horizontalOffset?.baselineValue).toBeCloseTo(-.15);
    expect(comparison.differences.horizontalOffset?.comparedValue).toBeCloseTo(.15);
    expect(comparison.differences.horizontalOffset?.variation).toBe("notable");
    expect(result.conclusion).toBe("inconclusive");
  });

  it("reste inconclusif lorsque les conditions ne sont pas comparables", () => {
    const { comparison, result } = run(.35, .35, 1);

    expect(comparison.status).toBe("not_comparable");
    expect(comparison.reasons).toContain("Les nombres de mains utilisés diffèrent.");
    expect(result.conclusion).toBe("inconclusive");
  });
});
