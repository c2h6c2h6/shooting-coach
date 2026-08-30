import { describe, expect, it } from "vitest";
import { logicalToNormalized, normalizedToLogical, normalizedToPhysical } from "./targetCoordinateConversion";

const geometry = { version: "g1", widthMm: 200, heightMm: 100, centerNormalizedX: .5, centerNormalizedY: .5 };

describe("targetCoordinateConversion", () => {
  it("convertit aller-retour normalisé/logique", () => {
    const logical = normalizedToLogical({ x: .7, y: .2 }, geometry);
    expect(logical).toEqual({ x: .19999999999999996, y: .3 });
    expect(logicalToNormalized(logical, geometry).x).toBeCloseTo(.7);
    expect(logicalToNormalized(logical, geometry).y).toBeCloseTo(.2);
  });
  it("inverse l’axe Y physique", () => {
    expect(normalizedToPhysical({ x: .75, y: .25 }, geometry)).toEqual({ x: 50, y: 25 });
  });
  it("refuse les millimètres si la géométrie n’est pas connue", () => {
    expect(normalizedToPhysical({ x: .5, y: .5 }, { ...geometry, widthMm: null })).toBeNull();
  });
});
