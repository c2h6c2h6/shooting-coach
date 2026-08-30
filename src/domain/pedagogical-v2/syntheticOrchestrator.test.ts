import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type MasteryLevel,
  type PedagogicalDecisionType,
  type PedagogicalEvidence,
  type PedagogicalVariables,
} from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type EffectivePedagogicalVariablesSnapshot,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
} from "./decisionContracts";
import { pedagogicalDecisionSchema } from "./decisionSchemas";
import {
  type CompetenceEvaluation,
  type DiagnosticTestResult,
  type PedagogicalContext,
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type ShooterSelfReport,
} from "./inputContracts";
import {
  competenceEvaluationSchema,
  diagnosticTestResultSchema,
  pedagogicalContextSchema,
  shooterSelfReportSchema,
} from "./inputSchemas";
import {
  type CurrentMasteryState,
  type MasteryEvent,
  PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
} from "./masteryContracts";
import {
  buildSyntheticPedagogicalDecision,
  deriveSyntheticMasteryOutcome,
  evaluateSyntheticProgression,
  orchestrateSyntheticPedagogicalFlow,
} from "./syntheticOrchestrator";

const fixtureTimestamp = "2026-01-01T00:10:00.000Z";

function catalogSnapshot(
  referenceType: "diagnostic_test" | "pedagogical_context" | "competence" | "pedagogical_technique" | "exercise",
  suffix: string = referenceType,
): PedagogicalReferenceSnapshot {
  return {
    referenceType,
    origin: "catalog_item",
    id: `test.fixture.${suffix}`,
    code: `TEST_FIXTURE_${suffix.toUpperCase()}`,
    displayName: `TEST/FIXTURE ${suffix}`,
    itemVersion: "1.0.0-test",
    catalogVersion: "test-fixture-catalog-v1",
    schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  };
}

function entitySnapshot(
  referenceType: "source" | "observation" | "hypothesis" | "diagnostic_test_result" | "evaluation" |
    "shooter_self_report" | "pedagogical_decision",
  suffix: string = referenceType,
): PedagogicalReferenceSnapshot {
  return {
    referenceType,
    origin: "versioned_entity",
    id: `test.fixture.${suffix}`,
    code: null,
    displayName: `TEST/FIXTURE ${suffix}`,
    itemVersion: null,
    catalogVersion: null,
    schemaVersion: referenceType === "pedagogical_decision"
      ? PEDAGOGICAL_DECISION_SCHEMA_VERSION : PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  };
}

const variablesA: PedagogicalVariables = {
  distance: null,
  numberOfHands: 2,
  time: null,
  cadence: "TEST/FIXTURE CADENCE ALPHA",
  zoneSize: null,
  targetType: "TEST/FIXTURE TARGET ALPHA",
  sightSystem: null,
  shotCount: 3,
  movement: null,
  attentionalLoad: null,
  complexity: null,
  supervision: "TEST/FIXTURE SUPERVISION ALPHA",
};

function variablesSnapshot(values: PedagogicalVariables): EffectivePedagogicalVariablesSnapshot {
  return {
    snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
    variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    values,
  };
}

const effectiveVariablesA = variablesSnapshot(variablesA);

const evidence: PedagogicalEvidence = {
  id: "test.fixture.evidence.alpha",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  subjectType: "TEST/FIXTURE SUBJECT",
  subjectId: "test.fixture.subject.alpha",
  sourceType: "shooter_self_report",
  sourceReferenceId: "test.fixture.self-report.alpha",
  value: { reportedInformation: "TEST/FIXTURE INFORMATION" },
  effect: "neutral",
  strength: 0.4,
  reliability: 0.5,
};

const provenance = {
  sourceType: "TEST/FIXTURE SOURCE",
  sourceId: "test.fixture.source.alpha",
  actorType: "TEST/FIXTURE ACTOR",
  actorId: "test.fixture.actor.alpha",
} as const;

const context: PedagogicalContext = {
  id: "test.fixture.context.alpha",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  code: "TEST_CONTEXT_ALPHA",
  name: "TEST/FIXTURE Context Alpha",
  description: "TEST/FIXTURE context without business meaning.",
  attributes: { testFixtureDimension: "TEST/FIXTURE VALUE" },
};

const contextSnapshot = catalogSnapshot("pedagogical_context", "context.alpha");
const competenceSnapshot = catalogSnapshot("competence", "competence.alpha");
const testSnapshot = catalogSnapshot("diagnostic_test", "diagnostic.alpha");
const testResultSnapshot = entitySnapshot("diagnostic_test_result", "diagnostic-result.alpha");
const evaluationSnapshot = entitySnapshot("evaluation", "evaluation.alpha");
const selfReportSnapshot = entitySnapshot("shooter_self_report", "self-report.alpha");

