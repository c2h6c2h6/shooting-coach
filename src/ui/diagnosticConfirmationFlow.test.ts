import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ConfirmationTestRun } from "../domain/coachingTypes";
import type { Series } from "../domain/series";
import type { NumericDifference, SeriesComparison, VariationLevel } from "../domain/seriesComparison";
import {
  CONTROLLED_BIAS_CONFIRMATION_TEST_CODE,
  confirmationOutcomeFor,
  deriveDiagnosticConfirmationResult,
  isSameConfirmationRun,
} from "./diagnosticConfirmationFlow";

const timestamp = "2026-08-24T10:00:00.000Z";
const sourceSeries: Series = {
  id: "series-source", sessionId: "session-1", sequenceNumber: 1, type: "reference",
  expectedShotCount: 5, recordedShotCount: 5, status: "completed", cadenceType: "free",
  startedAt: timestamp, completedAt: timestamp, createdAt: timestamp, updatedAt: timestamp,
};
const diagnosticSeries: Series = {
  ...sourceSeries, id: "series-diagnostic", sequenceNumber: 2, type: "diagnostic",
};
const difference = (baselineValue: number, comparedValue: number, variation: VariationLevel): NumericDifference => ({
  baselineValue, comparedValue, delta: comparedValue - baselineValue,
  relativePercent: baselineValue === 0 ? null : (comparedValue - baselineValue) / Math.abs(baselineValue) * 100,
  variation, percentageLimitation: baselineValue === 0 ? "TEST/FIXTURE" : null,
});
const comparison = (patch: Partial<SeriesComparison> = {}): SeriesComparison => ({
  id: "comparison-1", sessionId: "session-1", baselineSeriesId: sourceSeries.id,
  comparedSeriesId: diagnosticSeries.id, comparisonType: "manual", status: "comparable",
  reliability: "acceptable", algorithmVersion: "series-comparison-v1",
  thresholdsVersion: "comparison-thresholds-v1", baselineMetricsVersion: "metrics-v1",
  comparedMetricsVersion: "metrics-v1", unit: "normalized", reasons: [], limitations: [],
  differences: {
    horizontalOffset: difference(0.10, 0.095, "stable"),
    verticalOffset: difference(0.02, 0.021, "stable"),
    centroidDistanceToTargetCenter: difference(0.102, 0.097, "stable"),
  },
  counts: {
    expectedShotCount: difference(5, 5, "stable"), recordedShotCount: difference(5, 5, "stable"),
    includedImpactCount: difference(5, 5, "stable"), excludedImpactCount: difference(0, 0, "stable"),
  },
  shape: { baselineValue: "compact", comparedValue: "compact", changed: false },
  computedAt: timestamp,
  ...patch,
});
const run: ConfirmationTestRun = {
  id: "run-1", sessionId: "session-1", sourceSeriesId: sourceSeries.id, hypothesisId: "hypothesis-1",
  testCode: CONTROLLED_BIAS_CONFIRMATION_TEST_CODE, status: "completed", startedAt: timestamp,
  completedAt: timestamp, outcome: "supports_hypothesis", observations: [], userAnswers: {},
  confidenceBefore: "very_low", confidenceAfter: "very_low", hypothesisStatusBefore: "requires_confirmation",
  hypothesisStatusAfter: "strengthened", generatedSeriesId: diagnosticSeries.id, rulesetVersion: "coaching-rules-v1",
};

describe("clôture de la confirmation d’un biais constant", () => {
  it("renforce prudemment la piste lorsque le décalage se reproduit", () => {
    const result = deriveDiagnosticConfirmationResult({ comparison: comparison(), sourceSeries, diagnosticSeries });
    expect(result).toMatchObject({ conclusion: "strengthened",
      headline: "Le décalage se reproduit dans des conditions comparables.",
      interpretation: "La piste d’un biais constant est renforcée." });
    expect(confirmationOutcomeFor(result)).toBe("supports_hypothesis");
  });

  it("affaiblit la piste lorsque la série diagnostique revient nettement vers le centre", () => {
    const result = deriveDiagnosticConfirmationResult({ comparison: comparison({ differences: {
      horizontalOffset: difference(0.10, 0.005, "notable"),
      verticalOffset: difference(0.02, 0.002, "slight"),
      centroidDistanceToTargetCenter: difference(0.102, 0.006, "notable"),
    } }), sourceSeries, diagnosticSeries });
    expect(result).toMatchObject({ conclusion: "weakened",
      headline: "Le décalage ne se reproduit pas dans cette série.",
      interpretation: "La piste d’un biais constant est affaiblie." });
    expect(confirmationOutcomeFor(result)).toBe("does_not_support_hypothesis");
  });

  it("reste non concluant lorsque les séries ne sont pas comparables", () => {
    const result = deriveDiagnosticConfirmationResult({ comparison: comparison({
      status: "not_comparable", reasons: ["Les distances diffèrent."], differences: {},
    }), sourceSeries, diagnosticSeries });
    expect(result.conclusion).toBe("inconclusive");
    expect(confirmationOutcomeFor(result)).toBe("inconclusive");
  });

  it("reste non concluant lorsque la cadence disponible diffère", () => {
    const result = deriveDiagnosticConfirmationResult({ comparison: comparison(), sourceSeries,
      diagnosticSeries: { ...diagnosticSeries, cadenceType: "timed" } });
    expect(result.conclusion).toBe("inconclusive");
  });

  it("identifie sans ambiguïté la même question déjà testée", () => {
    expect(isSameConfirmationRun({ run, sourceSeriesId: sourceSeries.id, hypothesisId: "hypothesis-1" })).toBe(true);
    expect(isSameConfirmationRun({ run, sourceSeriesId: sourceSeries.id, hypothesisId: "other" })).toBe(false);
  });
});

