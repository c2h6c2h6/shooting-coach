import { observationLabelsFr } from "../domain/observationCatalog";
import type { ShootingObservation } from "../domain/shootingObservation";
import type { LoadedPedagogicalCatalog } from "../domain/pedagogical-v2/catalogContracts";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type Competence,
  type EvidenceEffect,
  type ExerciseDefinition,
  type PedagogicalEvidence,
  type PedagogicalTechnique,
} from "../domain/pedagogical-v2/contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type EffectivePedagogicalVariablesSnapshot,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
} from "../domain/pedagogical-v2/decisionContracts";
import { pedagogicalDecisionSchema } from "../domain/pedagogical-v2/decisionSchemas";
import {
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type DiagnosticTestDefinition,
  type DiagnosticTestResult,
  type DiagnosticTestResultStatus,
  type PedagogicalRecordProvenance,
} from "../domain/pedagogical-v2/inputContracts";
import { diagnosticTestResultSchema } from "../domain/pedagogical-v2/inputSchemas";
import { diagnosticTestDefinitionSchema } from "../domain/pedagogical-v2/inputSchemas";
import { competenceSchema, exerciseDefinitionSchema, pedagogicalTechniqueSchema } from "../domain/pedagogical-v2/schemas";
import { buildSyntheticPedagogicalDecision } from "../domain/pedagogical-v2/syntheticOrchestrator";
import { loadPedagogicalReferenceDV1 } from "../domain/pedagogical-v2/catalogs/pedagogical-reference-d-v1";

export const D4_PILOT_FLOW_VERSION = "pedagogical-v2-pilot-d4-v1";
export const D4_UNCERTAINTY_CODE = "UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT";

export const d4PilotReferenceIds = {
  competence: "competence-d4",
  diagnosticTest: "diagnostic-test-d4-01",
  technique: "technique-d4-01",
  exercise: "exercise-d4-01",
} as const;

export type D4PilotErrorCode =
  | "CATALOG_UNAVAILABLE"
  | "MISSING_REFERENCE"
  | "INCOHERENT_REFERENCE"
  | "INVALID_OBSERVATION"
  | "SUPERVISION_REQUIRED"
  | "INCOMPLETE_RESULT"
  | "INVALID_RESULT"
  | "EXPLICIT_CONFIRMATION_REQUIRED"
  | "INVALID_DECISION";

export interface D4PilotError {
  readonly code: D4PilotErrorCode;
  readonly path: string;
  readonly message: string;
}

export type D4PilotResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly D4PilotError[] };

export interface D4PilotReferences {
  readonly competence: Competence;
  readonly diagnosticTest: DiagnosticTestDefinition;
  readonly technique: PedagogicalTechnique;
  readonly exercise: ExerciseDefinition;
  readonly resolvedCompetenceIds: readonly string[];
}

export interface ExplicitEvidenceInput {
  readonly id: string;
  readonly effect: EvidenceEffect;
  readonly strength: number;
  readonly reliability: number;
  readonly rationale: string;
}

export interface BuildD4DiagnosticResultInput {
  readonly id: string;
  readonly recordVersion: string;
  readonly performedAt: string;
  readonly observation: ShootingObservation;
  readonly references: D4PilotReferences;
  readonly status: DiagnosticTestResultStatus;
  readonly supervisionConfirmed: boolean;
  readonly evidence: ExplicitEvidenceInput | null;
  readonly inconclusiveReason: string | null;
  readonly provenance: PedagogicalRecordProvenance;
}

export interface BuildD4MaintainInterventionInput {
  readonly id: string;
  readonly createdAt: string;
  readonly observation: ShootingObservation;
  readonly references: D4PilotReferences;
  readonly diagnosticTestResult: DiagnosticTestResult;
  readonly decisionType: "MAINTAIN";
  readonly rationale: string;
  readonly confirmedCompetenceId: string;
  readonly confirmedTechniqueId: string;
  readonly confirmedExerciseId: string;
}

export interface D4PilotIntervention {
  readonly diagnosticTestResult: DiagnosticTestResult;
  readonly decision: PedagogicalDecision;
  readonly technique: PedagogicalTechnique;
  readonly exercise: ExerciseDefinition;
  readonly masteryEvent: null;
}

