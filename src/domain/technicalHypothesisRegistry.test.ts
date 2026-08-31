import { describe, expect, it } from "vitest";
import { normalizeHistoricalE1Hypothesis } from "./e1AnticipationCompatibility";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { generateTechnicalHypotheses, TechnicalHypothesis } from "./technicalHypothesis";
import {
  activeHypothesisCodes,
  hypothesisCodes,
  technicalHypothesisRegistry,
} from "./technicalHypothesisCatalog";
import type { ShootingObservation } from "./shootingObservation";

const observation = (code: ShootingObservation["observationCode"], scope: ShootingObservation["scope"] = "single_series"): ShootingObservation => ({
  id: `observation-${code}`, sessionId: "session", seriesId: scope === "comparison" ? null : "series",
  comparisonId: scope === "comparison" ? "comparison" : null, observationCode: code,
  category: "evolution", scope, status: "confirmed_by_rules", magnitude: null,
  confidenceLevel: "medium", rank: "primary", supportingMetrics: {}, limitingFactors: [],
  algorithmVersion: "v", rulesetVersion: "v", thresholdsVersion: "v", sourceVersion: "v", generatedAt: "now",
});

const historical = (code: TechnicalHypothesis["hypothesisCode"]): TechnicalHypothesis => ({
  id: "historical", sessionId: "session", seriesId: "series", comparisonId: null, observationId: "observation",
  hypothesisCode: code, category: "anticipation", status: "requires_confirmation", plausibilityLevel: "medium",
  confidenceLevel: "low", rank: 1, internalScore: 4, supportingEvidence: [], contradictingEvidence: [],
  missingEvidence: [], applicableContext: {}, sourceRules: [], rulesetVersion: "v", generatedAt: "now",
});

describe("registre explicite des hypothèses", () => {
  it("couvre le catalogue sans rendre actifs des codes sans source réelle", () => {
    expect(Object.keys(technicalHypothesisRegistry)).toEqual([...hypothesisCodes]);
    for (const entry of Object.values(technicalHypothesisRegistry)) {
      if (entry.status !== "active_with_source") expect(entry.activeSources).toEqual([]);
      for (const source of entry.activeSources) {
        expect(source.kind).toBe("single_series_observation");
        expect(source.mappings.length).toBeGreaterThan(0);
        for (const mapping of source.mappings) expect(observationHypothesisMappings).toContain(mapping);
      }
    }
  });

  it("ne génère que les codes actifs et conserve SHOT_ANTICIPATION", () => {
    const generated = generateTechnicalHypotheses({
      observations: [observation("OFFSET_LOW"), observation("VERTICAL_SPREAD")],
      laterality: "right", impactCount: 5, numberOfHands: 2, generatedAt: "now",
    });
    expect(generated.map((item) => item.hypothesisCode)).toContain("SHOT_ANTICIPATION");
    for (const item of generated) {
      expect(technicalHypothesisRegistry[item.hypothesisCode].status).toBe("active_with_source");
    }
  });

  it("préserve le score et le rang des candidats actifs existants", () => {
    const generated = generateTechnicalHypotheses({
      observations: [observation("OFFSET_LOW")], laterality: "right", impactCount: 5,
      numberOfHands: 2, generatedAt: "now",
    });
    expect(generated.map(({ hypothesisCode, rank, internalScore }) => ({ hypothesisCode, rank, internalScore }))).toEqual([
      { hypothesisCode: "SIGHT_ALIGNMENT_VARIATION", rank: 1, internalScore: 3 },
      { hypothesisCode: "SHOT_ANTICIPATION", rank: 2, internalScore: 2 },
      { hypothesisCode: "TWO_HAND_CONTRIBUTION", rank: 3, internalScore: 2 },
      { hypothesisCode: "EQUIPMENT_OR_SIGHT_ISSUE", rank: 4, internalScore: 1 },
    ]);
  });

  it("maintient les alias E1 lisibles mais non concurrents", () => {
    for (const code of ["FLINCH_RESPONSE", "PUSHING_AGAINST_RECOIL"] as const) {
      expect(technicalHypothesisRegistry[code].status).toBe("historical_alias");
      expect(normalizeHistoricalE1Hypothesis(historical(code))).toMatchObject({
        hypothesisCode: "SHOT_ANTICIPATION", rank: 1, internalScore: 4,
      });
    }
    expect(activeHypothesisCodes).toContain("SHOT_ANTICIPATION");
    expect(activeHypothesisCodes).not.toEqual(expect.arrayContaining(["FLINCH_RESPONSE", "PUSHING_AGAINST_RECOIL"]));
  });

  it("exclut les réserves et les relations comparison-only non raccordées du ranking actif", () => {
    expect(technicalHypothesisRegistry.TRIGGER_RESET_DISTURBANCE.status).toBe("reserved_without_source");
    for (const code of ["GRIP_CHANGES_BETWEEN_SHOTS", "INCONSISTENT_BODY_POSITION",
      "LOSS_OF_TECHNIQUE_DURING_SERIES", "FATIGUE"] as const) {
      expect(technicalHypothesisRegistry[code].status).toBe("reserved_without_source");
    }
    const generated = generateTechnicalHypotheses({
      observations: [observation("GROUP_WIDER", "comparison"), observation("SHAPE_CHANGED", "comparison")],
      laterality: "right", impactCount: 5, generatedAt: "now",
    });
    expect(generated).toEqual([]);
  });
});
