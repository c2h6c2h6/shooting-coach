import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { TechnicalHypothesis } from "../domain/technicalHypothesis";
import {
  factualConfidenceLabels,
  factualConfidenceLevelLabels,
  partitionHypothesesForDisplay,
  plausibilityLabels,
  userFacingHypothesisRationale,
} from "./analysisPresentation";

const hypothesis = (id: string, rank: number): TechnicalHypothesis => ({
  id,
  sessionId: "session-1",
  seriesId: "series-1",
  comparisonId: null,
  observationId: "observation-1",
  hypothesisCode: "EQUIPMENT_OR_SIGHT_ISSUE",
  category: "context_equipment",
  status: "requires_confirmation",
  plausibilityLevel: rank === 1 ? "high" : rank === 2 ? "medium" : "low",
  confidenceLevel: "very_low",
  rank,
  internalScore: 5 - rank,
  supportingEvidence: [{
    code: "COMPATIBLE_OBSERVATION",
    labelFr: "Compatible avec COMPACT_BUT_OFFSET.",
    source: "observation",
  }],
  contradictingEvidence: [],
  missingEvidence: [],
  applicableContext: {},
  sourceRules: ["TEST/FIXTURE"],
  rulesetVersion: "TEST/FIXTURE",
  generatedAt: "2026-08-24T10:00:00.000Z",
});

describe("présentation simplifiée des hypothèses", () => {
  it("conserve la première hypothèse comme piste principale", () => {
    const hypotheses = [hypothesis("h1", 1), hypothesis("h2", 2)];
    expect(partitionHypothesesForDisplay(hypotheses).primary).toBe(hypotheses[0]);
  });

  it("ne montre qu’une alternative par défaut", () => {
    const hypotheses = [hypothesis("h1", 1), hypothesis("h2", 2), hypothesis("h3", 3)];
    expect(partitionHypothesesForDisplay(hypotheses).visibleAlternative).toBe(hypotheses[1]);
  });

  it("conserve toutes les autres pistes dans la section repliable", () => {
    const hypotheses = [hypothesis("h1", 1), hypothesis("h2", 2), hypothesis("h3", 3), hypothesis("h4", 4)];
    const result = partitionHypothesesForDisplay(hypotheses);
    expect(result.additionalAlternatives).toEqual(hypotheses.slice(2));
    expect([result.primary, result.visibleAlternative, ...result.additionalAlternatives]).toEqual(hypotheses);
  });

  it("ne mute ni ne reclasse les hypothèses du moteur", () => {
    const hypotheses = [hypothesis("h1", 1), hypothesis("h2", 2), hypothesis("h3", 3)];
    const before = hypotheses.map((item) => item.id);
    partitionHypothesesForDisplay(hypotheses);
    expect(hypotheses.map((item) => item.id)).toEqual(before);
  });

  it("traduit la plausibilité sans exposer la compatibilité brute", () => {
    expect(plausibilityLabels).toEqual({
      high: "Piste plausible",
      medium: "Piste possible",
      low: "Piste secondaire",
    });
  });

  it("traduit la confiance factuelle en consigne utilisateur", () => {
    expect(factualConfidenceLabels.low).toBe("À interpréter avec prudence.");
    expect(factualConfidenceLabels.medium).toBe("Observation à confirmer.");
    expect(factualConfidenceLevelLabels).toEqual({ low: "faible", medium: "moyenne", high: "élevée" });
  });

  it("masque les codes techniques des justifications par défaut", () => {
    expect(userFacingHypothesisRationale(hypothesis("h1", 1))).toBe(
      "Cette piste est compatible avec les faits observés et reste à confirmer.",
    );
    expect(userFacingHypothesisRationale({
      ...hypothesis("h1", 1),
      supportingEvidence: [
        hypothesis("h1", 1).supportingEvidence[0],
        { code: "REPEATED", labelFr: "Observation répétée pendant la séance.", source: "observation" },
      ],
    })).toBe("Observation répétée pendant la séance.");
  });
});

describe("écran d’analyse simplifié — garde-fous source", () => {
  const screen = readFileSync(resolve(process.cwd(), "app/sessions/[id]/series/[seriesId].tsx"), "utf8");

  it("respecte l’ordre synthèse, pistes, puis mesures détaillées", () => {
    expect(screen.indexOf("<ObservationSection")).toBeLessThan(screen.indexOf("<HypothesisSection"));
    expect(screen.indexOf("<HypothesisSection")).toBeLessThan(screen.indexOf("<ObjectiveResults"));
    expect(screen).toContain("Voir les mesures détaillées");
  });

  it("présente une piste principale et relègue les autres dans une section repliable", () => {
    expect(screen).toContain("Piste à vérifier");
    expect(screen).toContain("presentation.visibleAlternative");
    expect(screen).toContain("presentation.additionalAlternatives");
    expect(screen).toContain("Autres pistes");
    expect(screen).not.toContain("{hypotheses.map((h,index)");
  });

  it("retire le niveau de preuve répété et hiérarchise les actions", () => {
    expect(screen).not.toContain("Niveau de preuve :");
    expect(screen).not.toContain("Compatibilité avec les observations :");
    expect(screen.indexOf("Vérifier cette piste")).toBeLessThan(screen.indexOf("Autres pistes"));
    expect(screen).toContain("onConfirmBias(primary)");
    expect(screen).toContain("style={styles.debugAction}");
  });

  it("conserve la doctrine et une question à choix exclusif", () => {
    expect(screen).not.toContain("La cible seule ne permet pas d’identifier avec certitude l’origine du résultat.");
    expect(screen).toContain("Pourquoi ?");
    expect(screen).toContain("Pour mieux comprendre");
    expect(screen).toContain('selectedAnswer===v?"●":"○"');
    expect(screen).not.toMatch(/internalScore|sourceRules|rulesetVersion|hypothesisCode\}/);
  });
});
