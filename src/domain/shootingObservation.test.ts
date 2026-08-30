import { describe, expect, it } from "vitest";
import { calculateSeriesMetrics, SeriesMetrics } from "./seriesMetrics";
import { compareSeries, SeriesComparison } from "./seriesComparison";
import { observeComparison, observeSeries, repeatedSessionObservations } from "./shootingObservation";
import { observationCodes } from "./observationCatalog";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "./targetCoordinateConversion";

const geometry = {
  version: UNVERIFIED_TARGET_GEOMETRY_VERSION, widthMm: null, heightMm: null,
  centerNormalizedX: .5, centerNormalizedY: .5,
};
const impact = (id: string, x: number, y: number, isExcluded = false) =>
  ({ id, normalizedX: x, normalizedY: y, isExcluded });
function metrics(points: ReadonlyArray<readonly [number, number]>, options: { excluded?: number; recorded?: number; expected?: number } = {}) {
  const included = points.map(([x, y], index) => impact(`i${index}`, x, y));
  const excluded = Array.from({ length: options.excluded ?? 0 }, (_, index) =>
    impact(`x${index}`, .9, .9, true));
  return calculateSeriesMetrics({
    impacts: [...included, ...excluded], expectedShotCount: options.expected ?? points.length,
    recordedShotCount: options.recorded ?? points.length, geometry, computedAt: "2026-01-01",
  });
}
const codes = (result: ReturnType<typeof observeSeries>) =>
  [result.primary, ...result.secondary, ...result.limitations]
    .filter((item) => item !== null).map((item) => item!.observationCode);

describe("catalogue d’observations", () => {
  it("contient les 40 codes structurés attendus sans vocabulaire causal", () => {
    expect(observationCodes).toHaveLength(40);
    expect(observationCodes.join(" ")).not.toMatch(/TRIGGER|ANTICIPATION|GRIP|FATIGUE|STRESS|EXERCISE/);
  });
});

describe("observations d’une série", () => {
  it("ne conclut pas sans impact", () => {
    const result = observeSeries({ sessionId: "a", seriesId: "s", metrics: metrics([]) });
    expect(result.primary).toBeNull();
    expect(codes(result)).toContain("INSUFFICIENT_IMPACTS");
  });
  it.each([
    [1, [[.5, .5]]], [2, [[.48, .5], [.52, .5]]], [4, [[.48,.48],[.52,.48],[.48,.52],[.52,.52]]],
  ] as const)("reste prudent avec %i impact(s)", (_count, points) => {
    expect(codes(observeSeries({ sessionId: "a", seriesId: "s", metrics: metrics([...points]) })))
      .toContain("SHAPE_UNDETERMINED");
  });
  it("active la forme complète à cinq impacts", () => {
    const result = observeSeries({ sessionId: "a", seriesId: "s",
      metrics: metrics([[.48,.5],[.49,.5],[.5,.5],[.51,.5],[.52,.5]]) });
    expect(codes(result)).toContain("CENTERED_AND_COMPACT");
  });
  it.each([
    ["OFFSET_LEFT", -.12, 0], ["OFFSET_RIGHT", .12, 0],
    ["OFFSET_HIGH", 0, .12], ["OFFSET_LOW", 0, -.12],
    ["OFFSET_HIGH_LEFT", -.12, .12], ["OFFSET_HIGH_RIGHT", .12, .12],
    ["OFFSET_LOW_LEFT", -.12, -.12], ["OFFSET_LOW_RIGHT", .12, -.12],
  ] as const)("détecte %s sans redondance directionnelle", (expected, x, y) => {
    const points = [[x-.01,y],[x+.01,y],[x,y-.01],[x,y+.01],[x,y]]
      .map(([px, py]) => [px + .5, .5 - py] as [number, number]);
    const result = observeSeries({ sessionId: "a", seriesId: "s", metrics: metrics(points) });
    expect(result.primary?.observationCode).toBe("COMPACT_BUT_OFFSET");
    expect(codes(result)).toContain(expected);
    expect(codes(result).filter((code) => code.startsWith("OFFSET_"))).toHaveLength(1);
  });
  it("marque la proximité du seuil comme tentative", () => {
    const result = observeSeries({ sessionId: "a", seriesId: "s",
      metrics: metrics([[.529,.5],[.529,.5],[.529,.5],[.529,.5],[.529,.5]]) });
    expect(codes(result)).toContain("OFFSET_DIRECTION_UNCERTAIN");
  });
  it.each([
    ["COMPACT_GROUP", [[.49,.49],[.5,.5],[.51,.51],[.49,.51],[.51,.49]]],
    ["WIDE_GROUP", [[.2,.2],[.8,.8],[.2,.8],[.8,.2],[.5,.5]]],
    ["HORIZONTAL_SPREAD", [[.35,.5],[.42,.51],[.5,.49],[.58,.51],[.65,.5]]],
    ["VERTICAL_SPREAD", [[.5,.35],[.51,.42],[.49,.5],[.51,.58],[.5,.65]]],
    ["TWO_AXIS_SPREAD", [[.395,.395],[.605,.605],[.395,.605],[.605,.395],[.5,.5]]],
  ] as const)("classifie la dispersion %s", (expected, points) => {
    expect(codes(observeSeries({ sessionId: "a", seriesId: "s", metrics: metrics([...points]) })))
      .toContain(expected);
  });
  it("combine centré/dispersé et conserve les éléments détaillés", () => {
    const result = observeSeries({ sessionId: "a", seriesId: "s",
      metrics: metrics([[.2,.5],[.8,.5],[.5,.2],[.5,.8],[.5,.5]]) });
    expect(result.primary?.observationCode).toBe("CENTERED_BUT_DISPERSED");
    expect(codes(result)).toEqual(expect.arrayContaining(["CENTERED", "WIDE_GROUP"]));
  });
  it("signale atypique, exclusions, incohérence de coups, manuel et géométrie", () => {
    const result = observeSeries({ sessionId: "a", seriesId: "s",
      metrics: metrics([[.49,.5],[.5,.49],[.51,.5],[.5,.51],[.95,.95]],
        { excluded: 1, recorded: 7, expected: 7 }) });
    expect(codes(result)).toEqual(expect.arrayContaining([
      "OUTLIER_TO_VERIFY", "EXCLUDED_IMPACTS_PRESENT", "SHOT_COUNT_MISMATCH",
      "MANUAL_INPUT_LIMITATION", "TARGET_GEOMETRY_UNVERIFIED",
    ]));
    expect(result.secondary.length).toBeLessThanOrEqual(3);
  });
  it("reste invariant selon la latéralité car elle n’entre pas dans le moteur", () => {
    const value = metrics([[.3,.5],[.31,.5],[.29,.5],[.3,.49],[.3,.51]]);
    const generatedAt = "2026-07-29T10:00:00.000Z";
    expect(observeSeries({ sessionId: "a", seriesId: "s", metrics: value, generatedAt }))
      .toEqual(observeSeries({ sessionId: "a", seriesId: "s", metrics: value, generatedAt }));
  });
});