const selfReport: ShooterSelfReport = {
  id: "test.fixture.self-report.alpha",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "1.0.0-test",
  reportedAt: fixtureTimestamp,
  subjectSnapshot: entitySnapshot("source", "source.alpha"),
  content: "TEST/FIXTURE reported perception.",
  confidence: 0.6,
  contextSnapshot,
  provenance,
};

function diagnosticResult(status: DiagnosticTestResult["status"]): DiagnosticTestResult {
  return {
    id: "test.fixture.diagnostic-result.alpha",
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: "1.0.0-test",
    performedAt: fixtureTimestamp,
    diagnosticTestSnapshot: testSnapshot,
    status,
    structuredResult: { outcome: `TEST/FIXTURE ${status}` },
    observationSnapshots: [entitySnapshot("observation", "observation.alpha")],
    evidenceSnapshots: [evidence],
    knownLimitations: ["TEST/FIXTURE interpretation limit"],
    inconclusiveReason: status === "inconclusive" ? "TEST/FIXTURE insufficient information" : null,
    provenance,
  };
}

const evaluation: CompetenceEvaluation = {
  id: "test.fixture.evaluation.alpha",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "1.0.0-test",
  evaluatedAt: fixtureTimestamp,
  competenceSnapshot,
  contextSnapshot,
  effectiveVariablesSnapshot: effectiveVariablesA,
  observationSnapshots: [entitySnapshot("observation", "observation.alpha")],
  evidenceSnapshots: [evidence],
  structuredResult: { assessment: "TEST/FIXTURE EXPLICIT ASSESSMENT" },
  validationMode: "instructor",
  humanValidation: {
    validatorId: "test.fixture.validator.alpha",
    validatorRole: "TEST/FIXTURE VALIDATOR",
    validatedAt: fixtureTimestamp,
    rationale: "TEST/FIXTURE explicit human validation.",
  },
  knownLimitations: ["TEST/FIXTURE evaluation limit"],
  rationale: "TEST/FIXTURE explicit evaluation rationale.",
  provenance,
};

function decision(
  decisionType: PedagogicalDecisionType,
  overrides: Partial<PedagogicalDecision> = {},
): PedagogicalDecision {
  const value: PedagogicalDecision = {
    id: `test.fixture.decision.${decisionType.toLowerCase()}`,
    schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
    createdAt: fixtureTimestamp,
    sourceSnapshots: [entitySnapshot("source", "source.alpha")],
    observationSnapshots: [],
    hypothesisSnapshots: [],
    evidenceSnapshots: [],
    uncertainty: null,
    knownLimitations: [],
    diagnosticTestSnapshot: null,
    diagnosticTestResultSnapshot: null,
    targetCompetenceSnapshot: null,
    pedagogicalTechniqueSnapshot: null,
    exerciseSnapshot: null,
    effectiveVariablesSnapshot: null,
    evaluationSnapshot: null,
    decisionType,
    rationale: `TEST/FIXTURE explicit ${decisionType} decision.`,
    ruleVersions: { syntheticComposition: "test-fixture-rules-v1" },
    ...overrides,
  };
  return pedagogicalDecisionSchema.parse(value);
}

function masteryState(level: MasteryLevel): CurrentMasteryState {
  return {
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    shooterId: "test.fixture.shooter.alpha",
    competenceSnapshot,
    currentLevel: level,
    lastAppliedEventId: "test.fixture.previous-event.alpha",
    lastAppliedAt: "2026-01-01T00:05:00.000Z",
    lastChangedAt: "2026-01-01T00:05:00.000Z",
    lastContextSnapshot: contextSnapshot,
    lastEffectiveVariablesSnapshot: effectiveVariablesA,
    appliedEventCount: 1,
    anomalies: [],
  };
}

function proposedEvent(from: MasteryLevel, to: MasteryLevel, decisionId: string): MasteryEvent {
  return {
    id: `test.fixture.mastery-event.${from}.${to}`,
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    recordVersion: "1.0.0-test",
    shooterId: "test.fixture.shooter.alpha",
    competenceSnapshot,
    expectedPreviousLevel: from,
    resultingLevel: to,
    eventType: "TEST/FIXTURE EXPLICIT EVENT",
    sourceType: "TEST/FIXTURE ORCHESTRATION",
    pedagogicalDecisionSnapshot: {
      ...entitySnapshot("pedagogical_decision", "decision.alpha"),
      id: decisionId,
    },
    competenceEvaluationSnapshot: evaluationSnapshot,
    evidenceSnapshots: [evidence],
    contextSnapshot,
    effectiveVariablesSnapshot: effectiveVariablesA,
    humanValidation: evaluation.humanValidation,
    rationale: "TEST/FIXTURE explicit mastery-event proposal.",
    occurredAt: "2026-01-01T00:11:00.000Z",
    transitionRuleVersion: "test-fixture-transition-rules-v1",
  };
}

