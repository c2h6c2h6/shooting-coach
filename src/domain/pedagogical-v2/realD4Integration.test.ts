import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type PedagogicalEvidence,
  type PedagogicalTechnique,
  type ExerciseDefinition,
  type Competence,
} from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type EffectivePedagogicalVariablesSnapshot,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
  type PedagogicalReferenceType,
} from "./decisionContracts";
import { pedagogicalDecisionSchema } from "./decisionSchemas";
import {
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type CompetenceEvaluation,
  type DiagnosticTestDefinition,
  type DiagnosticTestResult,
  type PedagogicalRecordProvenance,
} from "./inputContracts";
import { competenceEvaluationSchema, diagnosticTestResultSchema } from "./inputSchemas";
import {
  PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
  type CurrentMasteryState,
  type MasteryEvent,
} from "./masteryContracts";
import { masteryEventSchema } from "./masterySchemas";
import { loadPedagogicalReferenceDV1 } from "./catalogs/pedagogical-reference-d-v1";
import { orchestrateSyntheticPedagogicalFlow } from "./syntheticOrchestrator";

const timestamp = "2026-01-01T12:00:00.000Z";
const shooterId = "TEST-FIXTURE-SHOOTER-5E";
const uncertaintyCode = "UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT";

const catalog = loadPedagogicalReferenceDV1();
const d3 = catalog.competences.find((item) => item.id === "competence-d3")!;
const d4 = catalog.competences.find((item) => item.id === "competence-d4")!;
const diagnosticTest = catalog.diagnosticTests.find((item) => item.id === "diagnostic-test-d4-01")!;
const technique = catalog.techniques.find((item) => item.id === "technique-d4-01")!;
const exercise = catalog.exercises.find((item) => item.id === "exercise-d4-01")!;

type CatalogSnapshotSource = Competence | DiagnosticTestDefinition | PedagogicalTechnique | ExerciseDefinition;

function catalogSnapshot(
  referenceType: PedagogicalReferenceType,
  item: CatalogSnapshotSource,
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
  schemaVersion: string,
  displayName: string,
  recordVersion: string,
): PedagogicalReferenceSnapshot {
  return {
    referenceType,
    origin: "versioned_entity",
    id,
    code: null,
    displayName,
    itemVersion: recordVersion,
    catalogVersion: null,
    schemaVersion,
  };
}

const d4Snapshot = catalogSnapshot("competence", d4);
const diagnosticTestSnapshot = catalogSnapshot("diagnostic_test", diagnosticTest);
const techniqueSnapshot = catalogSnapshot("pedagogical_technique", technique);
const exerciseSnapshot = catalogSnapshot("exercise", exercise);

const effectiveVariables: EffectivePedagogicalVariablesSnapshot = {
  snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  values: { ...exercise.defaultVariables },
};

const provenance: PedagogicalRecordProvenance = {
  sourceType: "TEST/FIXTURE-5E",
  sourceId: null,
  actorType: "TEST/FIXTURE-INSTRUCTOR",
  actorId: "TEST-FIXTURE-INSTRUCTOR-5E",
};

const sourceSnapshot = entitySnapshot(
  "source",
  "TEST-FIXTURE-SOURCE-5E",
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  "TEST/FIXTURE source 5E",
  "TEST-FIXTURE-1",
);

const evidence: PedagogicalEvidence = {
  id: "TEST-FIXTURE-EVIDENCE-D4-5E",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "TEST-FIXTURE-1",
  catalogVersion: "TEST-FIXTURE-5E",
  subjectType: "uncertainty",
  subjectId: uncertaintyCode,
  sourceType: "diagnostic_test_result",
  sourceReferenceId: "TEST-FIXTURE-DIAGNOSTIC-RESULT-D4-5E-usable",
  value: { fixtureMeaning: "TEST/FIXTURE explicit strengthening evidence" },
  effect: "strengthens",
  strength: 0.5,
  reliability: 0.5,
};

