import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ShootingObservation } from "../domain/shootingObservation";
import type { LoadedPedagogicalCatalog } from "../domain/pedagogical-v2/catalogContracts";
import type { DiagnosticTestResultStatus } from "../domain/pedagogical-v2/inputContracts";
import {
  D4_UNCERTAINTY_CODE,
  buildD4DiagnosticTestResult,
  buildD4MaintainIntervention,
  loadD4PilotCatalog,
  resolveD4PilotReferences,
  shootingObservationToV2Snapshot,
  validateD4PilotReferences,
  type D4PilotReferences,
} from "./pedagogicalV2Pilot";

const timestamp = "2026-08-24T12:00:00.000Z";
const observation: ShootingObservation = {
  id: "real-observation-id",
  sessionId: "real-session-id",
  seriesId: "real-series-id",
  comparisonId: null,
  observationCode: "OUTLIER_TO_VERIFY",
  category: "data_quality",
  scope: "single_series",
  status: "tentative",
  magnitude: "low",
  confidenceLevel: "low",
  rank: "primary",
  supportingMetrics: { includedImpactCount: 5 },
  limitingFactors: ["Saisie manuelle des impacts."],
  algorithmVersion: "shooting-observation-v1",
  rulesetVersion: "observation-rules-v1",
  thresholdsVersion: "observation-thresholds-v1",
  sourceVersion: "series-metrics-v1",
  generatedAt: timestamp,
};

const catalogResult = loadD4PilotCatalog();
if (!catalogResult.success) throw new Error(catalogResult.errors[0].message);
const catalog = catalogResult.data;
const referencesResult = resolveD4PilotReferences(catalog);
if (!referencesResult.success) throw new Error(referencesResult.errors[0].message);
const references = referencesResult.data;

function result(status: DiagnosticTestResultStatus = "usable", overrides: Record<string, unknown> = {}) {
  return buildD4DiagnosticTestResult({
    id: `result-${status}`,
    recordVersion: "1.0.0",
    performedAt: timestamp,
    observation,
    references,
    status,
    supervisionConfirmed: true,
    evidence: status === "usable" ? {
      id: "evidence-id",
      effect: "strengthens",
      strength: 0.6,
      reliability: 0.7,
      rationale: "Saisie explicite de l’instructeur pour le test pilote.",
    } : null,
    inconclusiveReason: status === "inconclusive" ? "Observation insuffisamment fiable." : null,
    provenance: { sourceType: "pedagogical_v2_pilot", sourceId: observation.seriesId,
      actorType: "instructor", actorId: null },
    ...overrides,
  });
}

function alteredReferences(overrides: Partial<D4PilotReferences>): D4PilotReferences {
  return { ...references, ...overrides };
}

