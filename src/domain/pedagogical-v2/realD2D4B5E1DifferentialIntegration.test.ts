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
import { loadPedagogicalReferenceABV1 } from "./catalogs/pedagogical-reference-ab-v1";
import { loadPedagogicalReferenceDV1 } from "./catalogs/pedagogical-reference-d-v1";
import { loadPedagogicalReferenceEV1 } from "./catalogs/pedagogical-reference-e-v1";
import { buildSyntheticPedagogicalDecision } from "./syntheticOrchestrator";

const timestamp = "2026-01-01T12:00:00.000Z";
const d2UncertaintyCode = "UNCERTAINTY_D2_DIRECTIONAL_PRESSURE";
const d4UncertaintyCode = "UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT";
const b5UncertaintyCode = "UNCERTAINTY_B5_STRONG_HAND_PRESSURE_VARIATION";
const e1UncertaintyCode = "UNCERTAINTY_E1_ANTICIPATORY_RESPONSE";
const uncertaintyCodes = [
  d2UncertaintyCode,
  d4UncertaintyCode,
  b5UncertaintyCode,
  e1UncertaintyCode,
] as const;

const observationText = "Perturbation observable de l’arme autour du départ, sans attribution causale initiale.";
const d2Rationale = "Une perturbation synchronisée avec l’action de l’index varie lorsque la direction de cette action est volontairement modifiée, tandis que la pression de la main forte reste visuellement stable.";
const d4Rationale = "L’action ralentie reste progressive sans accélération terminale brusque clairement observable.";
const b5Rationale = "Aucune variation significative de pression des autres doigts de la main forte n’est observée pendant l’action de l’index dans la condition examinée.";
const e1Rationale = "Aucune réponse motrice anticipatrice n’est observée lors d’une occurrence où le départ attendu ne survient pas.";
const decisionRationale = "Les evidence recueillies dans la condition observée renforcent l’incertitude d’une composante directionnelle parasite de l’action de l’index, tandis qu’elles affaiblissent les branches D4, B5 et E1 sans les exclure universellement. Le travail reste explicitement ciblé sur D2, sans sélection automatique d’une technique ou d’un exercice.";

const catalogAB = loadPedagogicalReferenceABV1();
const catalogD = loadPedagogicalReferenceDV1();
const catalogE = loadPedagogicalReferenceEV1();

const d2 = catalogD.competences.find((item) => item.id === "competence-d2")!;
const d4 = catalogD.competences.find((item) => item.id === "competence-d4")!;
const b5 = catalogAB.competences.find((item) => item.id === "competence:B5")!;
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

const d2Snapshot = catalogSnapshot("competence", d2);
const b5Snapshot = catalogSnapshot("competence", b5);
const testD4Snapshot = catalogSnapshot("diagnostic_test", testD4);
const testE1Snapshot = catalogSnapshot("diagnostic_test", testE1);
const observationSnapshot = entitySnapshot(
  "observation",
  "TEST-FIXTURE-OBSERVATION-D2-D4-B5-E1-8B",
  observationText,
);
const sourceSnapshot = entitySnapshot(
  "source",
  "TEST-FIXTURE-SOURCE-D2-D4-B5-E1-8B",
  "TEST/FIXTURE source différentielle D2/D4/B5/E1",
);

const provenance: PedagogicalRecordProvenance = {
  sourceType: "TEST/FIXTURE-8B",
  sourceId: "TEST-FIXTURE-D2-D4-B5-E1-8B",
  actorType: "TEST/FIXTURE-INSTRUCTOR",
  actorId: "TEST/FIXTURE-INSTRUCTOR-8B",
};

function evidence(
  id: string,
  subjectId: string,
  effect: PedagogicalEvidence["effect"],
  rationale: string,
  sourceType: string,
  sourceReferenceId: string,
): PedagogicalEvidence {
  return {
    id,
    schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    itemVersion: "TEST/FIXTURE-1",
    catalogVersion: "TEST/FIXTURE-8B",
    subjectType: "uncertainty",
    subjectId,
    sourceType,
    sourceReferenceId,
    value: { kind: "TEST/FIXTURE", rationale },
    effect,
    // Contract-valid TEST/FIXTURE values only; no rule, score or threshold is derived from them.
    strength: 0.5,
    reliability: 0.5,
  };
}

