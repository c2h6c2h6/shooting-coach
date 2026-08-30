import { describe, expect, it } from "vitest";
import { SeriesMetrics } from "./seriesMetrics";
import { ComparableSeriesContext, compareSeries } from "./seriesComparison";

const points = {
  centroidX: 0, centroidY: 0, horizontalOffset: 0, verticalOffset: 0,
  centroidDistanceToTargetCenter: .1, spreadWidth: .2, spreadHeight: .2,
  extremeSpread: .25, meanRadius: .1, radialStandardDeviation: .02,
  meanDistanceToTargetCenter: .15,
};
function metrics(overrides: Partial<SeriesMetrics> = {}, pointOverrides = {}): SeriesMetrics {
  return {
    algorithmVersion: "series-metrics-v1", targetGeometryVersion: "unverified-normalized-v1",
    computedAt: "2026-07-29T00:00:00Z", totalImpactCount: 5, includedImpactCount: 5,
    excludedImpactCount: 0, expectedShotCount: 5, recordedShotCount: 5,
    includedImpactIds: ["1","2","3","4","5"], normalized: { ...points, ...pointOverrides },
    physicalMm: null, shapeClassification: "both_axes", potentiallyAtypicalImpactIds: [],
    ...overrides,
  };
}
function context(id: string, overrides: Partial<ComparableSeriesContext> = {}): ComparableSeriesContext {
  return { id, sessionId: "session", status: "completed", weaponId: "glock-19",
    distanceMm: 10000, numberOfHands: 2, targetTypeId: "fftir",
    targetGeometryVersion: "unverified-normalized-v1", ...overrides };
}
const run = (a = metrics(), b = metrics(), ca = context("a"), cb = context("b")) =>
  compareSeries({ baseline: ca, compared: cb, baselineMetrics: a, comparedMetrics: b, comparisonType: "reference" });

