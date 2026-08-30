import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type PedagogicalEvidence,
  type PedagogicalVariables,
} from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
} from "./decisionContracts";
import { pedagogicalDecisionSchema } from "./decisionSchemas";
import {
  diagnosticTestResultStatuses,
  type CompetenceEvaluation,
  type DiagnosticTestDefinition,
  type DiagnosticTestResult,
  type PedagogicalContext,
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type ShooterSelfReport,
} from "./inputContracts";
import {
  competenceEvaluationSchema,
  diagnosticTestDefinitionSchema,
  diagnosticTestResultSchema,
  pedagogicalContextSchema,
  shooterSelfReportSchema,
} from "./inputSchemas";

const provenance = {
  sourceType: "TEST_FIXTURE_SOURCE",
  sourceId: "fixture.source",
  actorType: "TEST_FIXTURE_ACTOR",
  actorId: "fixture.actor",
} as const;

const catalogSnapshot = (
  referenceType: "diagnostic_test" | "pedagogical_context" | "competence",
): PedagogicalReferenceSnapshot => ({
  referenceType,
  origin: "catalog_item",
  id: `fixture.${referenceType}`,
  code: `TEST_FIXTURE_${referenceType.toUpperCase()}`,
  displayName: `TEST/FIXTURE ${referenceType}`,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
});

const entitySnapshot = (
  referenceType: "source" | "observation" | "shooter_self_report",
): PedagogicalReferenceSnapshot => ({
  referenceType,
  origin: "versioned_entity",
  id: `fixture.${referenceType}`,
  code: null,
  displayName: `TEST/FIXTURE ${referenceType}`,
  itemVersion: null,
  catalogVersion: null,
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
});

const evidence: PedagogicalEvidence = {
  id: "fixture.evidence",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  subjectType: "TEST_FIXTURE_SUBJECT",
  subjectId: "fixture.subject",
  sourceType: "TEST_FIXTURE_SOURCE",
  sourceReferenceId: "fixture.source",
  value: { fixtureInformation: true },
  effect: "neutral",
  strength: 0.4,
  reliability: 0.5,
};

const variables: PedagogicalVariables = {
  distance: null,
  numberOfHands: 2,
  time: null,
  cadence: "TEST_FIXTURE_CADENCE",
  zoneSize: null,
  targetType: null,
  sightSystem: null,
  shotCount: 3,
  movement: null,
  attentionalLoad: null,
  complexity: null,
  supervision: "TEST_FIXTURE_SUPERVISION",
};

const effectiveVariables = {
  snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  values: variables,
} as const;

const context: PedagogicalContext = {
  id: "fixture.context",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  code: "TEST_FIXTURE_CONTEXT",
  name: "Contexte synthétique TEST/FIXTURE",
  description: "Contexte sans valeur métier réelle.",
  attributes: { fixtureDimension: "fixture-value", fixtureFlag: true },
};

const testDefinition: DiagnosticTestDefinition = {
  id: "fixture.diagnostic-test",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  code: "TEST_FIXTURE_DIAGNOSTIC_TEST",
  name: "Test diagnostique synthétique TEST/FIXTURE",
  objective: "Réduire une incertitude synthétique.",
  discriminatedHypothesisIds: [],
  discriminatedUncertaintyCodes: ["TEST_FIXTURE_UNCERTAINTY"],
  observedCompetenceId: null,
  prerequisiteReferenceIds: [],
  conditionsOfUse: ["Condition synthétique"],
  interpretationLimits: ["Limite synthétique"],
  stopCriteria: ["Critère d'arrêt synthétique"],
  validationMode: "semi_automatic",
  supervisionRequirements: [],
};

const testResult: DiagnosticTestResult = {
  id: "fixture.diagnostic-test-result",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "1.0.0-test",
  performedAt: "2026-01-01T00:00:00.000Z",
  diagnosticTestSnapshot: catalogSnapshot("diagnostic_test"),
  status: "usable",
  structuredResult: { fixtureOutcome: "fixture-value" },
  observationSnapshots: [entitySnapshot("observation")],
  evidenceSnapshots: [evidence],
  knownLimitations: [],
  inconclusiveReason: null,
  provenance,
};