function orchestrate(overrides: Partial<Parameters<typeof orchestrateSyntheticPedagogicalFlow>[0]> = {}) {
  return orchestrateSyntheticPedagogicalFlow({
    diagnosticTestResult: null,
    competenceEvaluation: null,
    decision: decision("INSUFFICIENT_INFORMATION"),
    currentMasteryState: masteryState("acquisition"),
    proposedMasteryEvent: null,
    previousVariablesSnapshot: null,
    nextVariablesSnapshot: null,
    ...overrides,
  } as Parameters<typeof orchestrateSyntheticPedagogicalFlow>[0]);
}

describe("orchestrateur pédagogique v2 strictement synthétique", () => {
  it("scénario A — conserve une information inconclusive sans compétence, exercice ni événement", () => {
    const testResult = diagnosticResult("inconclusive");
    expect(diagnosticTestResultSchema.safeParse(testResult).success).toBe(true);
    const result = orchestrate({
      diagnosticTestResult: testResult,
      decision: decision("INSUFFICIENT_INFORMATION", {
        diagnosticTestSnapshot: testSnapshot,
        diagnosticTestResultSnapshot: testResultSnapshot,
        uncertainty: 1,
        knownLimitations: ["TEST/FIXTURE insufficient information"],
      }),
    });
    expect(result.diagnosticTestResult?.status).toBe("inconclusive");
    expect(result.decision.targetCompetenceSnapshot).toBeNull();
    expect(result.decision.exerciseSnapshot).toBeNull();
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter).toEqual(result.currentMasteryStateBefore);
  });

  it("scénario B — MAINTAIN n'impose aucun événement mais accepte un maintien explicitement fourni", () => {
    const maintainDecision = decision("MAINTAIN", {
      targetCompetenceSnapshot: competenceSnapshot,
      evaluationSnapshot,
    });
    const withoutEvent = orchestrate({ competenceEvaluation: evaluation, decision: maintainDecision });
    const withEvent = orchestrate({ competenceEvaluation: evaluation, decision: maintainDecision,
      proposedMasteryEvent: proposedEvent("acquisition", "acquisition", maintainDecision.id) });
    expect(withoutEvent.masteryEvent).toBeNull();
    expect(withoutEvent.currentMasteryStateAfter.currentLevel).toBe("acquisition");
    expect(withEvent.transition).toMatchObject({ accepted: true, kind: "maintain" });
    expect(withEvent.currentMasteryStateAfter.currentLevel).toBe("acquisition");
  });

  it("scénario C — applique acquisition vers stabilization lorsque l'événement est explicite", () => {
    const testResult = diagnosticResult("usable");
    const progressDecision = decision("PROGRESS", {
      targetCompetenceSnapshot: competenceSnapshot,
      diagnosticTestSnapshot: testSnapshot,
      diagnosticTestResultSnapshot: testResultSnapshot,
      evaluationSnapshot,
    });
    const result = orchestrate({ diagnosticTestResult: testResult, competenceEvaluation: evaluation,
      decision: progressDecision,
      proposedMasteryEvent: proposedEvent("acquisition", "stabilization", progressDecision.id) });
    expect(result.diagnosticTestResult?.id).toBe(testResult.id);
    expect(result.competenceEvaluation?.id).toBe(evaluation.id);
    expect(result.decision.diagnosticTestResultSnapshot?.id).toBe(testResultSnapshot.id);
    expect(result.decision.evaluationSnapshot?.id).toBe(evaluationSnapshot.id);
    expect(result.transition).toMatchObject({ accepted: true, kind: "progression" });
    expect(result.masteryEvent?.resultingLevel).toBe("stabilization");
    expect(result.currentMasteryStateAfter.currentLevel).toBe("stabilization");
  });

  it("scénario D — refuse acquisition vers transfer sans effacer la décision", () => {
    const progressDecision = decision("PROGRESS", { targetCompetenceSnapshot: competenceSnapshot });
    const result = orchestrate({ decision: progressDecision,
      proposedMasteryEvent: proposedEvent("acquisition", "transfer", progressDecision.id) });
    expect(result.transition).toMatchObject({ accepted: false, reasonCode: "ACQUISITION_TO_TRANSFER_FORBIDDEN" });
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
    expect(result.anomalies[0]).toMatchObject({ code: "INVALID_TRANSITION" });
    expect(result.decision.decisionType).toBe("PROGRESS");
  });

  it("scénario E — détecte exactement une variable compatible avec L1+", () => {
    const variablesB = variablesSnapshot({ ...variablesA, cadence: "TEST/FIXTURE CADENCE BETA" });
    const result = orchestrate({ decision: decision("PROGRESS"), previousVariablesSnapshot: effectiveVariablesA,
      nextVariablesSnapshot: variablesB });
    expect(result.l1PlusValidation).toMatchObject({ status: "compatible_single_change",
      compatibleWithNormalL1Plus: true, configurationValidity: "not_assessed" });
    expect(result.l1PlusValidation?.analysis.changes.map((change) => change.key)).toEqual(["cadence"]);
    expect(result.l1PlusValidation).not.toHaveProperty("difficulty");
  });

  it("scénario F — signale deux variables incompatibles avec L1+ normale sans invalidité universelle", () => {
    const variablesB = variablesSnapshot({ ...variablesA, cadence: "TEST/FIXTURE CADENCE BETA", shotCount: 4 });
    const result = orchestrate({ decision: decision("PROGRESS"), previousVariablesSnapshot: effectiveVariablesA,
      nextVariablesSnapshot: variablesB });
    expect(result.l1PlusValidation?.analysis.changedVariableCount).toBe(2);
    expect(result.l1PlusValidation?.compatibleWithNormalL1Plus).toBe(false);
    expect(result.l1PlusValidation?.configurationValidity).toBe("not_assessed");
    expect(result.masteryEvent).toBeNull();
  });

  it("scénario G — un test non discriminant ne sélectionne ni exercice ni maîtrise", () => {
    const testResult = diagnosticResult("non_discriminating");
    const result = orchestrate({ diagnosticTestResult: testResult,
      decision: decision("TEST_ANOTHER_HYPOTHESIS", {
        diagnosticTestSnapshot: testSnapshot,
        diagnosticTestResultSnapshot: testResultSnapshot,
      }) });
    expect(result.diagnosticTestResult?.status).toBe("non_discriminating");
    expect(result.decision.exerciseSnapshot).toBeNull();
    expect(result.masteryEvent).toBeNull();
    expect(result.currentMasteryStateAfter.currentLevel).toBe("acquisition");
  });

  it("scénario H — représente SIMPLIFY avec le même exercice sans changer la maîtrise", () => {
    const exerciseSnapshot = catalogSnapshot("exercise", "exercise.alpha");
    const currentVariables = variablesSnapshot({ ...variablesA, cadence: "TEST/FIXTURE CADENCE BETA" });
    const simplifyDecision = decision("SIMPLIFY", { targetCompetenceSnapshot: competenceSnapshot,
      exerciseSnapshot, effectiveVariablesSnapshot: effectiveVariablesA });
    const result = orchestrate({ currentMasteryState: masteryState("stabilization"), decision: simplifyDecision,
      previousVariablesSnapshot: currentVariables, nextVariablesSnapshot: effectiveVariablesA });
    expect(result.decision.exerciseSnapshot?.id).toBe(exerciseSnapshot.id);
    expect(result.decision.effectiveVariablesSnapshot).not.toBe(result.decision.exerciseSnapshot);
    expect(result.l1PlusValidation?.analysis.changedVariableCount).toBe(1);
    expect(result.currentMasteryStateAfter.currentLevel).toBe("stabilization");
    expect(result.masteryEvent).toBeNull();
  });

  it("scénario I — snapshotte une cible prerequisite sans traverser de graphe", () => {
    const prerequisite = catalogSnapshot("competence", "competence.prerequisite");
    const result = orchestrate({ decision: decision("RETURN_TO_PREREQUISITE", {
      targetCompetenceSnapshot: prerequisite,
    }) });
    expect(result.decision.targetCompetenceSnapshot).toEqual(prerequisite);
    expect(result.currentMasteryStateAfter.competenceSnapshot.id).toBe(competenceSnapshot.id);
    expect(result.masteryEvent).toBeNull();
  });

  it("scénario J — conserve STOP sans compétence, exercice ou événement obligatoire", () => {
    const result = orchestrate({ decision: decision("STOP", {
      knownLimitations: ["TEST/FIXTURE stop rationale context"],
    }) });
    expect(result.decision).toMatchObject({ decisionType: "STOP",
      schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION });
    expect(result.decision.targetCompetenceSnapshot).toBeNull();
    expect(result.decision.exerciseSnapshot).toBeNull();
    expect(result.masteryEvent).toBeNull();
  });
});

