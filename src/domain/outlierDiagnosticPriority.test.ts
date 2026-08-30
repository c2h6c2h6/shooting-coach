import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { calculateSeriesMetrics } from "./seriesMetrics";
import { observeSeries } from "./shootingObservation";
import { generateTechnicalHypotheses } from "./technicalHypothesis";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "./targetCoordinateConversion";
import {
  seriesObservationSummary,
  userFacingHypothesisTitle,
} from "../ui/analysisPresentation";

const geometry = {
  version: UNVERIFIED_TARGET_GEOMETRY_VERSION,
  widthMm: null,
  heightMm: null,
  centerNormalizedX: .5,
  centerNormalizedY: .5,
};

function analyze(points: ReadonlyArray<readonly [number, number]>) {
  const metrics = calculateSeriesMetrics({
    impacts: points.map(([normalizedX, normalizedY], index) => ({
      id: `impact-${index + 1}`,
      normalizedX,
      normalizedY,
      isExcluded: false,
    })),
    expectedShotCount: points.length,
    recordedShotCount: points.length,
    geometry,
    computedAt: "2026-08-25T10:00:00.000Z",
  });
  const observations = observeSeries({
    sessionId: "session-qa",
    seriesId: "series-qa",
    metrics,
    generatedAt: "2026-08-25T10:00:00.000Z",
  });
  const allObservations = [observations.primary, ...observations.secondary, ...observations.limitations]
    .filter((item) => item !== null)
    .map((item, index) => ({ ...item!, id: `observation-${index + 1}` }));
  const hypotheses = generateTechnicalHypotheses({
    observations: allObservations,
    laterality: "right",
    impactCount: points.length,
    generatedAt: "2026-08-25T10:00:00.000Z",
  }).map((hypothesis, index) => ({ id: `hypothesis-${index + 1}`, ...hypothesis }));
  return { metrics, observations, hypotheses };
}

describe("priorité diagnostique de la structure du groupement", () => {
  it("fait primer la perturbation ponctuelle pour quatre impacts centrés et un impact isolé", () => {
    const result = analyze([
      [.495, .495], [.505, .495], [.495, .505], [.505, .505], [.35, .65],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual(["impact-5"]);
    expect(result.metrics.includedImpactCount).toBe(5);
    expect(result.observations.primary?.observationCode).toBe("OUTLIER_TO_VERIFY");
    expect(result.hypotheses[0]?.hypothesisCode).toBe("ABRUPT_TRIGGER_PRESS");
    expect(result.hypotheses[0]?.supportingEvidence.map((item) => item.code))
      .toContain("PUNCTUAL_PERTURBATION_COMPATIBILITY");
    expect(result.hypotheses[0]?.hypothesisCode).not.toBe("EQUIPMENT_OR_SIGHT_ISSUE");
    expect(result.hypotheses.some((item) => item.hypothesisCode === "EQUIPMENT_OR_SIGHT_ISSUE"))
      .toBe(false);
    expect(result.hypotheses.some((item) => item.supportingEvidence.some(
      (evidence) => evidence.code === "SYSTEMATIC_BIAS_COMPATIBILITY",
    ))).toBe(false);
    expect(seriesObservationSummary(result.observations)).toBe(
      "Le groupement principal est resserré et proche du centre. Un impact isolé est à vérifier.",
    );
    expect(userFacingHypothesisTitle(result.hypotheses[0]!, "Action brusque sur la détente"))
      .toBe("Perturbation ponctuelle au départ du coup");
    expect(confirmationTestCatalog.find((test) => test.code === "TEST_SIGHT_STABILITY_DRY")
      ?.hypothesisCodes).toContain(result.hypotheses[0]?.hypothesisCode);
  });

  it("conserve le biais constant pour cinq impacts compacts tous décalés", () => {
    const result = analyze([
      [.645, .495], [.655, .495], [.645, .505], [.655, .505], [.65, .5],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual([]);
    expect(result.observations.primary?.observationCode).toBe("COMPACT_BUT_OFFSET");
    expect(result.hypotheses[0]?.hypothesisCode).toBe("EQUIPMENT_OR_SIGHT_ISSUE");
  });

  it("ne crée aucune fausse piste pour cinq impacts compacts centrés sans outlier", () => {
    const result = analyze([
      [.495, .495], [.505, .495], [.495, .505], [.505, .505], [.5, .5],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual([]);
    expect(result.observations.primary?.observationCode).toBe("CENTERED_AND_COMPACT");
    expect(result.hypotheses).toEqual([]);
  });

  it("ne fabrique pas de perturbation ponctuelle pour une dispersion large sans grappe cohérente", () => {
    const result = analyze([
      [.2, .2], [.8, .2], [.2, .8], [.8, .8], [.5, .5],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual([]);
    expect(result.observations.primary?.observationCode).not.toBe("OUTLIER_TO_VERIFY");
    expect(result.hypotheses.every((item) => item.supportingEvidence.every(
      (evidence) => evidence.code !== "PUNCTUAL_PERTURBATION_COMPATIBILITY",
    ))).toBe(true);
  });

  it("conserve le biais du groupement principal décalé et place l’outlier en secondaire", () => {
    const result = analyze([
      [.645, .495], [.655, .495], [.645, .505], [.655, .505], [.3, .8],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual(["impact-5"]);
    expect(result.metrics.principalGroup?.shapeClassification).toBe("compact");
    expect(result.metrics.principalGroup?.normalized.centroidDistanceToTargetCenter)
      .toBeGreaterThan(.025);
    expect(result.observations.primary?.observationCode).toBe("COMPACT_BUT_OFFSET");
    expect(result.observations.secondary.map((item) => item.observationCode))
      .toContain("OUTLIER_TO_VERIFY");
    expect(result.hypotheses[0]?.hypothesisCode).toBe("EQUIPMENT_OR_SIGHT_ISSUE");
  });

  it("conserve l’outlier dans les mesures globales tout en décrivant les quatre autres impacts", () => {
    const result = analyze([
      [.495, .495], [.505, .495], [.495, .505], [.505, .505], [.35, .65],
    ]);

    expect(result.metrics.includedImpactCount).toBe(5);
    expect(result.metrics.includedImpactIds).toContain("impact-5");
    expect(result.metrics.normalized.centroidDistanceToTargetCenter).toBeGreaterThan(.025);
    expect(result.metrics.principalGroup?.impactIds).toHaveLength(4);
    expect(result.metrics.principalGroup?.impactIds).not.toContain("impact-5");
    expect(result.metrics.principalGroup?.normalized.centroidDistanceToTargetCenter).toBeCloseTo(0);
  });
});