const evaluation: CompetenceEvaluation = {
  id: "fixture.evaluation",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "1.0.0-test",
  evaluatedAt: "2026-01-01T00:00:00.000Z",
  competenceSnapshot: catalogSnapshot("competence"),
  contextSnapshot: catalogSnapshot("pedagogical_context"),
  effectiveVariablesSnapshot: effectiveVariables,
  observationSnapshots: [entitySnapshot("observation")],
  evidenceSnapshots: [evidence],
  structuredResult: { fixtureAssessment: "fixture-value" },
  validationMode: "instructor",
  humanValidation: {
    validatorId: "fixture.validator",
    validatorRole: "TEST_FIXTURE_ROLE",
    validatedAt: "2026-01-01T00:01:00.000Z",
    rationale: "Validation humaine synthétique.",
  },
  knownLimitations: ["Limite d'évaluation synthétique"],
  rationale: "Rationale synthétique.",
  provenance,
};

const selfReport: ShooterSelfReport = {
  id: "fixture.self-report",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  recordVersion: "1.0.0-test",
  reportedAt: "2026-01-01T00:00:00.000Z",
  subjectSnapshot: entitySnapshot("source"),
  content: "Perception synthétique TEST/FIXTURE.",
  confidence: 0.6,
  contextSnapshot: catalogSnapshot("pedagogical_context"),
  provenance,
};