function immutableCopy<T>(value: T): T {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return Object.freeze(value.map(immutableCopy)) as T;
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) copy[key] = immutableCopy(item);
  return Object.freeze(copy) as T;
}

function failure<T>(code: D4PilotErrorCode, path: string, message: string): D4PilotResult<T> {
  return { success: false, errors: [{ code, path, message }] };
}

function catalogSnapshot(
  referenceType: "competence" | "diagnostic_test" | "pedagogical_technique" | "exercise",
  item: Competence | DiagnosticTestDefinition | PedagogicalTechnique | ExerciseDefinition,
): PedagogicalReferenceSnapshot {
  return immutableCopy({
    referenceType,
    origin: "catalog_item",
    id: item.id,
    code: item.code,
    displayName: item.name,
    itemVersion: item.itemVersion,
    catalogVersion: item.catalogVersion,
    schemaVersion: item.schemaVersion,
  });
}

export function shootingObservationToV2Snapshot(
  observation: ShootingObservation,
): D4PilotResult<PedagogicalReferenceSnapshot> {
  if (!observation.id || !observation.observationCode || !observation.algorithmVersion ||
    !observation.rulesetVersion || !observation.thresholdsVersion) {
    return failure("INVALID_OBSERVATION", "observation", "L’observation réelle est incomplète et ne peut pas être snapshotée.");
  }
  return { success: true, data: immutableCopy({
    referenceType: "observation",
    origin: "versioned_entity",
    id: observation.id,
    code: observation.observationCode,
    displayName: observationLabelsFr[observation.observationCode],
    // The three historical version slots preserve the v1 algorithm, ruleset and thresholds respectively.
    schemaVersion: observation.algorithmVersion,
    itemVersion: observation.rulesetVersion,
    catalogVersion: observation.thresholdsVersion,
  }) };
}

export function loadD4PilotCatalog(): D4PilotResult<LoadedPedagogicalCatalog> {
  try {
    return { success: true, data: loadPedagogicalReferenceDV1() };
  } catch {
    return failure("CATALOG_UNAVAILABLE", "catalog", "Le catalogue pédagogique D ne peut pas être chargé.");
  }
}

export function resolveD4PilotReferences(catalog: LoadedPedagogicalCatalog): D4PilotResult<D4PilotReferences> {
  const competence = catalog.competences.find((item) => item.id === d4PilotReferenceIds.competence);
  const diagnosticTest = catalog.diagnosticTests.find((item) => item.id === d4PilotReferenceIds.diagnosticTest);
  const technique = catalog.techniques.find((item) => item.id === d4PilotReferenceIds.technique);
  const exercise = catalog.exercises.find((item) => item.id === d4PilotReferenceIds.exercise);
  const missing = [
    ["competence", competence], ["diagnosticTest", diagnosticTest], ["technique", technique], ["exercise", exercise],
  ].find(([, item]) => item === undefined);
  if (missing) return failure("MISSING_REFERENCE", String(missing[0]), `Référence pilote absente : ${String(missing[0])}.`);
  return validateD4PilotReferences({
    competence: competence!, diagnosticTest: diagnosticTest!, technique: technique!, exercise: exercise!,
    resolvedCompetenceIds: catalog.competences.map((item) => item.id),
  });
}

