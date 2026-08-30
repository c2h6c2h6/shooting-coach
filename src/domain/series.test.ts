import { describe, expect, it } from "vitest";
import {
  assertValidRecordedShotCount,
  canTransitionSeries,
  SeriesDraft,
  validateSeriesDraft,
} from "./series";

const valid: SeriesDraft = {
  sessionId: "session-1",
  sequenceNumber: 1,
  type: "reference",
  expectedShotCount: 5,
};

describe("Series", () => {
  it("valide une série correcte", () => {
    expect(validateSeriesDraft(valid)).toEqual({});
  });

  it.each([0, -1, 51])("refuse expectedShotCount = %s", (expectedShotCount) => {
    expect(validateSeriesDraft({ ...valid, expectedShotCount }).expectedShotCount).toBeTruthy();
  });

  it("refuse un numéro d’ordre nul", () => {
    expect(validateSeriesDraft({ ...valid, sequenceNumber: 0 }).sequenceNumber).toBeTruthy();
  });

  it.each([0, 5, 7])("accepte recordedShotCount = %s", (count) => {
    expect(() => assertValidRecordedShotCount(count)).not.toThrow();
  });

  it("applique uniquement les transitions autorisées", () => {
    expect(canTransitionSeries("planned", "active")).toBe(true);
    expect(canTransitionSeries("active", "completed")).toBe(true);
    expect(canTransitionSeries("active", "cancelled")).toBe(true);
    expect(canTransitionSeries("completed", "active")).toBe(false);
    expect(canTransitionSeries("cancelled", "planned")).toBe(false);
  });
});
