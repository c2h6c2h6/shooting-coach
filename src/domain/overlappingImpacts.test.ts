import { describe, expect, it } from "vitest";
import { Impact } from "./impact";
import { impactsNear, nextOverlappingImpactId } from "./overlappingImpacts";

const impact = (id: string, sequenceNumber: number, x: number, y: number): Impact => ({
  id,
  seriesId: "series-1",
  sequenceNumber,
  normalizedX: x,
  normalizedY: y,
  source: "manual",
  confidence: null,
  physicalXmm: null,
  physicalYmm: null,
  targetX: null,
  targetY: null,
  isExcluded: false,
  exclusionReason: null,
  createdAt: "2026-07-29T00:00:00.000Z",
  updatedAt: "2026-07-29T00:00:00.000Z",
});

describe("overlapping impacts", () => {
  const impacts = [
    impact("second", 2, 0.501, 0.501),
    impact("first", 1, 0.5, 0.5),
    impact("far", 3, 0.8, 0.8),
  ];

  it("finds close impacts and keeps their shot order", () => {
    expect(impactsNear(impacts, 0.5, 0.5, 0.01).map(({ id }) => id))
      .toEqual(["first", "second"]);
  });

  it("cycles through superimposed impacts", () => {
    const candidates = impactsNear(impacts, 0.5, 0.5, 0.01);
    expect(nextOverlappingImpactId(candidates, null)).toBe("first");
    expect(nextOverlappingImpactId(candidates, "first")).toBe("second");
    expect(nextOverlappingImpactId(candidates, "second")).toBe("first");
  });
});