function diagnosticResult(status: DiagnosticTestResult["status"]): DiagnosticTestResult {
  const usable = status === "usable";
  return diagnosticTestResultSchema.parse({
    id: `TEST-FIXTURE-DIAGNOSTIC-RESULT-D4-5E-${status}`,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: "TEST-FIXTURE-1",
    performedAt: timestamp,
    diagnosticTestSnapshot,
    status,
    structuredResult: { fixtureStatus: `TEST/FIXTURE ${status}` },
    observationSnapshots: [],
    evidenceSnapshots: usable ? [{ ...evidence, sourceReferenceId: `TEST-FIXTURE-DIAGNOSTIC-RESULT-D4-5E-${status}` }] : [],
    knownLimitations: [diagnosticTest.interpretationLimits[0]],
    inconclusiveReason: status === "inconclusive"
      ? "TEST/FIXTURE : l’action n’a pas pu être observée de manière suffisamment fiable."
      : null,
    provenance,
  });
}

function evaluation(id: string, assessment: string): CompetenceEvaluation {
  return competenceEvaluationSchema.parse({
    id,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: "TEST-FIXTURE-1",
    evaluatedAt: timestamp,
    competenceSnapshot: d4Snapshot,
    contextSnapshot: null,
    effectiveVariablesSnapshot: effectiveVariables,
    observationSnapshots: [],
    evidenceSnapshots: [evidence],
    structuredResult: { assessment },
    validationMode: "instructor",
    humanValidation: {
      validatorId: "TEST-FIXTURE-INSTRUCTOR-5E",
      validatorRole: "TEST/FIXTURE-INSTRUCTOR",
      validatedAt: timestamp,
      rationale: "TEST/FIXTURE explicit human validation.",
    },
    knownLimitations: ["TEST/FIXTURE evaluation limited to the observed condition."],
    rationale: assessment,
    provenance,
  });
}

const maintainEvaluation = evaluation(
  "TEST-FIXTURE-EVALUATION-D4-MAINTAIN-5E",
  "D4 est produite volontairement mais reste insuffisamment reproductible dans la condition observée.",
);

const progressEvaluation = evaluation(
  "TEST-FIXTURE-EVALUATION-D4-PROGRESS-5E",
  "TEST/FIXTURE evaluation explicitly supplied for an acquisition to stabilization proposal.",
);

function evaluationSnapshotOf(value: CompetenceEvaluation): PedagogicalReferenceSnapshot {
  return entitySnapshot("evaluation", value.id, value.schemaVersion, "TEST/FIXTURE D4 evaluation", value.recordVersion);
}

function resultSnapshotOf(value: DiagnosticTestResult): PedagogicalReferenceSnapshot {
  return entitySnapshot(
    "diagnostic_test_result",
    value.id,
    value.schemaVersion,
    "TEST/FIXTURE TEST-D4-01 result",
    value.recordVersion,
  );
}

function explicitDecision(
  decisionType: PedagogicalDecision["decisionType"],
  value: CompetenceEvaluation,
  testResult: DiagnosticTestResult,
  id: string,
  rationale: string,
): PedagogicalDecision {
  return pedagogicalDecisionSchema.parse({
    id,
    schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
    createdAt: timestamp,
    sourceSnapshots: [sourceSnapshot],
    observationSnapshots: [],
    hypothesisSnapshots: [],
    evidenceSnapshots: testResult.evidenceSnapshots,
    uncertainty: null,
    knownLimitations: [...value.knownLimitations],
    diagnosticTestSnapshot,
    diagnosticTestResultSnapshot: resultSnapshotOf(testResult),
    targetCompetenceSnapshot: d4Snapshot,
    pedagogicalTechniqueSnapshot: techniqueSnapshot,
    exerciseSnapshot,
    effectiveVariablesSnapshot: effectiveVariables,
    evaluationSnapshot: evaluationSnapshotOf(value),
    decisionType,
    rationale,
    ruleVersions: { integrationFixture: "TEST-FIXTURE-5E" },
  });
}

function acquisitionState(): CurrentMasteryState {
  return {
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    shooterId,
    competenceSnapshot: d4Snapshot,
    currentLevel: "acquisition",
    lastAppliedEventId: "TEST-FIXTURE-PRIOR-EVENT-D4-5E",
    lastAppliedAt: "2026-01-01T11:00:00.000Z",
    lastChangedAt: "2026-01-01T11:00:00.000Z",
    lastContextSnapshot: null,
    lastEffectiveVariablesSnapshot: effectiveVariables,
    appliedEventCount: 1,
    anomalies: [],
  };
}

