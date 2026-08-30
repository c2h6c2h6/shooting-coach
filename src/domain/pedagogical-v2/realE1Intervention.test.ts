import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type Competence,
  type PedagogicalEvidence,
  type PedagogicalTechnique,
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
import { createNotEvaluatedMasteryState } from "./masteryState";
import { loadPedagogicalReferenceEV1 } from "./catalogs/pedagogical-reference-e-v1";
import { orchestrateSyntheticPedagogicalFlow } from "./syntheticOrchestrator";

const timestamp = "2026-01-01T12:00:00.000Z";
const uncertaintyCode = "UNCERTAINTY_E1_ANTICIPATORY_RESPONSE";
const evidenceRationale = "TEST/FIXTURE : une réponse motrice anticipatrice est observée malgré l’absence de départ réel.";
const decisionRationale = "Les evidence disponibles soutiennent la poursuite d’un travail ciblé sur E1. TECH-E1-01 est explicitement retenue pour travailler l’acceptation du départ sans réponse anticipatrice, sans exercice formalisé ni modification automatique de maîtrise.";

const catalog = loadPedagogicalReferenceEV1();
const e1 = catalog.competences.find((item) => item.id === "competence-e1")!;
const diagnosticTest = catalog.diagnosticTests.find((item) => item.id === "diagnostic-test-e1-01")!;
const technique = catalog.techniques.find((item) => item.id === "technique-e1-01")!;

type CatalogItem = Competence | DiagnosticTestDefinition | PedagogicalTechnique;