describe("contrats d'entrée pédagogiques v2", () => {
  it("représente un contexte autonome, versionné et historiquement identifiable", () => {
    expect(pedagogicalContextSchema.parse(context)).toBe(context);
    expect(context).not.toHaveProperty("safetyContext");
    expect(context).not.toHaveProperty("masteryLevel");
    expect(context).not.toHaveProperty("pedagogicalVariables");
  });

  it("laisse les attributs du contexte ouverts sans imposer de valeur métier", () => {
    const parsed = pedagogicalContextSchema.parse({
      ...context,
      attributes: { anyFutureDimension: { nestedFixtureValue: 1 } },
    });
    expect(parsed.attributes).toEqual({ anyFutureDimension: { nestedFixtureValue: 1 } });
  });

  it("refuse un contexte dont la version historique est absente", () => {
    const result = pedagogicalContextSchema.safeParse({ ...context, itemVersion: "" });
    expect(result.success).toBe(false);
  });

  it("valide une définition de test versionnée avec compétence observée facultative", () => {
    const parsed = diagnosticTestDefinitionSchema.parse(testDefinition);
    expect(parsed.observedCompetenceId).toBeNull();
    expect(parsed.itemVersion).toBe("1.0.0-test");
  });

  it("conserve les conditions, limites et critères d'arrêt du test", () => {
    const parsed = diagnosticTestDefinitionSchema.parse(testDefinition);
    expect(parsed.conditionsOfUse).toEqual(["Condition synthétique"]);
    expect(parsed.interpretationLimits).toEqual(["Limite synthétique"]);
    expect(parsed.stopCriteria).toEqual(["Critère d'arrêt synthétique"]);
  });

  it("exige qu'un test discrimine au moins une hypothèse ou une incertitude", () => {
    expect(diagnosticTestDefinitionSchema.safeParse({
      ...testDefinition, discriminatedHypothesisIds: [], discriminatedUncertaintyCodes: [],
    }).success).toBe(false);
  });

  it("fige uniquement les trois statuts structurels autorisés du résultat", () => {
    expect(diagnosticTestResultStatuses).toEqual(["usable", "non_discriminating", "inconclusive"]);
  });

  it("exige le snapshot du test exécuté", () => {
    expect(diagnosticTestResultSchema.safeParse({ ...testResult, diagnosticTestSnapshot: null }).success).toBe(false);
  });

  it("conserve sans transformation les observations et evidence produites", () => {
    const parsed = diagnosticTestResultSchema.parse(testResult);
    expect(parsed.observationSnapshots[0]).toBe(testResult.observationSnapshots[0]);
    expect(parsed.evidenceSnapshots[0]).toBe(evidence);
  });

  it("représente un résultat inconclusif avec sa raison", () => {
    const parsed = diagnosticTestResultSchema.parse({
      ...testResult, status: "inconclusive", inconclusiveReason: "Information synthétique insuffisante.",
    });
    expect(parsed.status).toBe("inconclusive");
  });

  it("refuse un résultat inconclusif sans raison", () => {
    expect(diagnosticTestResultSchema.safeParse({
      ...testResult, status: "inconclusive", inconclusiveReason: null,
    }).success).toBe(false);
  });

  it("n'autorise ni diagnostic automatique ni lien vers un exercice dans un résultat de test", () => {
    expect(diagnosticTestResultSchema.safeParse({ ...testResult, automaticDiagnosis: "fixture" }).success).toBe(false);
    expect(diagnosticTestResultSchema.safeParse({ ...testResult, exerciseId: "fixture.exercise" }).success).toBe(false);
  });

  it("évalue une compétence snapshotée sans produire d'état de maîtrise", () => {
    const parsed = competenceEvaluationSchema.parse(evaluation);
    expect(parsed.competenceSnapshot.referenceType).toBe("competence");
    expect(parsed).not.toHaveProperty("masteryLevel");
  });

  it("autorise contexte et variables effectives à être absents d'une évaluation", () => {
    expect(competenceEvaluationSchema.safeParse({
      ...evaluation, contextSnapshot: null, effectiveVariablesSnapshot: null,
    }).success).toBe(true);
  });

  it("conserve une validation humaine distincte du résultat d'évaluation", () => {
    const parsed = competenceEvaluationSchema.parse(evaluation);
    expect(parsed.validationMode).toBe("instructor");
    expect(parsed.humanValidation?.validatorId).toBe("fixture.validator");
    expect(parsed.structuredResult).toEqual({ fixtureAssessment: "fixture-value" });
  });

  it("refuse qu'une évaluation embarque directement un niveau de maîtrise", () => {
    expect(competenceEvaluationSchema.safeParse({ ...evaluation, masteryLevel: "acquisition" }).success).toBe(false);
  });

  it("conserve le contenu, la confiance et la provenance du self-report", () => {
    const parsed = shooterSelfReportSchema.parse(selfReport);
    expect(parsed.content).toBe("Perception synthétique TEST/FIXTURE.");
    expect(parsed.confidence).toBe(0.6);
    expect(parsed.provenance).toBe(provenance);
  });

  it("permet au self-report de devenir une source d'evidence sans en faire une validation", () => {
    const selfReportEvidence: PedagogicalEvidence = {
      ...evidence,
      id: "fixture.self-report-evidence",
      sourceType: "shooter_self_report",
      sourceReferenceId: selfReport.id,
    };
    expect(shooterSelfReportSchema.parse(selfReport)).not.toHaveProperty("validationMode");
    expect(selfReportEvidence.sourceReferenceId).toBe(selfReport.id);
  });

  it("permet à une décision de snapshotter contextes et self-reports comme sources facultatives", () => {
    const decision: PedagogicalDecision = {
      id: "fixture.decision-with-inputs",
      schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceSnapshots: [entitySnapshot("source")],
      observationSnapshots: [],
      hypothesisSnapshots: [],
      pedagogicalContextSnapshots: [catalogSnapshot("pedagogical_context")],
      shooterSelfReportSnapshots: [entitySnapshot("shooter_self_report")],
      evidenceSnapshots: [],
      uncertainty: 1,
      knownLimitations: ["Information synthétique insuffisante"],
      diagnosticTestSnapshot: null,
      diagnosticTestResultSnapshot: null,
      targetCompetenceSnapshot: null,
      pedagogicalTechniqueSnapshot: null,
      exerciseSnapshot: null,
      effectiveVariablesSnapshot: null,
      evaluationSnapshot: null,
      decisionType: "INSUFFICIENT_INFORMATION",
      rationale: "Décision synthétique sans sélection pédagogique.",
      ruleVersions: { fixtureRule: "fixture-rule-v1" },
    };
    expect(pedagogicalDecisionSchema.safeParse(decision).success).toBe(true);
  });

  it("ne contient aucun contenu pédagogique réel ni valeur de contexte imposée", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ["inputContracts.ts", "inputSchemas.ts"]
      .map((file) => readFileSync(resolve(directory, file), "utf8")).join("\n");
    expect(sources).not.toMatch(/\bD[1-6]\b|\bD4\b|\bC9\b|\b[A-J][1-9]\b/);
    expect(sources).not.toMatch(/PROTECTOR_|SPORT_|OPERATIONAL_|RANGE_/);
  });
});