function comparison(a: SeriesMetrics, b: SeriesMetrics): SeriesComparison {
  return { id: "c", computedAt: "2026-01-01", ...compareSeries({
    baseline: { id: "s1", sessionId: "a", status: "completed", weaponId: "w",
      distanceMm: 10000, numberOfHands: 2, targetTypeId: "t", targetGeometryVersion: geometry.version },
    compared: { id: "s2", sessionId: "a", status: "completed", weaponId: "w",
      distanceMm: 10000, numberOfHands: 2, targetTypeId: "t", targetGeometryVersion: geometry.version },
    baselineMetrics: a, comparedMetrics: b, comparisonType: "reference",
  }) };
}
describe("observations comparatives", () => {
  it("décrit stabilité et absence de changement notable", () => {
    const value = metrics([[.4,.5],[.45,.5],[.5,.5],[.55,.5],[.6,.5]]);
    const result = observeComparison({ comparison: comparison(value, value) });
    expect(result.primary?.observationCode).toBe("NO_NOTABLE_CHANGE");
  });
  it("décrit rapprochement et resserrement sans causalité", () => {
    const a = metrics([[.15,.4],[.25,.6],[.2,.5],[.3,.5],[.1,.5]]);
    const b = metrics([[.47,.49],[.53,.51],[.5,.5],[.49,.51],[.51,.49]]);
    const result = observeComparison({ comparison: comparison(a, b) });
    const observed = [result.primary, ...result.secondary].map((item) => item?.observationCode);
    expect(observed).toEqual(expect.arrayContaining(["CENTER_MOVED_CLOSER", "GROUP_TIGHTER"]));
    expect(JSON.stringify(result)).not.toMatch(/correction|technique|doigt|exercice/i);
  });
  it("décrit éloignement, élargissement et changement de forme", () => {
    const a = metrics([[.49,.49],[.5,.5],[.51,.51],[.49,.51],[.51,.49]]);
    const b = metrics([[.2,.3],[.8,.3],[.5,.3],[.3,.3],[.7,.3]]);
    const observed = observeComparison({ comparison: comparison(a, b) });
    expect([observed.primary, ...observed.secondary].map((item) => item?.observationCode))
      .toEqual(expect.arrayContaining(["CENTER_MOVED_FARTHER", "GROUP_WIDER", "SHAPE_CHANGED"]));
  });
  it("sait limiter une comparaison impossible", () => {
    const value = comparison(metrics([]), metrics([]));
    expect(observeComparison({ comparison: value }).primary?.observationCode).toBe("COMPARISON_LIMITED");
  });
});

describe("répétitions de séance", () => {
  it("retient une même observation sur deux séries et sépare les séances", () => {
    const left = observeSeries({ sessionId: "a", seriesId: "s1",
      metrics: metrics([[.3,.5],[.31,.5],[.29,.5],[.3,.49],[.3,.51]]) });
    const result = repeatedSessionObservations({ sessionId: "a", bySeries: [
      { seriesId: "s1", sequenceNumber: 1, observations: left },
      { seriesId: "s2", sequenceNumber: 2, observations: left },
    ] });
    expect(result.some((item) => item.observationCode === "OFFSET_LEFT")).toBe(true);
    expect(result.every((item) => item.sessionId === "a")).toBe(true);
  });
});
