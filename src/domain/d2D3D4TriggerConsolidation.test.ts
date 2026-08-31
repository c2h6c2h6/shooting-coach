import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { selectConfirmationTest } from "./confirmationTestEngine";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import type { SafetyContext } from "./coachingTypes";
import { generateTechnicalHypotheses, type TechnicalHypothesis } from "./technicalHypothesis";
import { activeHypothesisCodes, technicalHypothesisRegistry } from "./technicalHypothesisCatalog";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { loadPedagogicalReferenceDV1 } from "./pedagogical-v2/catalogs/pedagogical-reference-d-v1";
import type { ShootingObservation } from "./shootingObservation";
import { trainingDrillCatalog } from "./trainingDrillCatalog";

const safety: SafetyContext = { inAuthorizedRange: true, rangeRulesAccepted: true, safeDirectionAvailable: true,
  weaponUnloadedVerified: true, magazineRemoved: true, chamberVisualPhysicalCheck: true,
  liveAmmunitionRemovedFromArea: true, eyeAndEarProtection: true, dummyRoundsAllowed: false,
  dummyRoundProcedureKnown: false, instructorPresent: false, canDryFire: true, canLiveFire: true };

const observation = (observationCode: ShootingObservation["observationCode"]): ShootingObservation => ({
  id: `observation-${observationCode}`, sessionId: "session", seriesId: "series", comparisonId: null,
  observationCode, category: "dispersion_shape", scope: "single_series", status: "confirmed_by_rules",
  magnitude: "medium", confidenceLevel: "medium", rank: "primary", supportingMetrics: {}, limitingFactors: [],
  algorithmVersion: "v", rulesetVersion: "v", thresholdsVersion: "v", sourceVersion: "v", generatedAt: "now",
});

const lateral: TechnicalHypothesis = {
  id: "lateral", sessionId: "session", seriesId: "series", comparisonId: null, observationId: "observation",
  hypothesisCode: "LATERAL_TRIGGER_PRESSURE", category: "trigger", status: "requires_confirmation",
  plausibilityLevel: "medium", confidenceLevel: "low", rank: 1, internalScore: 4, supportingEvidence: [],
  contradictingEvidence: [], missingEvidence: [], applicableContext: { numberOfHands: 2 }, sourceRules: [],
  rulesetVersion: "v", generatedAt: "now",
};

describe("consolidation ciblée D2 / D3 / D4", () => {
  it("conserve D2.1 active, sourcée et confirmée prioritairement par le placement de l’index", () => {
    expect(technicalHypothesisRegistry.LATERAL_TRIGGER_PRESSURE.status).toBe("active_with_source");
    expect(technicalHypothesisRegistry.LATERAL_TRIGGER_PRESSURE.activeSources[0]?.mappings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ observation: "OFFSET_LEFT" }),
        expect.objectContaining({ observation: "OFFSET_RIGHT" }), expect.objectContaining({ observation: "COMPACT_BUT_OFFSET" })]));
    expect(selectConfirmationTest({ hypothesis: lateral, alternatives: [], sessionMode: "coaching_free", safety,
      userCanPerform: true, contextKnown: true }).primary?.code).toBe("TEST_TRIGGER_FINGER_PLACEMENT");
  });

  it("retire les deux proxies géométriques sans retirer les observations factuelles", () => {
    expect(observationHypothesisMappings.some((item) => item.observation === "OUTLIER_TO_VERIFY"
      && item.hypothesis === "ABRUPT_TRIGGER_PRESS")).toBe(false);
    expect(observationHypothesisMappings.some((item) => item.observation === "HORIZONTAL_SPREAD"
      && item.hypothesis === "INCONSISTENT_TRIGGER_PRESS")).toBe(false);
    expect(["OUTLIER_TO_VERIFY", "HORIZONTAL_SPREAD"].every((code) => observation(code as ShootingObservation["observationCode"]).observationCode === code)).toBe(true);
  });

  it("exclut ABRUPT et INCONSISTENT du registre et du ranking actif", () => {
    for (const code of ["ABRUPT_TRIGGER_PRESS", "INCONSISTENT_TRIGGER_PRESS"] as const) {
      expect(technicalHypothesisRegistry[code]).toMatchObject({ status: "reserved_without_source", activeSources: [] });
      expect(activeHypothesisCodes).not.toContain(code);
    }
    const generated = generateTechnicalHypotheses({ observations: [observation("OUTLIER_TO_VERIFY"), observation("HORIZONTAL_SPREAD")],
      laterality: "right", impactCount: 5, generatedAt: "now" });
    expect(generated.map((item) => item.hypothesisCode)).not.toEqual(expect.arrayContaining([
      "ABRUPT_TRIGGER_PRESS", "INCONSISTENT_TRIGGER_PRESS",
    ]));
  });

  it("retire les deux réserves de tous les tests, recommendations et drills actifs", () => {
    for (const code of ["ABRUPT_TRIGGER_PRESS", "INCONSISTENT_TRIGGER_PRESS"] as const) {
      expect(confirmationTestCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(coachingRecommendationCatalog.every((item) => !item.hypothesisCodes.includes(code))).toBe(true);
      expect(trainingDrillCatalog.every((item) => !item.linkedHypothesisCodes.includes(code))).toBe(true);
    }
    expect(confirmationTestCatalog.find((item) => item.code === "TEST_SIGHT_STABILITY_DRY")?.hypothesisCodes)
      .toEqual(["LATERAL_TRIGGER_PRESSURE"]);
  });

  it("garde REC_TRIGGER_AXIS strictement D2, sans progressivité D4", () => {
    const recommendation = coachingRecommendationCatalog.find((item) => item.code === "REC_TRIGGER_AXIS")!;
    expect(recommendation.hypothesisCodes).toEqual(["LATERAL_TRIGGER_PRESSURE"]);
    expect(`${recommendation.title} ${recommendation.rationale} ${recommendation.instruction}`).not.toMatch(/progressive|progressivité/i);
    expect(recommendation.instruction).toMatch(/directionnellement neutre/i);
  });

  it("préserve la chaîne D4 explicite et le prérequis D3, sans hypothèse D3 v1", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.diagnosticTests.map((item) => item.code)).toContain("TEST-D4-01");
    expect(catalog.techniques.map((item) => item.code)).toContain("TECH-D4-01");
    expect(catalog.exercises.find((item) => item.code === "EX-D4-01")).toMatchObject({
      primaryCompetenceId: "competence-d4", prerequisiteCompetenceIds: ["competence-d3"],
    });
    expect(activeHypothesisCodes.some((code) => code.includes("D3"))).toBe(false);
  });
});
