import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { generateTechnicalHypotheses } from "./technicalHypothesis";
import { activeHypothesisCodes, technicalHypothesisRegistry } from "./technicalHypothesisCatalog";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import type { ShootingObservation } from "./shootingObservation";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

const verticalSpread: ShootingObservation = {
  id: "vertical", sessionId: "session", seriesId: "series", comparisonId: null, observationCode: "VERTICAL_SPREAD",
  category: "dispersion_shape", scope: "single_series", status: "confirmed_by_rules", magnitude: "medium",
  confidenceLevel: "medium", rank: "primary", supportingMetrics: {}, limitingFactors: [], algorithmVersion: "v",
  rulesetVersion: "v", thresholdsVersion: "v", sourceVersion: "v", generatedAt: "now",
};

describe("neutralisation de la durée de visée inférée", () => {
  it("réserve EXCESSIVE_AIMING_TIME, conserve exactement les sept actifs et le registre 7 / 7 / 34", () => {
    expect(technicalHypothesisRegistry.EXCESSIVE_AIMING_TIME)
      .toMatchObject({ status: "reserved_without_source", activeSources: [] });
    expect(activeHypothesisCodes).toEqual(["LATERAL_TRIGGER_PRESSURE", "SHOT_ANTICIPATION",
      "INCONSISTENT_GRIP_PRESSURE", "WRIST_INSTABILITY", "SIGHT_ALIGNMENT_VARIATION",
      "EQUIPMENT_OR_SIGHT_ISSUE", "TWO_HAND_CONTRIBUTION"]);
    const counts = Object.values(technicalHypothesisRegistry).reduce<Record<string, number>>((all, entry) => {
      all[entry.status] = (all[entry.status] ?? 0) + 1;
      return all;
    }, {});
    expect(counts).toEqual({ active_with_source: 7, historical_alias: 7, reserved_without_source: 34 });
  });

  it("conserve VERTICAL_SPREAD sans générer ni remplacer EXCESSIVE_AIMING_TIME", () => {
    expect(verticalSpread.observationCode).toBe("VERTICAL_SPREAD");
    expect(observationHypothesisMappings.some((item) => item.observation === "VERTICAL_SPREAD"
      && item.hypothesis === "EXCESSIVE_AIMING_TIME")).toBe(false);
    const generated = generateTechnicalHypotheses({ observations: [verticalSpread], laterality: "right",
      impactCount: 5, generatedAt: "now" });
    expect(generated.map((item) => item.hypothesisCode)).not.toContain("EXCESSIVE_AIMING_TIME");
  });

  it("laisse TEST_AIMING_DURATION historique, sans chaîne causale ou catalogue actif", () => {
    expect(confirmationTestCatalog.find((item) => item.code === "TEST_AIMING_DURATION")?.hypothesisCodes)
      .not.toContain("EXCESSIVE_AIMING_TIME");
    expect(coachingRecommendationCatalog.every((item) => !item.hypothesisCodes.includes("EXCESSIVE_AIMING_TIME"))).toBe(true);
    expect(trainingDrillCatalog.every((item) => !item.linkedHypothesisCodes.includes("EXCESSIVE_AIMING_TIME"))).toBe(true);
  });
});
