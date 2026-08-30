import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type Competence,
  type PedagogicalEvidence,
} from "./contracts";
import {
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
  type PedagogicalReferenceType,
} from "./decisionContracts";
import { pedagogicalDecisionSchema } from "./decisionSchemas";
import {
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type DiagnosticTestDefinition,
  type DiagnosticTestResult,
  type PedagogicalRecordProvenance,
} from "./inputContracts";
import { diagnosticTestResultSchema } from "./inputSchemas";
import { loadPedagogicalReferenceDV1 } from "./catalogs/pedagogical-reference-d-v1";
import { loadPedagogicalReferenceEV1 } from "./catalogs/pedagogical-reference-e-v1";
import { buildSyntheticPedagogicalDecision } from "./syntheticOrchestrator";

const timestamp = "2026-01-01T12:00:00.000Z";
const d4UncertaintyCode = "UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT";
const e1UncertaintyCode = "UNCERTAINTY_E1_ANTICIPATORY_RESPONSE";
const observationText = "Perturbation observable autour du départ, sans attribution causale initiale.";
const d4EvidenceRationale = "L’action ralentie reste progressive sans accélération terminale brusque clairement observable.";
const e1EvidenceRationale = "Une réponse motrice anticipatrice est observée lors d’une occurrence où aucun départ ni recul réel ne survient.";
const decisionRationale = "Les éléments recueillis affaiblissent l’hypothèse d’une progressivité insuffisante de D4 dans la condition observée et renforcent l’incertitude d’une réponse anticipatrice relevant de E1. Une confirmation pédagogique supplémentaire est requise avant toute sélection d’exercice ou modification de maîtrise.";

const catalogD = loadPedagogicalReferenceDV1();
const catalogE = loadPedagogicalReferenceEV1();
const d4 = catalogD.competences.find((item) => item.id === "competence-d4")!;
const e1 = catalogE.competences.find((item) => item.id === "competence-e1")!;
const testD4 = catalogD.diagnosticTests.find((item) => item.id === "diagnostic-test-d4-01")!;
const testE1 = catalogE.diagnosticTests.find((item) => item.id === "diagnostic-test-e1-01")!;

function catalogSnapshot(
  referenceType: PedagogicalReferenceType,
  item: Competence | DiagnosticTestDefinition,
): PedagogicalReferenceSnapshot {
  return {
    referenceType,
    origin: "catalog_item",
    id: item.id,
    code: item.code,
    displayName: item.name,
    itemVersion: item.itemVersion,
    catalogVersion: item.catalogVersion,
    schemaVersion: item.schemaVersion,
  };
}

function entitySnapshot(
  referenceType: PedagogicalReferenceType,
  id: string,
  displayName: string,
): PedagogicalReferenceSnapshot {
  return {
    referenceType,
    origin: "versioned_entity",
    id,
    code: null,
    displayName,
    itemVersion: "TEST/FIXTURE-1",
    catalogVersion: null,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  };
}

const d4Snapshot = catalogSnapshot("competence", d4);
const e1Snapshot = catalogSnapshot("competence", e1);
const testD4Snapshot = catalogSnapshot("diagnostic_test", testD4);
const testE1Snapshot = catalogSnapshot("diagnostic_test", testE1);
const observationSnapshot = entitySnapshot(
  "observation",
  "TEST-FIXTURE-OBSERVATION-D4-E1-7B",
  observationText,
);
const sourceSnapshot = entitySnapshot(
  "source",
  "TEST-FIXTURE-SOURCE-D4-E1-7B",
  "TEST/FIXTURE source différentielle D4/E1",
);

const provenance: PedagogicalRecordProvenance = {
  sourceType: "TEST/FIXTURE-7B",
  sourceId: "TEST-FIXTURE-D4-E1-7B",
  actorType: "TEST/FIXTURE-INSTRUCTOR",
  actorId: "TEST-FIXTURE-INSTRUCTOR-7B",
};

function evidence(
  id: string,
  sourceReferenceId: string,
  subjectId: string,
  effect: PedagogicalEvidence["effect"],
  rationale: string,
): PedagogicalEvidence {
  return {
    id,
    schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    itemVersion: "TEST/FIXTURE-1",
    catalogVersion: "TEST/FIXTURE-7B",
    subjectType: "uncertainty",
    subjectId,
    sourceType: "diagnostic_test_result",
    sourceReferenceId,
    value: { kind: "TEST/FIXTURE", rationale },
    effect,
    // Neutral contract-valid fixture values; they carry no general business rule.
    strength: 0.5,
    reliability: 0.5,
  };
}