describe("comparaison factuelle des séries", () => {
  it("compare deux séries identiques comme stables", () => expect(run().differences.extremeSpread?.variation).toBe("stable"));
  it("détecte un groupement plus resserré", () => expect(run(metrics(), metrics({}, { extremeSpread: .15 })).differences.extremeSpread?.delta).toBeCloseTo(-.1));
  it("détecte un groupement plus dispersé", () => expect(run(metrics(), metrics({}, { extremeSpread: .35 })).differences.extremeSpread?.delta).toBeCloseTo(.1));
  it("détecte un centre plus proche", () => expect(run(metrics(), metrics({}, { centroidDistanceToTargetCenter: .04 })).differences.centroidDistanceToTargetCenter?.delta).toBeCloseTo(-.06));
  it("détecte un centre plus éloigné", () => expect(run(metrics(), metrics({}, { centroidDistanceToTargetCenter: .2 })).differences.centroidDistanceToTargetCenter?.delta).toBeCloseTo(.1));
  it("calcule un déplacement horizontal signé", () => expect(run(metrics(), metrics({}, { horizontalOffset: .1 })).differences.horizontalOffset?.delta).toBeCloseTo(.1));
  it("calcule un déplacement vertical signé", () => expect(run(metrics(), metrics({}, { verticalOffset: -.1 })).differences.verticalOffset?.delta).toBeCloseTo(-.1));
  it("conserve largeur réduite et hauteur augmentée", () => {
    const value = run(metrics(), metrics({}, { spreadWidth: .1, spreadHeight: .3 }));
    expect(value.differences.spreadWidth?.delta).toBeCloseTo(-.1);
    expect(value.differences.spreadHeight?.delta).toBeCloseTo(.1);
  });
  it("calcule le rayon moyen réduit", () => expect(run(metrics(), metrics({}, { meanRadius: .05 })).differences.meanRadius?.delta).toBeCloseTo(-.05));
  it("calcule la différence relative", () => expect(run(metrics(), metrics({}, { spreadWidth: .3 })).differences.spreadWidth?.relativePercent).toBeCloseTo(50));
  it("omet le pourcentage si la référence vaut zéro", () => {
    const item = run(metrics({}, { horizontalOffset: 0 }), metrics({}, { horizontalOffset: .1 })).differences.horizontalOffset!;
    expect(item.relativePercent).toBeNull(); expect(item.percentageLimitation).toContain("non calculable");
  });
  it("classe stable, légère et notable", () => {
    expect(run(metrics(), metrics({}, { meanRadius: .105 })).differences.meanRadius?.variation).toBe("stable");
    expect(run(metrics(), metrics({}, { meanRadius: .12 })).differences.meanRadius?.variation).toBe("slight");
    expect(run(metrics(), metrics({}, { meanRadius: .14 })).differences.meanRadius?.variation).toBe("notable");
  });
  it("signale les nombres d’impacts différents", () => expect(run(metrics(), metrics({ includedImpactCount: 4 })).limitations.join(" ")).toContain("différent"));
  it("réduit la fiabilité si l’effectif diffère fortement", () => expect(run(metrics(), metrics({ includedImpactCount: 2 })).reliability).toBe("limited"));
  it("signale les impacts exclus", () => expect(run(metrics(), metrics({ excludedImpactCount: 2, totalImpactCount: 7 })).limitations.join(" ")).toContain("Exclusions"));
  it("produit une comparaison partielle sous deux impacts", () => {
    const sparse = metrics({ includedImpactCount: 1 }, { spreadWidth: null, spreadHeight: null, extremeSpread: null, meanRadius: null });
    expect(run(metrics(), sparse).status).toBe("partially_comparable");
  });
  it("refuse deux séances différentes", () => expect(run(metrics(), metrics(), context("a"), context("b", { sessionId: "other" })).status).toBe("not_comparable"));
  it("refuse une série active", () => expect(run(metrics(), metrics(), context("a"), context("b", { status: "active" })).status).toBe("not_comparable"));
  it("refuse une série planifiée", () => expect(run(metrics(), metrics(), context("a"), context("b", { status: "planned" })).status).toBe("not_comparable"));
  it("refuse une série annulée", () => expect(run(metrics(), metrics(), context("a"), context("b", { status: "cancelled" })).status).toBe("not_comparable"));
  it("refuse une version de mesures incompatible", () => expect(run(metrics(), metrics({ algorithmVersion: "v2" })).status).toBe("not_comparable"));
  it("refuse une géométrie incompatible", () => expect(run(metrics(), metrics(), context("a"), context("b", { targetGeometryVersion: "other" })).status).toBe("not_comparable"));
  it("refuse une arme différente", () => expect(run(metrics(), metrics(), context("a"), context("b", { weaponId: "glock-48" })).status).toBe("not_comparable"));
  it("refuse une distance différente", () => expect(run(metrics(), metrics(), context("a"), context("b", { distanceMm: 25000 })).status).toBe("not_comparable"));
  it("compare strictement 1 main avec 1 main", () => expect(run(metrics(), metrics(), context("a", { numberOfHands: 1 }), context("b", { numberOfHands: 1 })).status).toBe("comparable"));
  it("compare strictement 2 mains avec 2 mains", () => expect(run().status).toBe("comparable"));
  it("refuse 1 main face à 2 mains", () => expect(run(metrics(), metrics(), context("a", { numberOfHands: 1 }), context("b", { numberOfHands: 2 })).status).toBe("not_comparable"));
  it("traite une valeur NULL comme information insuffisante, y compris face à NULL", () => {
    expect(run(metrics(), metrics(), context("a", { numberOfHands: null }), context("b", { numberOfHands: 2 })).reasons.join(" ")).toContain("pas renseigné");
    expect(run(metrics(), metrics(), context("a", { numberOfHands: null }), context("b", { numberOfHands: null })).status).toBe("not_comparable");
  });
  it("documente le sens comparée moins référence", () => expect(run(metrics({}, { spreadWidth: .2 }), metrics({}, { spreadWidth: .3 })).differences.spreadWidth?.delta).toBeCloseTo(.1));
});
