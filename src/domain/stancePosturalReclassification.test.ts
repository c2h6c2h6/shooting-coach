import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { generateTechnicalHypotheses } from "./technicalHypothesis";
import { activeHypothesisCodes, technicalHypothesisRegistry } from "./technicalHypothesisCatalog";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import type { ShootingObservation } from "./shootingObservation";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

const observation = (observationCode: ShootingObservation["observationCode"]): ShootingObservation => ({
  id: `observation-${observationCode}`, sessionId: "session", seriesId: "series", comparisonId: null,
  observationCode, category: "dispersion_shape", scope: "single_series", status: "confirmed_by_rules",
  magnitude: "medium", confidenceLevel: "medium", rank: "primary", supportingMetrics: {}, limitingFactors: [],
  algorithmVersion: "v", rulesetVersion: "v", thresholdsVersion: "v", sourceVersion: "v", generatedAt: "now",
});

describe("reclassification posture sans causalité géométrique", () => {
  const reserved = ["UNSTABLE_STANCE", "POSTURAL_SWAY"] as const;

  it("conserve les trois observations géométriques comme faits valides", () => {
    expect(["TWO_AXIS_SPREAD", "HORIZONTAL_SPREAD", "CENTERED_BUT_DISPERSED"].map((code) =>
      observation(code as ShootingObservation["observationCode"]).observationCode,
    )).toEqual(["TWO_AXIS_SPREAD", "HORIZONTAL_SPREAD", "CENTERED_BUT_DISPERSED"]);
  });

  it("retire exactement les trois mappings causaux de posture", () => {
    expect(observationHypothesisMappings.some((item) => item.observation === "TWO_AXIS_SPREAD"
      && item.hypothesis === "UNSTABLE_STANCE")).toBe(false);
    for (const source of ["HORIZONTAL_SPREAD", "CENTERED_BUT_DISPERSED"] as const) {
      expect(observationHypothesisMappings.some((item) => item.observation === source
        && item.hypothesis === "POSTURAL_SWAY")).toBe(false);
    }
  });

  it("réserve les deux codes et les exclut du ranking actif", () => {
    for (const code of reserved) {
      expect(technicalHypothesisRegistry[code]).toMatchObject({ status: "reserved_without_source", activeSources: [] });
      expect(activeHypothesisCodes).not.toContain(code);
    }
    const generated = generateTechnicalHypotheses({ observations: [observation("TWO_AXIS_SPREAD"),
      observation("HORIZONTAL_SPREAD"), observation("CENTERED_BUT_DISPERSED")], laterality: "right",
      impactCount: 5, generatedAt: "now" });
    expect(generated.map((item) => item.hypothesisCode)).not.toEqual(expect.arrayContaining([...reserved]));
  });

  it("conserve la couverture complète du registre dans l’état cible 11 / 7 / 30 / 0", () => {
    const counts = Object.values(technicalHypothesisRegistry).reduce<Record<string, number>>((all, entry) => {
      all[entry.status] = (all[entry.status] ?? 0) + 1;
      return all;
    }, {});
    expect(counts).toEqual({ active_with_source: 11, historical_alias: 7, reserved_without_source: 30 });
  });

  it("retire les deux codes de tous les tests, recommendations et drills actifs", () => {
    for (const code of reserved) {
      expect(confirmationTestCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(coachingRecommendationCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(trainingDrillCatalog.every((item) => !item.linkedHypothesisCodes.includes(code))).toBe(true);
    }
    expect(confirmationTestCatalog.find((item) => item.code === "TEST_NATURAL_POINT")?.hypothesisCodes)
      .not.toContain("UNSTABLE_STANCE");
    expect(confirmationTestCatalog.find((item) => item.code === "TEST_AIMING_DURATION")?.hypothesisCodes)
      .not.toContain("POSTURAL_SWAY");
  });
});
