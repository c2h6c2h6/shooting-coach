import { describe, expect, it } from "vitest";
import { compareImpactCount, validateImpactDraft } from "./impact";

const valid = { seriesId: "s1", sequenceNumber: 1, normalizedX: 0.5, normalizedY: 0.5, source: "manual" as const };

describe("Impact", () => {
  it("accepte un impact manuel valide", () => expect(validateImpactDraft(valid)).toEqual({}));
  it.each([-0.01, 1.01])("refuse X hors cible: %s", (normalizedX) =>
    expect(validateImpactDraft({ ...valid, normalizedX }).normalizedX).toBeTruthy());
  it.each([-0.01, 1.01])("refuse Y hors cible: %s", (normalizedY) =>
    expect(validateImpactDraft({ ...valid, normalizedY }).normalizedY).toBeTruthy());
  it("refuse le numéro zéro", () =>
    expect(validateImpactDraft({ ...valid, sequenceNumber: 0 }).sequenceNumber).toBeTruthy());
  it("exige une raison pour une exclusion", () =>
    expect(validateImpactDraft({ ...valid, isExcluded: true }).exclusionReason).toBeTruthy());
  it.each([[3, 5, "fewer"], [5, 5, "equal"], [6, 5, "more"]] as const)(
    "compare %s impact(s) à %s attendu(s)", (actual, expected, relation) =>
      expect(compareImpactCount(actual, expected)).toBe(relation));
});