const d4ResultId = "TEST-FIXTURE-DIAGNOSTIC-RESULT-D4-8B";
const e1ResultId = "TEST-FIXTURE-DIAGNOSTIC-RESULT-E1-8B";
const d2Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-D2-8B",
  d2UncertaintyCode,
  "strengthens",
  d2Rationale,
  "observation",
  observationSnapshot.id,
);
const d4Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-D4-8B",
  d4UncertaintyCode,
  "weakens",
  d4Rationale,
  "diagnostic_test_result",
  d4ResultId,
);
const b5Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-B5-8B",
  b5UncertaintyCode,
  "weakens",
  b5Rationale,
  "observation",
  observationSnapshot.id,
);
const e1Evidence = evidence(
  "TEST-FIXTURE-EVIDENCE-E1-8B",
  e1UncertaintyCode,
  "weakens",
  e1Rationale,
  "diagnostic_test_result",
  e1ResultId,
);

function diagnosticResult(
  id: string,
  testSnapshot: PedagogicalReferenceSnapshot,
  producedEvidence: PedagogicalEvidence,
  limitation: string,
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
    knownLimitations: [limitation],
    inconclusiveReason: null,
    provenance,
  });
}

const d4Result = diagnosticResult(
  d4ResultId,
  testD4Snapshot,
  d4Evidence,
  "TEST/FIXTURE : ce résultat affaiblit seulement D4 dans la condition observée.",
);
const e1Result = diagnosticResult(
  e1ResultId,
  testE1Snapshot,
  e1Evidence,
  "TEST/FIXTURE : une occurrence négative ne suffit pas à exclure E1.",
);
const e1ResultSnapshot = entitySnapshot(
  "diagnostic_test_result",
  e1Result.id,
  "TEST/FIXTURE résultat TEST-E1-01",
);

const explicitDecision: PedagogicalDecision = pedagogicalDecisionSchema.parse({
  id: "TEST-FIXTURE-DECISION-D2-D4-B5-E1-8B",
  schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  createdAt: timestamp,
  sourceSnapshots: [sourceSnapshot],
  observationSnapshots: [observationSnapshot],
  hypothesisSnapshots: [],
  evidenceSnapshots: [d2Evidence, d4Evidence, b5Evidence, e1Evidence],
  uncertainty: null,
  knownLimitations: [
    "TEST/FIXTURE : les résultats D4 et E1 restent deux objets historiques séparés.",
    "TEST/FIXTURE : aucune branche n’est exclue universellement.",
  ],
  diagnosticTestSnapshot: testE1Snapshot,
  diagnosticTestResultSnapshot: e1ResultSnapshot,
  targetCompetenceSnapshot: d2Snapshot,
  pedagogicalTechniqueSnapshot: null,
  exerciseSnapshot: null,
  effectiveVariablesSnapshot: null,
  evaluationSnapshot: null,
  decisionType: "MAINTAIN",
  rationale: decisionRationale,
  ruleVersions: { "explicit-fixture-composition": "TEST/FIXTURE-8B" },
});

const differentialFixture = {
  observationSnapshot,
  uncertaintyCodes,
  competenceSnapshots: [d2Snapshot, catalogSnapshot("competence", d4), b5Snapshot,
    catalogSnapshot("competence", e1)] as const,
  diagnosticTestResults: [d4Result, e1Result] as const,
  evidenceSnapshots: [d2Evidence, d4Evidence, b5Evidence, e1Evidence] as const,
  decision: buildSyntheticPedagogicalDecision(explicitDecision),
};