function explicitMasteryEvent(
  decision: PedagogicalDecision,
  value: CompetenceEvaluation,
  resultingLevel: "stabilization" | "transfer",
): MasteryEvent {
  return masteryEventSchema.parse({
    id: `TEST-FIXTURE-MASTERY-EVENT-D4-${resultingLevel}-5E`,
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    recordVersion: "TEST-FIXTURE-1",
    shooterId,
    competenceSnapshot: d4Snapshot,
    expectedPreviousLevel: "acquisition",
    resultingLevel,
    eventType: "TEST/FIXTURE explicit mastery transition",
    sourceType: "TEST/FIXTURE 5E",
    pedagogicalDecisionSnapshot: entitySnapshot(
      "pedagogical_decision",
      decision.id,
      decision.schemaVersion,
      "TEST/FIXTURE explicit decision",
      "TEST-FIXTURE-1",
    ),
    competenceEvaluationSnapshot: evaluationSnapshotOf(value),
    evidenceSnapshots: value.evidenceSnapshots,
    contextSnapshot: null,
    effectiveVariablesSnapshot: effectiveVariables,
    humanValidation: value.humanValidation,
    rationale: "TEST/FIXTURE explicit mastery-event proposal.",
    occurredAt: "2026-01-01T13:00:00.000Z",
    transitionRuleVersion: "TEST-FIXTURE-TRANSITION-RULES-5E",
  });
}

function orchestrate(
  decision: PedagogicalDecision,
  testResult: DiagnosticTestResult,
  value: CompetenceEvaluation,
  proposedMasteryEvent: MasteryEvent | null,
  previousVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null = null,
  nextVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null = null,
) {
  return orchestrateSyntheticPedagogicalFlow({
    diagnosticTestResult: testResult,
    competenceEvaluation: value,
    decision,
    currentMasteryState: acquisitionState(),
    proposedMasteryEvent,
    previousVariablesSnapshot,
    nextVariablesSnapshot,
  } as Parameters<typeof orchestrateSyntheticPedagogicalFlow>[0]);
}