const d4ResultId = "TEST-FIXTURE-DIAGNOSTIC-RESULT-D4-7B";
const e1ResultId = "TEST-FIXTURE-DIAGNOSTIC-RESULT-E1-7B";
const d4Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-D4-7B",
  d4ResultId,
  d4UncertaintyCode,
  "weakens",
  d4EvidenceRationale,
);
const e1Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-E1-7B",
  e1ResultId,
  e1UncertaintyCode,
  "strengthens",
  e1EvidenceRationale,
);

function diagnosticResult(
  id: string,
  testSnapshot: PedagogicalReferenceSnapshot,
  producedEvidence: PedagogicalEvidence,
): DiagnosticTestResult {
  return diagnosticTestResultSchema.parse({
    id,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: "TEST/FIXTURE-1",
    performedAt: timestamp,
    diagnosticTestSnapshot: testSnapshot,
    status: "usable",
    structuredResult: {
      kind: "TEST/FIXTURE",
      rationale: (producedEvidence.value as { readonly rationale: string }).rationale,
    },
    observationSnapshots: [observationSnapshot],
    evidenceSnapshots: [producedEvidence],
    knownLimitations: ["TEST/FIXTURE : interprétation limitée à la condition observée."],
    inconclusiveReason: null,
    provenance,
  });
}

const d4Result = diagnosticResult(d4ResultId, testD4Snapshot, d4Evidence);
const e1Result = diagnosticResult(e1ResultId, testE1Snapshot, e1Evidence);

const e1ResultSnapshot = entitySnapshot(
  "diagnostic_test_result",
  e1Result.id,
  "TEST/FIXTURE résultat TEST-E1-01",
);

const explicitDecision: PedagogicalDecision = pedagogicalDecisionSchema.parse({
  id: "TEST-FIXTURE-DECISION-D4-E1-7B",
  schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  createdAt: timestamp,
  sourceSnapshots: [sourceSnapshot],
  observationSnapshots: [observationSnapshot],
  hypothesisSnapshots: [],
  evidenceSnapshots: [d4Evidence, e1Evidence],
  uncertainty: null,
  knownLimitations: [
    "TEST/FIXTURE : les deux résultats de test restent des objets historiques séparés.",
    "TEST/FIXTURE : aucune attribution causale automatique.",
  ],
  diagnosticTestSnapshot: testE1Snapshot,
  diagnosticTestResultSnapshot: e1ResultSnapshot,
  targetCompetenceSnapshot: e1Snapshot,
  pedagogicalTechniqueSnapshot: null,
  exerciseSnapshot: null,
  effectiveVariablesSnapshot: null,
  evaluationSnapshot: null,
  decisionType: "TEST_ANOTHER_HYPOTHESIS",
  rationale: decisionRationale,
  ruleVersions: { "fixture-composition": "TEST/FIXTURE-7B" },
});

const differentialFixture = {
  observationSnapshot,
  uncertaintyCodes: [d4UncertaintyCode, e1UncertaintyCode] as const,
  diagnosticTestResults: [d4Result, e1Result] as const,
  decision: buildSyntheticPedagogicalDecision(explicitDecision),
};

