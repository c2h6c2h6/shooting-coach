import { describe, expect, it } from "vitest";
import { calculateSeriesMetrics } from "./seriesMetrics";
import { TargetGeometry } from "./targetCoordinateConversion";

const normalized: TargetGeometry = {
  version: "test-normalized", widthMm: null, heightMm: null,
  centerNormalizedX: 0.5, centerNormalizedY: 0.5,
};
const physical: TargetGeometry = { ...normalized, version: "test-mm", widthMm: 200, heightMm: 100 };
const impact = (id: string, x: number, y: number, isExcluded = false) => ({
  id, normalizedX: x, normalizedY: y, isExcluded,
});
const calculate = (impacts: ReturnType<typeof impact>[], geometry = normalized) =>
  calculateSeriesMetrics({ impacts, expectedShotCount: 5, recordedShotCount: impacts.length, geometry, computedAt: "2026-01-01T00:00:00.000Z" });

describe("seriesMetrics", () => {
  it("retourne des NULL avec zéro impact", () => {
    const result = calculate([]);
    expect(result.normalized.centroidX).toBeNull();
    expect(result.normalized.extremeSpread).toBeNull();
  });
  it("mesure un impact au centre sans inventer de dispersion", () => {
    const result = calculate([impact("a", .5, .5)]);
    expect(result.normalized.centroidDistanceToTargetCenter).toBe(0);
    expect(result.normalized.meanRadius).toBeNull();
    expect(result.shapeClassification).toBe("indeterminate");
  });
  it("inverse Y et convertit en millimètres", () => {
    const result = calculate([impact("a", .75, .25)], physical);
    expect(result.physicalMm?.centroidX).toBe(50);
    expect(result.physicalMm?.centroidY).toBe(25);
  });
  it("calcule deux impacts symétriques explicitement", () => {
    const result = calculate([impact("a", .25, .5), impact("b", .75, .5)]);
    expect(result.normalized.centroidX).toBe(0);
    expect(result.normalized.spreadWidth).toBe(.5);
    expect(result.normalized.spreadHeight).toBe(0);
    expect(result.normalized.extremeSpread).toBe(.5);
    expect(result.normalized.meanRadius).toBe(.25);
  });
  it.each([
    ["horizontal", [[.2,.5],[.5,.5],[.8,.5]]],
    ["vertical", [[.5,.2],[.5,.5],[.5,.8]]],
    ["compact", [[.48,.48],[.5,.5],[.52,.52]]],
    ["both_axes", [[.2,.2],[.8,.2],[.2,.8],[.8,.8]]],
  ] as const)("classe un groupement %s", (shape, coordinates) => {
    expect(calculate(coordinates.map(([x,y], index) => impact(String(index), x, y))).shapeClassification).toBe(shape);
  });
  it("distingue rayon moyen et distance moyenne au centre", () => {
    const result = calculate([impact("a", .7,.5), impact("b", .8,.5)]);
    expect(result.normalized.meanRadius).toBeCloseTo(.05);
    expect(result.normalized.meanDistanceToTargetCenter).toBeCloseTo(.25);
  });
  it("conserve mais exclut explicitement un impact des mesures", () => {
    const result = calculate([impact("a", .5,.5), impact("b", 1,1,true)]);
    expect(result.totalImpactCount).toBe(2);
    expect(result.includedImpactCount).toBe(1);
    expect(result.excludedImpactCount).toBe(1);
    expect(result.includedImpactIds).toEqual(["a"]);
  });
  it("signale un impact éloigné sans l’exclure", () => {
    const result = calculate([
      impact("a",.49,.49), impact("b",.5,.49), impact("c",.49,.5),
      impact("d",.5,.5), impact("far",1,1),
    ]);
    expect(result.potentiallyAtypicalImpactIds).toContain("far");
    expect(result.includedImpactCount).toBe(5);
  });
  it("recalcule après déplacement puis suppression", () => {
    const before = calculate([impact("a", .5,.5), impact("b", .9,.5)]);
    const moved = calculate([impact("a", .5,.5), impact("b", .7,.5)]);
    const deleted = calculate([impact("a", .5,.5)]);
    expect(before.normalized.spreadWidth).toBeCloseTo(.4);
    expect(moved.normalized.spreadWidth).toBeCloseTo(.2);
    expect(deleted.normalized.spreadWidth).toBeNull();
  });
  it("ne mélange pas les impacts de deux séries calculées séparément", () => {
    const first = calculate([impact("s1-a", .2,.5)]);
    const second = calculate([impact("s2-a", .8,.5)]);
    expect(first.includedImpactIds).toEqual(["s1-a"]);
    expect(second.includedImpactIds).toEqual(["s2-a"]);
    expect(first.normalized.centroidX).toBeCloseTo(-.3);
    expect(second.normalized.centroidX).toBeCloseTo(.3);
  });
});