describe("5E — intégration métier réelle D4, pure et inactive", () => {
  it("charge le vrai catalogue D et conserve les cinq objets utilisés par le scénario D4", () => {
    expect(d3.id).toBe("competence-d3");
    expect(d4.id).toBe("competence-d4");
    expect(diagnosticTest.id).toBe("diagnostic-test-d4-01");
    expect(technique.id).toBe("technique-d4-01");
    expect(exercise.id).toBe("exercise-d4-01");
    expect(catalog.competences.map((item) => item.id)).toEqual([
      "competence-d2", "competence-d3", "competence-d4", "competence-d5", "competence-d6",
    ]);
    expect(catalog.diagnosticTests).toHaveLength(2);
    expect(catalog.techniques).toHaveLength(2);
    expect(catalog.exercises).toHaveLength(2);
  });

  it("scénario principal — conserve MAINTAIN, les références explicites et acquisition sans événement", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "MAINTAIN",
      maintainEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-MAINTAIN-5E",
      "Maintenir le travail sur D4 afin de stabiliser une montée de pression progressive et reproductible avant toute progression supplémentaire.",
    );
    const result = orchestrate(decision, testResult, maintainEvaluation, null);
    expect(result.diagnosticTestResult?.diagnosticTestSnapshot.id).toBe(diagnosticTest.id);
    expect(result.competenceEvaluation?.competenceSnapshot.id).toBe(d4.id);
    expect(result.decision.pedagogicalTechniqueSnapshot?.id).toBe(technique.id);
    expect(result.decision.exerciseSnapshot?.id).toBe(exercise.id);
    expect(result.decision.decisionType).toBe("MAINTAIN");
    expect(result.masteryEvent).toBeNull();
    expect(result.transition).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
  });

  it("scénario de progression — PROGRESS sans événement laisse acquisition inchangé", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "PROGRESS",
      progressEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-PROGRESS-NO-EVENT-5E",
      "TEST/FIXTURE explicit PROGRESS decision without mastery event.",
    );
    const result = orchestrate(decision, testResult, progressEvaluation, null);
    expect(result.decision.decisionType).toBe("PROGRESS");
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
  });

  it("scénario de progression — applique acquisition vers stabilization uniquement avec l'événement explicite", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "PROGRESS",
      progressEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-PROGRESS-5E",
      "TEST/FIXTURE explicit PROGRESS decision with explicit mastery event.",
    );
    const event = explicitMasteryEvent(decision, progressEvaluation, "stabilization");
    const result = orchestrate(decision, testResult, progressEvaluation, event);
    expect(result.transition).toMatchObject({ accepted: true, kind: "progression" });
    expect(result.masteryEvent?.id).toBe(event.id);
    expect(result.currentMasteryStateAfter.currentLevel).toBe("stabilization");
  });

  it("scénario interdit — refuse acquisition vers transfer sans corriger automatiquement la cible", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "PROGRESS",
      progressEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-FORBIDDEN-5E",
      "TEST/FIXTURE explicit forbidden transition proposal.",
    );
    const event = explicitMasteryEvent(decision, progressEvaluation, "transfer");
    const result = orchestrate(decision, testResult, progressEvaluation, event);
    expect(result.transition).toMatchObject({
      accepted: false,
      reasonCode: "ACQUISITION_TO_TRANSFER_FORBIDDEN",
    });
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
    expect(result.anomalies).toEqual([
      expect.objectContaining({ code: "INVALID_TRANSITION", eventId: event.id }),
    ]);
    expect(result.decision).toEqual(decision);
  });

  it("scénario non discriminant — conserve le résultat sans inventer de suite", () => {
    const result = diagnosticResult("non_discriminating");
    expect(result.status).toBe("non_discriminating");
    expect(result.diagnosticTestSnapshot.id).toBe(diagnosticTest.id);
    expect(result.evidenceSnapshots).toEqual([]);
    expect(result).not.toHaveProperty("competenceEvaluation");
    expect(result).not.toHaveProperty("pedagogicalTechniqueSnapshot");
    expect(result).not.toHaveProperty("exerciseSnapshot");
    expect(result).not.toHaveProperty("masteryEvent");
  });

  it("scénario inconclusif — conserve la raison sans générer de décision", () => {
    const result = diagnosticResult("inconclusive");
    expect(result.status).toBe("inconclusive");
    expect(result.inconclusiveReason).toBe(
      "TEST/FIXTURE : l’action n’a pas pu être observée de manière suffisamment fiable.",
    );
    expect(result.evidenceSnapshots).toEqual([]);
    expect(result).not.toHaveProperty("pedagogicalDecision");
    expect(result).not.toHaveProperty("pedagogicalTechniqueSnapshot");
    expect(result).not.toHaveProperty("exerciseSnapshot");
    expect(result).not.toHaveProperty("masteryEvent");
  });

  it("scénario L1+ — détecte time comme unique changement compatible", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "MAINTAIN",
      maintainEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-L1-ONE-5E",
      "TEST/FIXTURE explicit decision for one-variable comparison.",
    );
    const next: EffectivePedagogicalVariablesSnapshot = {
      ...effectiveVariables,
      values: { ...effectiveVariables.values, time: { value: 1, unit: "TEST/FIXTURE_TIME_UNIT" } },
    };
    const result = orchestrate(decision, testResult, maintainEvaluation, null, effectiveVariables, next);
    expect(result.l1PlusValidation?.analysis.changedVariableCount).toBe(1);
    expect(result.l1PlusValidation?.analysis.changes.map((change) => change.key)).toEqual(["time"]);
    expect(result.l1PlusValidation).toMatchObject({
      status: "compatible_single_change",
      compatibleWithNormalL1Plus: true,
      configurationValidity: "not_assessed",
    });
    expect(result.l1PlusValidation).not.toHaveProperty("difficulty");
  });

  it("scénario L1+ — signale deux changements sans invalidité universelle ni progression de maîtrise", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "MAINTAIN",
      maintainEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-L1-TWO-5E",
      "TEST/FIXTURE explicit decision for two-variable comparison.",
    );
    const next: EffectivePedagogicalVariablesSnapshot = {
      ...effectiveVariables,
      values: {
        ...effectiveVariables.values,
        time: { value: 1, unit: "TEST/FIXTURE_TIME_UNIT" },
        cadence: "TEST/FIXTURE_SECOND_CHANGE",
      },
    };
    const result = orchestrate(decision, testResult, maintainEvaluation, null, effectiveVariables, next);
    expect(result.l1PlusValidation?.analysis.changedVariableCount).toBe(2);
    expect(result.l1PlusValidation?.analysis.changes.map((change) => change.key)).toEqual(["time", "cadence"]);
    expect(result.l1PlusValidation).toMatchObject({
      status: "multiple_changes",
      compatibleWithNormalL1Plus: false,
      configurationValidity: "not_assessed",
    });
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
  });

  it("contrôle la cohérence cross-object des snapshots explicitement fournis", () => {
    const testResult = diagnosticResult("usable");
    const decision = explicitDecision(
      "MAINTAIN",
      maintainEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-CROSS-OBJECT-5E",
      "TEST/FIXTURE explicit cross-object validation.",
    );
    expect(testResult.diagnosticTestSnapshot).toMatchObject({
      id: diagnosticTest.id,
      itemVersion: diagnosticTest.itemVersion,
      catalogVersion: diagnosticTest.catalogVersion,
      schemaVersion: diagnosticTest.schemaVersion,
    });
    expect(maintainEvaluation.competenceSnapshot).toMatchObject({
      id: d4.id,
      itemVersion: d4.itemVersion,
      catalogVersion: d4.catalogVersion,
      schemaVersion: d4.schemaVersion,
    });
    expect(decision.targetCompetenceSnapshot?.id).toBe(d4.id);
    expect(decision.diagnosticTestSnapshot?.id).toBe(diagnosticTest.id);
    expect(decision.pedagogicalTechniqueSnapshot?.id).toBe(technique.id);
    expect(decision.exerciseSnapshot?.id).toBe(exercise.id);
  });

  it("fige les snapshots historiques contre une mutation ultérieure des sources locales", () => {
    const testResult = diagnosticResult("usable");
    const sourceDecision = explicitDecision(
      "MAINTAIN",
      maintainEvaluation,
      testResult,
      "TEST-FIXTURE-DECISION-D4-IMMUTABLE-5E",
      "TEST/FIXTURE explicit immutable snapshot validation.",
    );
    const result = orchestrate(sourceDecision, testResult, maintainEvaluation, null);
    (sourceDecision.exerciseSnapshot as { displayName: string }).displayName = "TEST/FIXTURE MUTATED";
    (sourceDecision.effectiveVariablesSnapshot!.values as { supervision: string | null }).supervision =
      "TEST/FIXTURE MUTATED";
    expect(result.decision.exerciseSnapshot?.displayName).toBe(exercise.name);
    expect(result.decision.effectiveVariablesSnapshot?.values.supervision).toBe("instructor");
    expect(Object.isFrozen(result.decision.exerciseSnapshot)).toBe(true);
    expect(Object.isFrozen(result.decision.effectiveVariablesSnapshot?.values)).toBe(true);
  });

  it("interdit toute sélection directe TEST vers TECH, TECH vers EX ou uncertainty vers EX", () => {
    expect(diagnosticTest).not.toHaveProperty("pedagogicalTechniqueId");
    expect(diagnosticTest).not.toHaveProperty("pedagogicalTechniqueIds");
    expect(diagnosticTest).not.toHaveProperty("exerciseId");
    expect(technique).not.toHaveProperty("exerciseId");
    expect(technique).not.toHaveProperty("exerciseIds");
    expect(JSON.stringify(exercise)).not.toContain(uncertaintyCode);

    const resultWithoutSelection = diagnosticResult("usable");
    expect(resultWithoutSelection).not.toHaveProperty("pedagogicalTechniqueSnapshot");
    expect(resultWithoutSelection).not.toHaveProperty("exerciseSnapshot");
  });

  it("ne sélectionne rien depuis le catalogue et ne dépend d'aucune persistance ou du moteur v1", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const orchestratorSource = readFileSync(resolve(directory, "syntheticOrchestrator.ts"), "utf8");
    const imports = [...orchestratorSource.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    expect(imports.every((value) => value.startsWith("."))).toBe(true);
    expect(orchestratorSource).not.toMatch(/catalogLoader|catalogs\/|competence-d4|diagnostic-test-d4-01|technique-d4-01|exercise-d4-01/);
    expect(orchestratorSource).not.toMatch(/SQLite|repository|CoachingCycle|ReasoningTrace|Recommendation|TrainingDrill/);
    expect(orchestratorSource).not.toMatch(/execAsync|runAsync|insertAsync|updateAsync|deleteAsync/);
  });
});