describe("fixture différentielle métier réelle D2/D4/B5/E1", () => {
  it("charge séparément les trois vrais catalogues et les quatre compétences", () => {
    expect([catalogAB.catalogVersion, catalogD.catalogVersion, catalogE.catalogVersion]).toEqual([
      "pedagogical-reference-ab-v1",
      "pedagogical-reference-d-v1",
      "pedagogical-reference-e-v1",
    ]);
    expect([d2.id, d4.id, b5.id, e1.id]).toEqual([
      "competence-d2", "competence-d4", "competence:B5", "competence-e1",
    ]);
    expect(catalogD.competences.some((item) => item.id === "competence:B5")).toBe(false);
  });

  it("conserve l’observation et les quatre incertitudes sans ordre de priorité", () => {
    expect(differentialFixture.observationSnapshot.displayName).toBe(observationText);
    expect(differentialFixture.uncertaintyCodes).toEqual(uncertaintyCodes);
    expect(differentialFixture).not.toHaveProperty("rankedUncertainties");
    expect(differentialFixture).not.toHaveProperty("primaryUncertainty");
    expect(differentialFixture).not.toHaveProperty("rankingScore");
  });

  it("conserve l’evidence D2 strengthens explicitement fournie", () => {
    expect(d2Evidence).toMatchObject({
      subjectId: d2UncertaintyCode,
      effect: "strengthens",
      sourceType: "observation",
      value: { kind: "TEST/FIXTURE", rationale: d2Rationale },
    });
  });

  it("utilise réellement TEST-D4-01 et conserve l’evidence D4 weakens", () => {
    expect(d4Result).toMatchObject({
      status: "usable",
      diagnosticTestSnapshot: { id: "diagnostic-test-d4-01", code: "TEST-D4-01" },
      evidenceSnapshots: [{ subjectId: d4UncertaintyCode, effect: "weakens" }],
    });
    expect(d4Evidence.value).toEqual({ kind: "TEST/FIXTURE", rationale: d4Rationale });
  });

  it("conserve l’evidence B5 weakens explicitement fournie sans la calculer", () => {
    expect(b5Evidence).toMatchObject({
      subjectId: b5UncertaintyCode,
      effect: "weakens",
      sourceType: "observation",
      value: { kind: "TEST/FIXTURE", rationale: b5Rationale },
    });
    expect(b5).not.toHaveProperty("automaticEvidence");
  });

  it("utilise réellement TEST-E1-01 et conserve l’evidence E1 weakens avec sa limite", () => {
    expect(e1Result).toMatchObject({
      status: "usable",
      diagnosticTestSnapshot: { id: "diagnostic-test-e1-01", code: "TEST-E1-01" },
      evidenceSnapshots: [{ subjectId: e1UncertaintyCode, effect: "weakens" }],
    });
    expect(e1Evidence.value).toEqual({ kind: "TEST/FIXTURE", rationale: e1Rationale });
    expect(e1Result.knownLimitations).toContain(
      "TEST/FIXTURE : une occurrence négative ne suffit pas à exclure E1.",
    );
  });

  it("marque toutes les valeurs quantitatives comme données TEST/FIXTURE", () => {
    expect(differentialFixture.evidenceSnapshots.map((item) => ({
      kind: (item.value as { readonly kind: string }).kind,
      strength: item.strength,
      reliability: item.reliability,
    }))).toEqual(Array.from({ length: 4 }, () => ({
      kind: "TEST/FIXTURE", strength: 0.5, reliability: 0.5,
    })));
  });

  it("conserve les deux DiagnosticTestResult séparés et agrège leurs evidence", () => {
    expect(differentialFixture.diagnosticTestResults).toEqual([d4Result, e1Result]);
    expect(differentialFixture.decision.evidenceSnapshots).toEqual([
      d2Evidence, d4Evidence, b5Evidence, e1Evidence,
    ]);
    expect(differentialFixture.decision.diagnosticTestSnapshot?.id).toBe("diagnostic-test-e1-01");
    expect(differentialFixture.decision.diagnosticTestResultSnapshot?.id).toBe(e1Result.id);
  });

  it("conserve la décision MAINTAIN explicitement fournie et ciblée sur D2", () => {
    expect(differentialFixture.decision).toMatchObject({
      decisionType: "MAINTAIN",
      rationale: decisionRationale,
      targetCompetenceSnapshot: { id: "competence-d2", code: "D2" },
      pedagogicalTechniqueSnapshot: null,
      exerciseSnapshot: null,
      effectiveVariablesSnapshot: null,
    });
  });

  it("ne crée aucun MasteryEvent, ranking ou choix automatique", () => {
    expect(differentialFixture).not.toHaveProperty("masteryEvent");
    expect(differentialFixture).not.toHaveProperty("selectedUncertainty");
    expect(differentialFixture).not.toHaveProperty("selectedTechnique");
    expect(differentialFixture).not.toHaveProperty("selectedExercise");
    expect(differentialFixture.decision.ruleVersions).toEqual({
      "explicit-fixture-composition": "TEST/FIXTURE-8B",
    });
  });

  it("permet à D2 et B5 d’être simultanément renforcées sans imposer d’exclusivité", () => {
    const b5Strengthens = {
      ...b5Evidence,
      id: "TEST-FIXTURE-EVIDENCE-B5-STRENGTHENS-8B",
      effect: "strengthens" as const,
      value: { kind: "TEST/FIXTURE", rationale: "TEST/FIXTURE : coexistence D2 et B5 explicitement fournie." },
    };
    const coexistenceFixture = {
      uncertaintyCodes,
      evidenceSnapshots: [d2Evidence, b5Strengthens] as const,
      decision: null,
    } as const;
    expect(coexistenceFixture.evidenceSnapshots.map(({ subjectId, effect }) => ({ subjectId, effect }))).toEqual([
      { subjectId: d2UncertaintyCode, effect: "strengthens" },
      { subjectId: b5UncertaintyCode, effect: "strengthens" },
    ]);
    expect(coexistenceFixture.decision).toBeNull();
    expect(coexistenceFixture).not.toHaveProperty("selectedUncertainty");
  });

  it("ne transforme pas la position isolée d’un impact en diagnostic ou sélection", () => {
    const impactOnlyFixture = {
      observation: { kind: "TEST/FIXTURE", value: "position d’impact isolée" },
      evidenceSnapshots: [],
      selectedCompetence: null,
      selectedDiagnosticTest: null,
      selectedExercise: null,
      decision: null,
    } as const;
    expect(impactOnlyFixture).toMatchObject({
      evidenceSnapshots: [],
      selectedCompetence: null,
      selectedDiagnosticTest: null,
      selectedExercise: null,
      decision: null,
    });
  });

  it("ne crée aucun objet métier ou incertitude technique unique coup de doigt", () => {
    const allCompetences = [...catalogAB.competences, ...catalogD.competences, ...catalogE.competences];
    expect(allCompetences.some((item) => /coup de doigt/i.test(`${item.id} ${item.code} ${item.name}`))).toBe(false);
    expect(uncertaintyCodes.some((code) => /COUP_DE_DOIGT/i.test(code))).toBe(false);
  });

  it("ajoute uniquement la chaîne d’indépendance sous D2 et isole les objets B4/B7", () => {
    expect(catalogD.diagnosticTests.map((item) => item.code)).toEqual(["TEST-D2-INDEPENDENCE-01","TEST-D4-01"]);
    expect(catalogD.techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(catalogD.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
    expect(catalogAB.diagnosticTests).toEqual([]);
    expect(catalogAB.techniques.map((item) => [item.code, item.compatibleCompetenceIds]))
      .toEqual([["TECH-B4-01", ["competence:B4"]], ["TECH-B6-01", ["competence:B6"]],
        ["TECH-B7-01", ["competence:B3"]]]);
    expect(catalogAB.exercises.map((item) => [item.code, item.primaryCompetenceId]))
      .toEqual([["EX-B4-01", "competence:B4"], ["EX-B6-01", "competence:B6"],
        ["EX-B6-02", "competence:B6"], ["EX-B7-01", "competence:B3"]]);
    expect(catalogAB.techniques.flatMap((item) => item.compatibleCompetenceIds))
      .not.toEqual(expect.arrayContaining(["competence-d2", "competence:B5"]));
    expect(catalogAB.exercises.map((item) => item.primaryCompetenceId))
      .not.toEqual(expect.arrayContaining(["competence-d2", "competence:B5"]));
  });
});