describe("pilote produit D4 — service pur", () => {
  it("projette une observation v1 réelle dans un snapshot v2 autonome", () => {
    const projected = shootingObservationToV2Snapshot(observation);
    expect(projected).toEqual({ success: true, data: {
      referenceType: "observation",
      origin: "versioned_entity",
      id: observation.id,
      code: observation.observationCode,
      displayName: "Un impact est nettement éloigné des autres et mérite d’être vérifié.",
      schemaVersion: observation.algorithmVersion,
      itemVersion: observation.rulesetVersion,
      catalogVersion: observation.thresholdsVersion,
    } });
  });

  it("fige le snapshot sans dépendre d’une résolution future", () => {
    const projected = shootingObservationToV2Snapshot(observation);
    expect(projected.success && Object.isFrozen(projected.data)).toBe(true);
    expect(projected.success && projected.data.id).toBe("real-observation-id");
  });

  it("charge les vrais objets D4 du catalogue métier existant", () => {
    expect([references.competence.id, references.diagnosticTest.id, references.technique.id, references.exercise.id])
      .toEqual(["competence-d4", "diagnostic-test-d4-01", "technique-d4-01", "exercise-d4-01"]);
  });

  it("accepte les cohérences cross-object réelles", () => {
    expect(validateD4PilotReferences(references)).toMatchObject({ success: true });
  });

  it("refuse un test observant une autre compétence", () => {
    const invalid = alteredReferences({ diagnosticTest: { ...references.diagnosticTest, observedCompetenceId: "competence-d3" } });
    expect(validateD4PilotReferences(invalid)).toMatchObject({ success: false,
      errors: [{ code: "INCOHERENT_REFERENCE", path: "diagnosticTest.observedCompetenceId" }] });
  });

  it("refuse une technique non compatible avec D4", () => {
    const invalid = alteredReferences({ technique: { ...references.technique, compatibleCompetenceIds: [] } });
    expect(validateD4PilotReferences(invalid)).toMatchObject({ success: false,
      errors: [{ code: "INCOHERENT_REFERENCE", path: "technique.compatibleCompetenceIds" }] });
  });

  it("refuse un exercice ciblant une autre compétence", () => {
    const invalid = alteredReferences({ exercise: { ...references.exercise, primaryCompetenceId: "competence-d3" } });
    expect(validateD4PilotReferences(invalid)).toMatchObject({ success: false,
      errors: [{ code: "INCOHERENT_REFERENCE", path: "exercise.primaryCompetenceId" }] });
  });

  it("refuse un prérequis d’exercice non résolu", () => {
    const invalid = alteredReferences({ resolvedCompetenceIds: ["competence-d4"] });
    expect(validateD4PilotReferences(invalid)).toMatchObject({ success: false,
      errors: [{ code: "INCOHERENT_REFERENCE", path: "exercise.prerequisiteCompetenceIds" }] });
  });

  it("refuse strength hors 0 à 1", () => {
    const built = result("usable", { evidence: { id: "e", effect: "strengthens", strength: 1.1,
      reliability: 0.5, rationale: "Saisie explicite." } });
    expect(built).toMatchObject({ success: false, errors: [{ code: "INVALID_RESULT" }] });
  });

  it("refuse reliability hors 0 à 1", () => {
    const built = result("usable", { evidence: { id: "e", effect: "strengthens", strength: 0.5,
      reliability: -0.1, rationale: "Saisie explicite." } });
    expect(built).toMatchObject({ success: false, errors: [{ code: "INVALID_RESULT" }] });
  });

  it("construit un résultat usable uniquement depuis l’evidence explicite", () => {
    const built = result();
    expect(built).toMatchObject({ success: true, data: { status: "usable",
      evidenceSnapshots: [{ subjectId: D4_UNCERTAINTY_CODE, effect: "strengthens", strength: 0.6, reliability: 0.7 }] } });
  });

  it("accepte non_discriminating sans evidence et refuse ensuite une intervention", () => {
    const built = result("non_discriminating");
    expect(built).toMatchObject({ success: true, data: { status: "non_discriminating", evidenceSnapshots: [] } });
    if (!built.success) return;
    expect(buildD4MaintainIntervention({ id: "decision", createdAt: timestamp, observation, references,
      diagnosticTestResult: built.data, decisionType: "MAINTAIN", rationale: "Confirmation explicite.",
      confirmedCompetenceId: references.competence.id, confirmedTechniqueId: references.technique.id,
      confirmedExerciseId: references.exercise.id })).toMatchObject({ success: false });
  });

  it("accepte inconclusive avec une raison et sans intervention", () => {
    const built = result("inconclusive");
    expect(built).toMatchObject({ success: true, data: { status: "inconclusive",
      inconclusiveReason: "Observation insuffisamment fiable.", evidenceSnapshots: [] } });
  });

  it("refuse inconclusive sans raison", () => {
    expect(result("inconclusive", { inconclusiveReason: "" })).toMatchObject({ success: false,
      errors: [{ code: "INCOMPLETE_RESULT", path: "inconclusiveReason" }] });
  });

  it("exige la confirmation de la supervision", () => {
    expect(result("usable", { supervisionConfirmed: false })).toMatchObject({ success: false,
      errors: [{ code: "SUPERVISION_REQUIRED" }] });
  });

  it("construit MAINTAIN avec TECH-D4-01 et EX-D4-01 seulement après confirmations explicites", () => {
    const built = result();
    if (!built.success) throw new Error("Résultat pilote invalide");
    const intervention = buildD4MaintainIntervention({
      id: "decision-id", createdAt: timestamp, observation, references, diagnosticTestResult: built.data,
      decisionType: "MAINTAIN", rationale: "Maintien explicitement confirmé par l’instructeur.",
      confirmedCompetenceId: "competence-d4", confirmedTechniqueId: "technique-d4-01",
      confirmedExerciseId: "exercise-d4-01",
    });
    expect(intervention).toMatchObject({ success: true, data: {
      decision: { decisionType: "MAINTAIN", targetCompetenceSnapshot: { id: "competence-d4" },
        pedagogicalTechniqueSnapshot: { id: "technique-d4-01" }, exerciseSnapshot: { id: "exercise-d4-01" },
        effectiveVariablesSnapshot: { values: { supervision: "instructor" } } },
      technique: { id: "technique-d4-01" }, exercise: { id: "exercise-d4-01" }, masteryEvent: null,
    } });
    expect(intervention.success && Object.isFrozen(intervention.data)).toBe(true);
  });

  it("refuse l’intervention si TECH ou EX n’est pas explicitement confirmé", () => {
    const built = result();
    if (!built.success) throw new Error("Résultat pilote invalide");
    expect(buildD4MaintainIntervention({ id: "decision", createdAt: timestamp, observation, references,
      diagnosticTestResult: built.data, decisionType: "MAINTAIN", rationale: "Confirmation explicite.",
      confirmedCompetenceId: "competence-d4", confirmedTechniqueId: "", confirmedExerciseId: "" }))
      .toMatchObject({ success: false, errors: [{ code: "EXPLICIT_CONFIRMATION_REQUIRED" }] });
  });

  it("ne dépend ni de React, Expo, SQLite, repositories ou moteur v1", () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/pedagogicalV2Pilot.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["'][^"']*(react|expo|sqlite|repositor|CoachingCycle|TechnicalHypothesis)/i);
    expect(source).not.toMatch(/runAsync|execAsync|INSERT INTO|UPDATE\s+\w+|DELETE FROM/);
  });

  it("n’encode aucune sélection automatique ou mapping v1 vers v2", () => {
    const source = readFileSync(resolve(process.cwd(), "src/application/pedagogicalV2Pilot.ts"), "utf8");
    expect(source).not.toMatch(/SHOT_ANTICIPATION|ABRUPT_TRIGGER_PRESS|LATERAL_TRIGGER_PRESSURE|ranking|internalScore/);
    expect(source).not.toMatch(/proposeCoaching|selectConfirmationTest/);
  });
});