describe("fixture différentielle métier réelle D4/E1", () => {
  it("charge séparément les vrais catalogues D et E et leurs quatre objets", () => {
    expect(catalogD.catalogVersion).toBe("pedagogical-reference-d-v1");
    expect(catalogE.catalogVersion).toBe("pedagogical-reference-e-v1");
    expect([d4.id, testD4.id, e1.id, testE1.id]).toEqual([
      "competence-d4",
      "diagnostic-test-d4-01",
      "competence-e1",
      "diagnostic-test-e1-01",
    ]);
  });

  it("conserve l’observation sans attribution et les deux incertitudes sans priorité", () => {
    expect(differentialFixture.observationSnapshot.displayName).toBe(observationText);
    expect(differentialFixture.uncertaintyCodes).toEqual([d4UncertaintyCode, e1UncertaintyCode]);
    expect(differentialFixture).not.toHaveProperty("rankedUncertainties");
    expect(differentialFixture).not.toHaveProperty("primaryUncertainty");
  });

  it("utilise réellement TEST-D4-01 et conserve son evidence weakens explicite", () => {
    expect(d4Result.diagnosticTestSnapshot).toMatchObject({
      id: "diagnostic-test-d4-01",
      code: "TEST-D4-01",
      catalogVersion: "pedagogical-reference-d-v1",
    });
    expect(d4Result.status).toBe("usable");
    expect(d4Result.evidenceSnapshots).toEqual([d4Evidence]);
    expect(d4Evidence).toMatchObject({ subjectId: d4UncertaintyCode, effect: "weakens" });
    expect(d4Evidence.value).toEqual({ kind: "TEST/FIXTURE", rationale: d4EvidenceRationale });
  });

  it("utilise réellement TEST-E1-01 et conserve son evidence strengthens explicite", () => {
    expect(e1Result.diagnosticTestSnapshot).toMatchObject({
      id: "diagnostic-test-e1-01",
      code: "TEST-E1-01",
      catalogVersion: "pedagogical-reference-e-v1",
    });
    expect(e1Result.status).toBe("usable");
    expect(e1Result.evidenceSnapshots).toEqual([e1Evidence]);
    expect(e1Evidence).toMatchObject({ subjectId: e1UncertaintyCode, effect: "strengthens" });
    expect(e1Evidence.value).toEqual({ kind: "TEST/FIXTURE", rationale: e1EvidenceRationale });
  });

  it("marque les valeurs numériques comme fixture sans en faire une règle", () => {
    expect([d4Evidence, e1Evidence].map((item) => ({
      kind: (item.value as { readonly kind: string }).kind,
      strength: item.strength,
      reliability: item.reliability,
    }))).toEqual([
      { kind: "TEST/FIXTURE", strength: 0.5, reliability: 0.5 },
      { kind: "TEST/FIXTURE", strength: 0.5, reliability: 0.5 },
    ]);
  });

  it("conserve les deux résultats séparés et agrège uniquement leurs evidence", () => {
    expect(differentialFixture.diagnosticTestResults).toEqual([d4Result, e1Result]);
    expect(differentialFixture.decision.evidenceSnapshots).toEqual([d4Evidence, e1Evidence]);
    expect(differentialFixture.decision.diagnosticTestSnapshot?.id).toBe("diagnostic-test-e1-01");
    expect(differentialFixture.decision.diagnosticTestResultSnapshot?.id).toBe(e1Result.id);
  });

  it("préserve la décision TEST_ANOTHER_HYPOTHESIS explicitement fournie et ciblée sur E1", () => {
    expect(differentialFixture.decision).toMatchObject({
      decisionType: "TEST_ANOTHER_HYPOTHESIS",
      rationale: decisionRationale,
      targetCompetenceSnapshot: { id: "competence-e1", code: "E1" },
    });
    expect(Object.isFrozen(differentialFixture.decision)).toBe(true);
  });

  it("ne sélectionne ni technique, ni exercice et ne crée aucun changement de maîtrise", () => {
    expect(differentialFixture.decision.pedagogicalTechniqueSnapshot).toBeNull();
    expect(differentialFixture.decision.exerciseSnapshot).toBeNull();
    expect(differentialFixture.decision.effectiveVariablesSnapshot).toBeNull();
    expect(differentialFixture).not.toHaveProperty("masteryEvent");
    expect(catalogE.techniques.map((technique) => technique.id)).toEqual([
      "technique-e1-01",
    ]);
    expect(differentialFixture.decision.pedagogicalTechniqueSnapshot).toBeNull();
    expect(catalogE.exercises.map((exercise) => exercise.code)).toEqual(["EX-E1-01"]);
  });

  it("ne transforme pas la seule position d’un impact en diagnostic ou sélection v2", () => {
    const impactOnlyFixture = {
      observation: { kind: "TEST/FIXTURE", value: "position d’impact isolée" },
      diagnosticTestResults: [],
      selectedDiagnosticTest: null,
      selectedCompetence: null,
      selectedExercise: null,
      decision: null,
    } as const;
    expect(impactOnlyFixture).toMatchObject({
      diagnosticTestResults: [],
      selectedDiagnosticTest: null,
      selectedCompetence: null,
      selectedExercise: null,
      decision: null,
    });
  });

  it("n’introduit ni ranking ni causalité automatique dans les définitions de test", () => {
    for (const test of [testD4, testE1]) {
      expect(test).not.toHaveProperty("rank");
      expect(test).not.toHaveProperty("selectedTechniqueId");
      expect(test).not.toHaveProperty("selectedExerciseId");
      expect(test).not.toHaveProperty("automaticDiagnosis");
    }
  });
});