describe("préparation et anti-boucle — garde-fous source", () => {
  const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

  it("fait passer le bouton d’accueil par l’unique écran Préparer la séance", () => {
    const home = source("app/index.tsx");
    const preparation = source("app/sessions/new.tsx");
    expect(home).toContain('router.push("/sessions/new")');
    expect(home).not.toContain("startSessionAndOpenUsefulScreen");
    expect(preparation).toContain("Préparer la séance");
    expect(preparation).toContain("Démarrer la séance");
  });

  it("préremplit depuis le profil, les références et les séances précédentes", () => {
    const preparation = source("app/sessions/new.tsx");
    expect(preparation).toContain("buildQuickSessionDraft(activeProfile, nextReferences, previousSessions)");
    expect(preparation).toContain("setWeaponId(draft.weaponId)");
    expect(preparation).toContain("setTargetTypeId(draft.targetTypeId)");
    expect(preparation).toContain("setDistanceMm(draft.distanceMm ?? 7000)");
  });

  it("conserve distance rapide, distance personnalisée, mode, arme et cible sans tunnel brouillon", () => {
    const preparation = source("app/sessions/new.tsx");
    expect(preparation).toContain("STANDARD_DISTANCES_MM.map");
    expect(preparation).toContain("Distance personnalisée en mètres");
    expect(preparation).toContain("Mode");
    expect(preparation).toContain("Arme");
    expect(preparation).toContain("Type de cible");
    expect(preparation).not.toContain("setPendingDraft");
    expect(preparation).not.toContain("/sessions/review");
  });

  it("expose numberOfHands dans le vrai contrat et l’écran de préparation", () => {
    const contract = source("src/domain/session.ts");
    const preparation = source("app/sessions/new.tsx");
    const detail = source("app/sessions/[id]/index.tsx");
    expect(contract).toContain("numberOfHands");
    expect(preparation).toContain("useState<NumberOfHands>(2)");
    expect(preparation).toContain("Nombre de mains");
    expect(preparation).toContain('Choice label="1 main"');
    expect(preparation).toContain('Choice label="2 mains"');
    expect(detail).toContain('session.numberOfHands === null ? "non renseigné"');
  });

  it("persiste le lien existant source, hypothèse, test et série générée", () => {
    const provider = source("src/ui/CoachingProvider.tsx");
    expect(provider).toContain("sourceSeriesId:h.seriesId!");
    expect(provider).toContain("hypothesisId:h.id");
    expect(provider).toContain("testCode:CONTROLLED_BIAS_CONFIRMATION_TEST_CODE");
    expect(provider).toContain("generatedSeriesId:created.id");
  });

  it("conserve naturellement le contexte numberOfHands de la séance dans la série de confirmation", () => {
    const provider = source("src/ui/CoachingProvider.tsx");
    const seriesContract = source("src/domain/series.ts");
    expect(provider).toContain('seriesRepo.create({sessionId:h.sessionId,type:"diagnostic"');
    expect(seriesContract).not.toContain("numberOfHands");
  });

  it("ne transforme plus une métrique absente en faux zéro et intercepte le rejet de chargement", () => {
    const screen = source("app/sessions/[id]/index.tsx");
    expect(screen).toContain("loadSessionEvolutionMetrics");
    expect(screen).toContain("Chargement de la séance impossible");
    expect(screen).toContain("Métriques indisponibles pour cette série");
    expect(screen).not.toContain("value?.includedImpactCount ?? 0");
  });

  it("réutilise une confirmation existante au lieu de créer une troisième série", () => {
    const provider = source("src/ui/CoachingProvider.tsx");
    const screen = source("app/sessions/[id]/series/[seriesId].tsx");
    expect(provider).toContain("repo.findTestRun(h.seriesId!,h.id,CONTROLLED_BIAS_CONFIRMATION_TEST_CODE)");
    expect(screen).toContain("existingBiasConfirmation&&compactOffset");
    expect(screen).toContain("Voir le résultat du test");
  });

  it("priorise le résultat spécifique et masque la confirmation dans l’analyse générale diagnostique", () => {
    const screen = source("app/sessions/[id]/series/[seriesId].tsx");
    expect(screen).toContain("Résultat du test");
    expect(screen).toContain("Voir l’analyse générale de cette série");
    expect(screen).toContain("allowBiasConfirmation={!hasContextualResult}");
    expect(screen.indexOf("<DiagnosticConfirmationSection")).toBeLessThan(screen.indexOf("<ObservationSection"));
  });

  it("résout le ConfirmationTestRun avant le pipeline général et préserve son résultat si ce pipeline échoue", () => {
    const screen = source("app/sessions/[id]/series/[seriesId].tsx");
    expect(screen.indexOf("resolveBiasConfirmation(seriesId)")).toBeLessThan(screen.indexOf("const metrics = await calculate(seriesId)"));
    expect(screen).toContain("if (!nextDiagnostic&&!nextControl) throw reason");
  });

  it("le pilote traduit le niveau interne sans afficher confiance low", () => {
    const pilot = source("app/sessions/[id]/series/[seriesId]/pedagogical-v2-pilot.tsx");
    expect(pilot).toContain("factualConfidenceLevelLabels[item.confidenceLevel]");
    expect(pilot).not.toContain("confiance ${item.confidenceLevel}");
  });
});