describe("pilote produit D4 — garde-fous UI/source", () => {
  const screen = readFileSync(resolve(process.cwd(),
    "app/sessions/[id]/series/[seriesId]/pedagogical-v2-pilot.tsx"), "utf8");
  const seriesScreen = readFileSync(resolve(process.cwd(), "app/sessions/[id]/series/[seriesId].tsx"), "utf8");

  it("conditionne l’accès au flag et à une série terminée", () => {
    expect(seriesScreen).toContain("PEDAGOGICAL_V2_PILOT && series.status === \"completed\"");
    expect(seriesScreen).toContain("Pilote v2 — examiner D4");
  });

  it("marque l’écran comme non historisé et exige la supervision", () => {
    expect(screen).toContain("PILOTE PÉDAGOGIQUE V2 — NON HISTORISÉ");
    expect(screen).toContain("Test réalisé sous supervision instructeur");
    expect(screen).toContain("Pilote non historisé : ces résultats ne seront pas conservés après fermeture.");
  });

  it("ne présente l’intervention que pour usable et après confirmations", () => {
    expect(screen).toContain("testResult?.status === \"usable\"");
    expect(screen).toContain("maintainConfirmed");
    expect(screen).toContain("techniqueConfirmed");
    expect(screen).toContain("exerciseConfirmed");
  });

  it("ne contient aucune écriture v2 ou dépendance au coaching v1", () => {
    expect(screen).not.toMatch(/Sqlite|Repository|runAsync|execAsync|INSERT INTO|UPDATE\s+\w+|DELETE FROM/);
    expect(screen).not.toMatch(/useCoaching|CoachingCycle|proposeCoaching|selectConfirmationTest/);
  });
});

it("permet de signaler proprement un catalogue incomplet", () => {
  const incomplete: LoadedPedagogicalCatalog = { ...catalog, exercises: [] };
  expect(resolveD4PilotReferences(incomplete)).toMatchObject({ success: false,
    errors: [{ code: "MISSING_REFERENCE", path: "exercise" }] });
});