describe("composition, snapshots et isolation", () => {
  it("conserve context, self-report et evidence comme informations distinctes", () => {
    expect(pedagogicalContextSchema.safeParse(context).success).toBe(true);
    expect(shooterSelfReportSchema.safeParse(selfReport).success).toBe(true);
    expect(competenceEvaluationSchema.safeParse(evaluation).success).toBe(true);
    const composedDecision = decision("MAINTAIN", {
      targetCompetenceSnapshot: competenceSnapshot,
      pedagogicalContextSnapshots: [contextSnapshot],
      shooterSelfReportSnapshots: [selfReportSnapshot],
      evidenceSnapshots: [evidence],
      evaluationSnapshot,
    });
    const result = orchestrate({ competenceEvaluation: evaluation, decision: composedDecision });
    expect(result.decision.shooterSelfReportSnapshots?.[0].id).toBe(selfReport.id);
    expect(result.decision.evidenceSnapshots[0].sourceReferenceId).toBe(selfReport.id);
    expect(result.competenceEvaluation?.humanValidation).not.toBeNull();
    expect(selfReport).not.toHaveProperty("validationMode");
    expect(result.decision.pedagogicalContextSnapshots?.[0]).not.toHaveProperty("values");
    expect(result.decision.targetCompetenceSnapshot?.id).toBe(competenceSnapshot.id);
  });

  it("fige les snapshots contre toute mutation ultérieure des fixtures sources", () => {
    const mutableEvidenceValue = { reportedInformation: "TEST/FIXTURE ORIGINAL" };
    const sourceDecision = decision("MAINTAIN", { targetCompetenceSnapshot: { ...competenceSnapshot },
      evidenceSnapshots: [{ ...evidence, value: mutableEvidenceValue }] });
    const built = buildSyntheticPedagogicalDecision(sourceDecision);
    (sourceDecision.targetCompetenceSnapshot as { displayName: string }).displayName = "TEST/FIXTURE MUTATED";
    mutableEvidenceValue.reportedInformation = "TEST/FIXTURE MUTATED";
    expect(built.targetCompetenceSnapshot?.displayName).toBe("TEST/FIXTURE competence.alpha");
    expect(built.evidenceSnapshots[0].value).toEqual({ reportedInformation: "TEST/FIXTURE ORIGINAL" });
    expect(Object.isFrozen(built.targetCompetenceSnapshot)).toBe(true);
  });

  it("ne mute aucune entrée pendant l'orchestration", () => {
    const inputDecision = decision("MAINTAIN", { targetCompetenceSnapshot: competenceSnapshot });
    const inputState = masteryState("acquisition");
    const beforeDecision = JSON.stringify(inputDecision);
    const beforeState = JSON.stringify(inputState);
    orchestrate({ decision: inputDecision, currentMasteryState: inputState });
    expect(JSON.stringify(inputDecision)).toBe(beforeDecision);
    expect(JSON.stringify(inputState)).toBe(beforeState);
  });

  it("expose séparément les trois fonctions pures de composition", () => {
    const progressDecision = decision("PROGRESS", { targetCompetenceSnapshot: competenceSnapshot });
    expect(buildSyntheticPedagogicalDecision(progressDecision)).toEqual(progressDecision);
    expect(evaluateSyntheticProgression(effectiveVariablesA,
      variablesSnapshot({ ...variablesA, shotCount: 4 })).analysis.changedVariableCount).toBe(1);
    expect(deriveSyntheticMasteryOutcome(masteryState("acquisition"), null).transition).toBeNull();
  });

  it("ne contient aucune sélection métier, seuil de score ou dépendance interdite", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, "syntheticOrchestrator.ts"), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    expect(imports.every((value) => value.startsWith("."))).toBe(true);
    expect(source).not.toMatch(/React|Expo|SQLite|repository|CoachingCycle|Recommendation|TrainingDrill/);
    expect(source).not.toMatch(/catalogLoader|catalogs\//);
    expect(source).not.toMatch(/score\s*[><=]|difficulty|automaticHypothesis|automaticExercise/);
  });

  it("n'encode aucun contenu métier réel dans le fichier de production", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, "syntheticOrchestrator.ts"), "utf8");
    expect(source).not.toMatch(/\bD[1-6]\b|\bC9\b|TEST_COMPETENCE|TEST_EXERCISE|TEST_CONTEXT/);
  });
});
