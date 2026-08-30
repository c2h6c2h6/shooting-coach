import { describe, expect, it } from "vitest";
import { normalizedToScreen, screenToNormalized } from "./targetGeometry";

describe("géométrie de cible", () => {
  const size = { width: 200, height: 100 };
  it.each([
    [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    [{ x: 0.5, y: 0.5 }, { x: 100, y: 50 }],
    [{ x: 1, y: 1 }, { x: 200, y: 100 }],
    [{ x: 0.25, y: 0.75 }, { x: 50, y: 75 }],
  ])("convertit les points connus", (normalized, screen) => {
    expect(normalizedToScreen(normalized, size)).toEqual(screen);
    expect(screenToNormalized(screen, size)).toEqual(normalized);
  });
  it("reste invariant après changement de taille", () => {
    const p = { x: 0.27, y: 0.82 };
    expect(screenToNormalized(normalizedToScreen(p, size), size).x).toBeCloseTo(p.x);
    expect(screenToNormalized(normalizedToScreen(p, size), size).y).toBeCloseTo(p.y);
    const larger = { width: 800, height: 600 };
    expect(screenToNormalized(normalizedToScreen(p, larger), larger).x).toBeCloseTo(p.x);
    expect(screenToNormalized(normalizedToScreen(p, larger), larger).y).toBeCloseTo(p.y);
  });
  it("reste invariant avec zoom et déplacement simulés", () => {
    const p = { x: 0.25, y: 0.75 };
    const view = { zoom: 2.4, panX: 31, panY: -18 };
    const result = screenToNormalized(normalizedToScreen(p, size, view), size, view);
    expect(result.x).toBeCloseTo(p.x);
    expect(result.y).toBeCloseTo(p.y);
  });
});