function catalogSnapshot(
  referenceType: PedagogicalReferenceType,
  item: CatalogItem,
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

const e1Snapshot = catalogSnapshot("competence", e1);
const testSnapshot = catalogSnapshot("diagnostic_test", diagnosticTest);
const techniqueSnapshot = catalogSnapshot("pedagogical_technique", technique);
const observationSnapshot = entitySnapshot(
  "observation",
  "TEST-FIXTURE-OBSERVATION-E1-INTERVENTION",
  "TEST/FIXTURE observation E1 explicitement fournie",
);
const sourceSnapshot = entitySnapshot(
  "source",
  "TEST-FIXTURE-SOURCE-E1-INTERVENTION",
  "TEST/FIXTURE source intervention E1",
);

const provenance: PedagogicalRecordProvenance = {
  sourceType: "TEST/FIXTURE-E1-INTERVENTION",
  sourceId: "TEST-FIXTURE-SOURCE-E1-INTERVENTION",
  actorType: "TEST/FIXTURE-INSTRUCTOR",
  actorId: "TEST-FIXTURE-INSTRUCTOR-E1",
};

const evidence: PedagogicalEvidence = {
  id: "TEST-FIXTURE-EVIDENCE-E1-INTERVENTION",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "TEST/FIXTURE-1",
  catalogVersion: "TEST/FIXTURE-E1-INTERVENTION",
  subjectType: "uncertainty",
  subjectId: uncertaintyCode,
  sourceType: "diagnostic_test_result",
  sourceReferenceId: "TEST-FIXTURE-RESULT-E1-INTERVENTION",
  value: { kind: "TEST/FIXTURE", rationale: evidenceRationale },
  effect: "strengthens",
  // Contract-valid fixture values only; no business rule or threshold is derived from them.
  strength: 0.5,
  reliability: 0.5,
};

const diagnosticResult: DiagnosticTestResult = diagnosticTestResultSchema.parse({
  id: "TEST-FIXTURE-RESULT-E1-INTERVENTION",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "TEST/FIXTURE-1",
  performedAt: timestamp,
  diagnosticTestSnapshot: testSnapshot,
  status: "usable",
  structuredResult: { kind: "TEST/FIXTURE", rationale: evidenceRationale },
  observationSnapshots: [observationSnapshot],
  evidenceSnapshots: [evidence],
  knownLimitations: ["TEST/FIXTURE : résultat limité à la condition observée."],
  inconclusiveReason: null,
  provenance,
});

const diagnosticResultSnapshot = entitySnapshot(
  "diagnostic_test_result",
  diagnosticResult.id,
  "TEST/FIXTURE résultat TEST-E1-01",
);

const decision: PedagogicalDecision = pedagogicalDecisionSchema.parse({
  id: "TEST-FIXTURE-DECISION-E1-MAINTAIN",
  schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  createdAt: timestamp,
  sourceSnapshots: [sourceSnapshot],
  observationSnapshots: [observationSnapshot],
  hypothesisSnapshots: [],
  evidenceSnapshots: [evidence],
  uncertainty: null,
  knownLimitations: ["TEST/FIXTURE : aucune validation automatique de E1."],
  diagnosticTestSnapshot: testSnapshot,
  diagnosticTestResultSnapshot: diagnosticResultSnapshot,
  targetCompetenceSnapshot: e1Snapshot,
  pedagogicalTechniqueSnapshot: techniqueSnapshot,
  exerciseSnapshot: null,
  effectiveVariablesSnapshot: null,
  evaluationSnapshot: null,
  decisionType: "MAINTAIN",
  rationale: decisionRationale,
  ruleVersions: { "explicit-fixture-composition": "TEST/FIXTURE-E1-INTERVENTION-V1" },
});

const currentMasteryState = createNotEvaluatedMasteryState({
  shooterId: "TEST-FIXTURE-SHOOTER-E1",
  competenceSnapshot: e1Snapshot,
});

const interventionResult = orchestrateSyntheticPedagogicalFlow({
  diagnosticTestResult: diagnosticResult,
  competenceEvaluation: null,
  decision,
  currentMasteryState,
  proposedMasteryEvent: null,
  previousVariablesSnapshot: null,
  nextVariablesSnapshot: null,
});

describe("première intervention pédagogique métier réelle E1", () => {
  it("charge les vrais objets E1, TEST-E1-01 et TECH-E1-01", () => {
    expect([e1.id, diagnosticTest.id, technique.id]).toEqual([
      "competence-e1",
      "diagnostic-test-e1-01",
      "technique-e1-01",
    ]);
  });

  it("conserve le résultat usable et l’evidence strengthens explicitement fournis", () => {
    expect(diagnosticResult.status).toBe("usable");
    expect(diagnosticResult.diagnosticTestSnapshot.id).toBe("diagnostic-test-e1-01");
    expect(diagnosticResult.evidenceSnapshots).toEqual([evidence]);
    expect(evidence).toMatchObject({
      subjectId: uncertaintyCode,
      effect: "strengthens",
      strength: 0.5,
      reliability: 0.5,
    });
  });

  it("valide l’invariant technique non nulle avec exercice et variables nuls", () => {
    expect(pedagogicalDecisionSchema.safeParse(decision).success).toBe(true);
    expect(decision.pedagogicalTechniqueSnapshot).toMatchObject({
      id: "technique-e1-01",
      code: "TECH-E1-01",
    });
    expect(decision.exerciseSnapshot).toBeNull();
    expect(decision.effectiveVariablesSnapshot).toBeNull();
  });

  it("conserve la décision MAINTAIN explicitement fournie et ciblée sur E1", () => {
    expect(interventionResult.decision).toMatchObject({
      decisionType: "MAINTAIN",
      rationale: decisionRationale,
      targetCompetenceSnapshot: { id: "competence-e1", code: "E1" },
      pedagogicalTechniqueSnapshot: { id: "technique-e1-01", code: "TECH-E1-01" },
    });
  });

  it("ne produit aucun MasteryEvent et ne modifie pas l’état de maîtrise", () => {
    expect(interventionResult.masteryEvent).toBeNull();
    expect(interventionResult.transition).toBeNull();
    expect(interventionResult.currentMasteryStateAfter).toEqual(currentMasteryState);
    expect(interventionResult.currentMasteryStateAfter.currentLevel).toBe("not_evaluated");
  });

  it("ne crée ni évaluation ni validation automatique E1", () => {
    expect(interventionResult.competenceEvaluation).toBeNull();
    expect(interventionResult.decision.evaluationSnapshot).toBeNull();
    expect(e1.validationMode).toBe("instructor");
  });

  it("ne crée aucun lien automatique TEST-E1-01 vers TECH-E1-01", () => {
    expect(diagnosticTest).not.toHaveProperty("pedagogicalTechniqueId");
    expect(diagnosticTest).not.toHaveProperty("selectedTechniqueId");
    expect(diagnosticResult).not.toHaveProperty("pedagogicalTechniqueSnapshot");
    expect(diagnosticResult).not.toHaveProperty("selectedTechniqueId");
    expect(decision.pedagogicalTechniqueSnapshot?.id).toBe("technique-e1-01");
  });

  it("conserve l’exercice E1 de référence sans le sélectionner automatiquement", () => {
    expect(catalog.techniques).toHaveLength(1);
    expect(catalog.exercises.map((exercise) => exercise.code)).toEqual(["EX-E1-01"]);
    expect(catalog.tools).toEqual([]);
    expect(interventionResult.decision.exerciseSnapshot).toBeNull();
  });
});
