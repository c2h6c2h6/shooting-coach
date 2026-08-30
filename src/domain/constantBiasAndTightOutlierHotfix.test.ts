import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateSeriesMetrics } from "./seriesMetrics";
import { observeSeries } from "./shootingObservation";
import { generateTechnicalHypotheses } from "./technicalHypothesis";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "./targetCoordinateConversion";

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
      id: `impact-${index + 1}`, normalizedX, normalizedY, isExcluded: false,
    })),
    expectedShotCount: points.length,
    recordedShotCount: points.length,
    geometry,
    computedAt: "2026-08-26T08:00:00.000Z",
  });
  const observations = observeSeries({
    sessionId: "session-hotfix",
    seriesId: "series-hotfix",
    metrics,
    generatedAt: "2026-08-26T08:00:00.000Z",
  });
  const persistedShape = [observations.primary, ...observations.secondary, ...observations.limitations]
    .filter((item) => item !== null)
    .map((item, index) => ({ ...item!, id: `observation-${index + 1}` }));
  const hypotheses = generateTechnicalHypotheses({
    observations: persistedShape,
    laterality: "right",
    impactCount: points.length,
    generatedAt: "2026-08-26T08:00:00.000Z",
  });
  return { metrics, observations, hypotheses };
}

describe("hotfix biais constant — neutralité causale", () => {
  it("reconnaît le biais sans favoriser configuration ou détente sur la seule cible", () => {
    const result = analyze([
      [.645, .495], [.655, .495], [.645, .505], [.655, .505], [.65, .5],
    ]);

    expect(result.observations.primary?.observationCode).toBe("COMPACT_BUT_OFFSET");
    const configuration = result.hypotheses.find((item) =>
      item.hypothesisCode === "EQUIPMENT_OR_SIGHT_ISSUE");
    const lateralTrigger = result.hypotheses.find((item) =>
      item.hypothesisCode === "LATERAL_TRIGGER_PRESSURE");
    expect(configuration).toBeDefined();
    expect(lateralTrigger).toBeDefined();
    expect(configuration?.supportingEvidence.map((item) => item.code))
      .toContain("SYSTEMATIC_BIAS_COMPATIBILITY");
    expect(lateralTrigger?.supportingEvidence.map((item) => item.code))
      .toContain("SYSTEMATIC_BIAS_COMPATIBILITY");
    expect(configuration?.internalScore).toBe(lateralTrigger?.internalScore);
    expect(configuration?.confidenceLevel).not.toBe("high");
    expect(lateralTrigger?.confidenceLevel).not.toBe("high");
  });

  it("présente un biais à identifier et non une cause principale imposée", () => {
    const screen = readFileSync(resolve(
      process.cwd(), "app/sessions/[id]/series/[seriesId].tsx",
    ), "utf8");

    expect(screen).toContain("Biais constant à identifier");
    expect(screen).toContain("Causes possibles à départager");
    expect(screen).toContain("la cible seule ne permet pas d’en identifier la cause");
    expect(screen).toContain("technicalHypothesisCatalog.EQUIPMENT_OR_SIGHT_ISSUE.titleFr");
    expect(screen).toContain("technicalHypothesisCatalog.LATERAL_TRIGGER_PRESSURE.titleFr");
    expect(screen).toContain("La reproduction du biais ne permet pas, à elle seule, de choisir entre ces causes.");
    expect(screen).toContain("Examiner les causes possibles");
    expect(screen).toContain('diagnosticResult.conclusion==="strengthened"');
    expect(screen).toContain("setShowDiagnosticGeneralAnalysis(true)");
  });

  it("conserve le test de reproductibilité avant de départager les causes", () => {
    const screen = readFileSync(resolve(
      process.cwd(), "app/sessions/[id]/series/[seriesId].tsx",
    ), "utf8");

    expect(screen).toContain("Créer la série de confirmation");
    expect(screen).toContain("Refaites une série de 5 coups dans les mêmes conditions");
    expect(screen).toContain("Confirmation déjà réalisée");
  });
});

describe("hotfix impact atypique — écart minime dans un groupement très serré", () => {
  it("conserve le signal métrique prudent sans produire d’alerte pédagogique forte", () => {
    const result = analyze([
      [.5, .5], [.5, .5], [.5, .5], [.5, .5], [.508, .5],
    ]);

    // Le détecteur relatif voit bien le cinquième point : le hotfix ne réécrit
    // pas les métriques et ne l’exclut pas des mesures.
    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual(["impact-5"]);
    expect(result.metrics.includedImpactCount).toBe(5);
    expect(result.metrics.normalized.extremeSpread).toBeCloseTo(.008);
    expect(result.observations.primary?.observationCode).toBe("CENTERED_AND_COMPACT");
    expect(result.observations.secondary.map((item) => item.observationCode))
      .not.toContain("OUTLIER_TO_VERIFY");
    expect(result.hypotheses).toEqual([]);
    expect(result.observations.limitations.map((item) => item.observationCode))
      .toContain("MANUAL_INPUT_LIMITATION");
  });

  it("conserve l’alerte pour un outlier réellement marqué", () => {
    const result = analyze([
      [.495, .495], [.505, .495], [.495, .505], [.505, .505], [.35, .65],
    ]);

    expect(result.metrics.potentiallyAtypicalImpactIds).toEqual(["impact-5"]);
    expect(result.observations.primary?.observationCode).toBe("OUTLIER_TO_VERIFY");
  });

  it("réserve le message d’alerte forte aux écarts pédagogiquement significatifs", () => {
    const screen = readFileSync(resolve(
      process.cwd(), "app/sessions/[id]/series/[seriesId].tsx",
    ), "utf8");

    expect(screen).toContain("isPedagogicallySignificantAtypicalImpact(metrics)");
    expect(screen).toContain("Une légère variation statistique, compatible avec la précision limitée de la saisie manuelle");
    expect(screen).toContain("Impact(s) potentiellement atypique(s) à vérifier");
  });
});
