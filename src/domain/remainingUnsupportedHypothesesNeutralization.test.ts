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

describe("neutralisation des dernières hypothèses actives non justifiées", () => {
  const reserved = ["SIGHT_PICTURE_VARIATION", "ATTENTION_LOSS", "BREATHING_DISRUPTION"] as const;
  const active = ["LATERAL_TRIGGER_PRESSURE", "SHOT_ANTICIPATION", "INCONSISTENT_GRIP_PRESSURE",
    "WRIST_INSTABILITY", "SIGHT_ALIGNMENT_VARIATION",
    "EQUIPMENT_OR_SIGHT_ISSUE", "TWO_HAND_CONTRIBUTION"] as const;

  it("réserve les trois codes, conserve exactement les huit actifs et couvre le registre 8 / 7 / 33", () => {
    for (const code of reserved) expect(technicalHypothesisRegistry[code])
      .toMatchObject({ status: "reserved_without_source", activeSources: [] });
    expect(activeHypothesisCodes).toEqual(active);
    const counts = Object.values(technicalHypothesisRegistry).reduce<Record<string, number>>((all, entry) => {
      all[entry.status] = (all[entry.status] ?? 0) + 1;
      return all;
    }, {});
    expect(counts).toEqual({ active_with_source: 7, historical_alias: 7, reserved_without_source: 34 });
  });

  it("conserve les observations sources mais retire tous leurs mappings vers les trois codes", () => {
    const sources = ["OFFSET_HIGH", "OFFSET_HIGH_LEFT", "OFFSET_HIGH_RIGHT", "VERTICAL_SPREAD",
      "TWO_AXIS_SPREAD", "OUTLIER_TO_VERIFY"] as const;
    expect(sources.map((code) => observation(code).observationCode)).toEqual(sources);
    expect(observationHypothesisMappings.every((item) => !reserved.includes(item.hypothesis as typeof reserved[number]))).toBe(true);
  });

  it("ne génère aucun des trois codes sans ajouter de remplaçant artificiel", () => {
    const generated = generateTechnicalHypotheses({ observations: [observation("OFFSET_HIGH"),
      observation("OFFSET_HIGH_LEFT"), observation("OFFSET_HIGH_RIGHT"), observation("VERTICAL_SPREAD"),
      observation("TWO_AXIS_SPREAD"), observation("OUTLIER_TO_VERIFY")], laterality: "right",
      impactCount: 5, generatedAt: "now" });
    expect(generated.map((item) => item.hypothesisCode)).not.toEqual(expect.arrayContaining([...reserved]));
  });

  it("retire les trois codes des catalogues actifs sans toucher aux chaînes restantes", () => {
    for (const code of reserved) {
      expect(confirmationTestCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(coachingRecommendationCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(trainingDrillCatalog.every((item) => !item.linkedHypothesisCodes.includes(code))).toBe(true);
    }
    expect(coachingRecommendationCatalog.find((item) => item.code === "REC_VISUAL_CONSTANCY")?.hypothesisCodes)
      .not.toContain("SIGHT_PICTURE_VARIATION");
    expect(trainingDrillCatalog.find((item) => item.code === "DRILL_SLOW_VALIDATION")?.linkedHypothesisCodes)
      .not.toContain("SIGHT_PICTURE_VARIATION");
  });
});