export function validateD4PilotReferences(references: D4PilotReferences): D4PilotResult<D4PilotReferences> {
  const { competence, diagnosticTest, technique, exercise, resolvedCompetenceIds } = references;
  const schemaChecks = [
    ["competence", competenceSchema.safeParse(competence)],
    ["diagnosticTest", diagnosticTestDefinitionSchema.safeParse(diagnosticTest)],
    ["technique", pedagogicalTechniqueSchema.safeParse(technique)],
    ["exercise", exerciseDefinitionSchema.safeParse(exercise)],
  ] as const;
  const invalidSchema = schemaChecks.find(([, parsed]) => !parsed.success);
  if (invalidSchema) return failure("INCOHERENT_REFERENCE", invalidSchema[0],
    `La référence ${invalidSchema[0]} ne respecte pas son schéma contractuel.`);
  const checks: readonly [boolean, string, string][] = [
    [competence.id === d4PilotReferenceIds.competence && competence.code === "D4", "competence", "La compétence fournie n’est pas D4."],
    [diagnosticTest.id === d4PilotReferenceIds.diagnosticTest && diagnosticTest.observedCompetenceId === competence.id,
      "diagnosticTest.observedCompetenceId", "TEST-D4-01 n’observe pas la compétence D4 fournie."],
    [diagnosticTest.discriminatedUncertaintyCodes.includes(D4_UNCERTAINTY_CODE),
      "diagnosticTest.discriminatedUncertaintyCodes", "TEST-D4-01 ne discrimine pas l’incertitude D4 attendue."],
    [technique.id === d4PilotReferenceIds.technique && technique.compatibleCompetenceIds.includes(competence.id),
      "technique.compatibleCompetenceIds", "TECH-D4-01 n’est pas compatible avec la compétence D4 fournie."],
    [exercise.id === d4PilotReferenceIds.exercise && exercise.primaryCompetenceId === competence.id,
      "exercise.primaryCompetenceId", "EX-D4-01 ne cible pas D4 comme compétence principale."],
    [exercise.pedagogicalTechniqueIds.includes(technique.id), "exercise.pedagogicalTechniqueIds",
      "EX-D4-01 ne référence pas TECH-D4-01."],
    [exercise.prerequisiteCompetenceIds.every((id) => resolvedCompetenceIds.includes(id)),
      "exercise.prerequisiteCompetenceIds", "Un prérequis de EX-D4-01 n’est pas résolu."],
    [[competence, diagnosticTest, technique, exercise].every((item) => item.catalogVersion === catalogVersion(references)),
      "catalogVersion", "Les références pilotes ne proviennent pas du même catalogue."],
  ];
  const invalid = checks.find(([valid]) => !valid);
  if (invalid) return failure("INCOHERENT_REFERENCE", invalid[1], invalid[2]);
  return { success: true, data: immutableCopy(references) };
}

function catalogVersion(references: D4PilotReferences): string {
  return references.competence.catalogVersion;
}

function diagnosticResultSnapshot(result: DiagnosticTestResult): PedagogicalReferenceSnapshot {
  return immutableCopy({
    referenceType: "diagnostic_test_result",
    origin: "versioned_entity",
    id: result.id,
    code: null,
    displayName: "Résultat TEST-D4-01",
    itemVersion: result.recordVersion,
    catalogVersion: null,
    schemaVersion: result.schemaVersion,
  });
}

export function buildD4DiagnosticTestResult(
  input: BuildD4DiagnosticResultInput,
): D4PilotResult<DiagnosticTestResult> {
  if (!input.supervisionConfirmed) {
    return failure("SUPERVISION_REQUIRED", "supervisionConfirmed", "Le test doit être réalisé sous supervision instructeur.");
  }
  const references = validateD4PilotReferences(input.references);
  if (!references.success) return references;
  const observation = shootingObservationToV2Snapshot(input.observation);
  if (!observation.success) return observation;
  if (input.status === "usable" && (!input.evidence || !input.evidence.rationale.trim())) {
    return failure("INCOMPLETE_RESULT", "evidence", "Un résultat usable exige une evidence et un rationale explicites.");
  }
  if (input.status === "inconclusive" && !input.inconclusiveReason?.trim()) {
    return failure("INCOMPLETE_RESULT", "inconclusiveReason", "Une raison est obligatoire pour un résultat inconclusif.");
  }

  const evidence: PedagogicalEvidence[] = input.status === "usable" && input.evidence ? [{
    id: input.evidence.id,
    schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    itemVersion: input.recordVersion,
    catalogVersion: D4_PILOT_FLOW_VERSION,
    subjectType: "uncertainty",
    subjectId: D4_UNCERTAINTY_CODE,
    sourceType: "diagnostic_test_result",
    sourceReferenceId: input.id,
    value: { rationale: input.evidence.rationale },
    effect: input.evidence.effect,
    strength: input.evidence.strength,
    reliability: input.evidence.reliability,
  }] : [];

  const parsed = diagnosticTestResultSchema.safeParse({
    id: input.id,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: input.recordVersion,
    performedAt: input.performedAt,
    diagnosticTestSnapshot: catalogSnapshot("diagnostic_test", references.data.diagnosticTest),
    status: input.status,
    structuredResult: input.status === "usable" ? { rationale: input.evidence!.rationale } : { status: input.status },
    observationSnapshots: [observation.data],
    evidenceSnapshots: evidence,
    knownLimitations: references.data.diagnosticTest.interpretationLimits,
    inconclusiveReason: input.status === "inconclusive" ? input.inconclusiveReason : null,
    provenance: input.provenance,
  });
  if (!parsed.success) return {
    success: false,
    errors: parsed.issues.map((issue) => ({ code: "INVALID_RESULT", path: issue.path, message: issue.message })),
  };
  return { success: true, data: immutableCopy(parsed.data) };
}

export function buildD4MaintainIntervention(
  input: BuildD4MaintainInterventionInput,
): D4PilotResult<D4PilotIntervention> {
  const references = validateD4PilotReferences(input.references);
  if (!references.success) return references;
  if (input.diagnosticTestResult.status !== "usable") {
    return failure("EXPLICIT_CONFIRMATION_REQUIRED", "diagnosticTestResult.status",
      "Une intervention ne peut être construite que depuis un résultat usable.");
  }
  if (input.confirmedCompetenceId !== references.data.competence.id ||
    input.confirmedTechniqueId !== references.data.technique.id ||
    input.confirmedExerciseId !== references.data.exercise.id || input.decisionType !== "MAINTAIN") {
    return failure("EXPLICIT_CONFIRMATION_REQUIRED", "confirmations",
      "D4, MAINTAIN, TECH-D4-01 et EX-D4-01 doivent être confirmés explicitement.");
  }
  if (!input.rationale.trim()) {
    return failure("EXPLICIT_CONFIRMATION_REQUIRED", "rationale", "Le rationale de la décision est obligatoire.");
  }
  const observation = shootingObservationToV2Snapshot(input.observation);
  if (!observation.success) return observation;
  if (input.diagnosticTestResult.diagnosticTestSnapshot.id !== references.data.diagnosticTest.id ||
    input.diagnosticTestResult.observationSnapshots[0]?.id !== observation.data.id) {
    return failure("INCOHERENT_REFERENCE", "diagnosticTestResult", "Le résultat ne correspond pas au test et à l’observation fournis.");
  }

  const effectiveVariables: EffectivePedagogicalVariablesSnapshot = immutableCopy({
    snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
    variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    values: references.data.exercise.defaultVariables,
  });
  const parsed = pedagogicalDecisionSchema.safeParse({
    id: input.id,
    schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
    createdAt: input.createdAt,
    sourceSnapshots: [],
    observationSnapshots: [observation.data],
    hypothesisSnapshots: [],
    evidenceSnapshots: input.diagnosticTestResult.evidenceSnapshots,
    uncertainty: null,
    knownLimitations: input.diagnosticTestResult.knownLimitations,
    diagnosticTestSnapshot: catalogSnapshot("diagnostic_test", references.data.diagnosticTest),
    diagnosticTestResultSnapshot: diagnosticResultSnapshot(input.diagnosticTestResult),
    targetCompetenceSnapshot: catalogSnapshot("competence", references.data.competence),
    pedagogicalTechniqueSnapshot: catalogSnapshot("pedagogical_technique", references.data.technique),
    exerciseSnapshot: catalogSnapshot("exercise", references.data.exercise),
    effectiveVariablesSnapshot: effectiveVariables,
    evaluationSnapshot: null,
    decisionType: input.decisionType,
    rationale: input.rationale,
    ruleVersions: { pilotFlow: D4_PILOT_FLOW_VERSION },
  });
  if (!parsed.success) return {
    success: false,
    errors: parsed.issues.map((issue) => ({ code: "INVALID_DECISION", path: issue.path, message: issue.message })),
  };
  const decision = buildSyntheticPedagogicalDecision(parsed.data);
  return { success: true, data: immutableCopy({
    diagnosticTestResult: input.diagnosticTestResult,
    decision,
    technique: references.data.technique,
    exercise: references.data.exercise,
    masteryEvent: null,
  }) };
}
