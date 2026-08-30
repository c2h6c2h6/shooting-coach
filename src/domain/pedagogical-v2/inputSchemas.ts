import {
  type ContractSchema,
  type ContractValidationIssue,
  type ContractValidationResult,
  PedagogicalContractValidationError,
  pedagogicalEvidenceSchema,
  validationModeSchema,
} from "./schemas";
import {
  diagnosticTestResultStatuses,
  type CompetenceEvaluation,
  type DiagnosticTestDefinition,
  type DiagnosticTestResult,
  type HumanEvaluationValidation,
  type PedagogicalContext,
  type PedagogicalRecordProvenance,
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type ShooterSelfReport,
} from "./inputContracts";
import {
  effectivePedagogicalVariablesSnapshotSchema,
  pedagogicalReferenceSnapshotSchema,
} from "./decisionSchemas";
import type { PedagogicalReferenceType } from "./decisionContracts";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const issue = (issues: ContractValidationIssue[], path: string, message: string) =>
  issues.push({ path, message });

function createSchema<T>(validate: (value: unknown) => ContractValidationResult<T>): ContractSchema<T> {
  return {
    safeParse: validate,
    parse(value) {
      const result = validate(value);
      if (!result.success) throw new PedagogicalContractValidationError(result.issues);
      return result.data;
    },
  };
}

function rejectUnknownKeys(value: RecordValue, allowed: readonly string[], issues: ContractValidationIssue[]) {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) if (!known.has(key)) issue(issues, key, "champ inconnu");
}

function nullableText(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (value !== null && !text(value)) issue(issues, path, "doit être null ou une chaîne non vide");
}

function stringArray(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!Array.isArray(value) || value.some((item) => !text(item))) {
    issue(issues, path, "doit être un tableau de chaînes non vides");
    return;
  }
  if (new Set(value).size !== value.length) issue(issues, path, "ne doit pas contenir de doublon");
}

function timestamp(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!text(value) || Number.isNaN(Date.parse(String(value))))
    issue(issues, path, "doit être un horodatage ISO interprétable");
}

function versionedCatalogItem(value: RecordValue, issues: ContractValidationIssue[]) {
  for (const key of ["id", "itemVersion", "catalogVersion"] as const)
    if (!text(value[key])) issue(issues, key, "doit être une chaîne stable non vide");
  if (value.schemaVersion !== PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION)
    issue(issues, "schemaVersion", `doit valoir ${PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION}`);
}

function runtimeRecord(value: RecordValue, dateKey: string, issues: ContractValidationIssue[]) {
  if (!text(value.id)) issue(issues, "id", "doit être une chaîne stable non vide");
  if (value.schemaVersion !== PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION)
    issue(issues, "schemaVersion", `doit valoir ${PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION}`);
  if (!text(value.recordVersion)) issue(issues, "recordVersion", "doit être une version non vide");
  timestamp(value[dateKey], dateKey, issues);
}

function validateSnapshot(
  value: unknown,
  path: string,
  issues: ContractValidationIssue[],
  expectedType?: PedagogicalReferenceType,
) {
  const parsed = pedagogicalReferenceSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    for (const snapshotIssue of parsed.issues) issue(issues, `${path}.${snapshotIssue.path}`, snapshotIssue.message);
    return;
  }
  if (expectedType && parsed.data.referenceType !== expectedType)
    issue(issues, `${path}.referenceType`, `doit valoir ${expectedType}`);
}

function validateOptionalSnapshot(
  value: unknown,
  path: string,
  issues: ContractValidationIssue[],
  expectedType: PedagogicalReferenceType,
) {
  if (value !== null) validateSnapshot(value, path, issues, expectedType);
}

function validateSnapshotArray(
  value: unknown,
  path: string,
  issues: ContractValidationIssue[],
  expectedType: PedagogicalReferenceType,
) {
  if (!Array.isArray(value)) {
    issue(issues, path, "doit être un tableau");
    return;
  }
  value.forEach((snapshot, index) => validateSnapshot(snapshot, `${path}[${index}]`, issues, expectedType));
}

function validateEvidenceArray(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!Array.isArray(value)) {
    issue(issues, path, "doit être un tableau");
    return;
  }
  value.forEach((evidence, index) => {
    const parsed = pedagogicalEvidenceSchema.safeParse(evidence);
    if (!parsed.success) for (const evidenceIssue of parsed.issues)
      issue(issues, `${path}[${index}].${evidenceIssue.path}`, evidenceIssue.message);
  });
}

function validateStructuredResult(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!record(value)) issue(issues, path, "doit être un objet structuré");
}

function validateProvenance(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!record(value)) {
    issue(issues, path, "doit être un objet");
    return;
  }
  rejectUnknownKeys(value, ["sourceType", "sourceId", "actorType", "actorId"], issues);
  if (!text(value.sourceType)) issue(issues, `${path}.sourceType`, "doit être une chaîne non vide");
  for (const key of ["sourceId", "actorType", "actorId"] as const)
    nullableText(value[key], `${path}.${key}`, issues);
}

export const pedagogicalContextSchema = createSchema<PedagogicalContext>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "itemVersion", "catalogVersion", "code", "name", "description",
    "attributes"], issues);
  versionedCatalogItem(value, issues);
  for (const key of ["code", "name", "description"] as const)
    if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  if (!record(value.attributes)) issue(issues, "attributes", "doit être un objet générique");
  return issues.length ? { success: false, issues } : { success: true, data: value as unknown as PedagogicalContext };
});

export const diagnosticTestDefinitionSchema = createSchema<DiagnosticTestDefinition>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "itemVersion", "catalogVersion", "code", "name", "objective",
    "discriminatedHypothesisIds", "discriminatedUncertaintyCodes", "observedCompetenceId",
    "prerequisiteReferenceIds", "conditionsOfUse", "interpretationLimits", "stopCriteria", "validationMode",
    "supervisionRequirements"], issues);
  versionedCatalogItem(value, issues);
  for (const key of ["code", "name", "objective"] as const)
    if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  for (const key of ["discriminatedHypothesisIds", "discriminatedUncertaintyCodes", "prerequisiteReferenceIds",
    "conditionsOfUse", "interpretationLimits", "stopCriteria", "supervisionRequirements"] as const)
    stringArray(value[key], key, issues);
  if (Array.isArray(value.discriminatedHypothesisIds) && Array.isArray(value.discriminatedUncertaintyCodes) &&
    value.discriminatedHypothesisIds.length === 0 && value.discriminatedUncertaintyCodes.length === 0)
    issue(issues, "discriminatedHypothesisIds", "le test doit discriminer au moins une hypothèse ou une incertitude");
  nullableText(value.observedCompetenceId, "observedCompetenceId", issues);
  if (!validationModeSchema.safeParse(value.validationMode).success)
    issue(issues, "validationMode", "mode de validation inconnu");
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as DiagnosticTestDefinition };
});

export const diagnosticTestResultSchema = createSchema<DiagnosticTestResult>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "recordVersion", "performedAt", "diagnosticTestSnapshot", "status",
    "structuredResult", "observationSnapshots", "evidenceSnapshots", "knownLimitations", "inconclusiveReason",
    "provenance"], issues);
  runtimeRecord(value, "performedAt", issues);
  validateSnapshot(value.diagnosticTestSnapshot, "diagnosticTestSnapshot", issues, "diagnostic_test");
  if (!(diagnosticTestResultStatuses as readonly unknown[]).includes(value.status))
    issue(issues, "status", "statut de résultat inconnu");
  validateStructuredResult(value.structuredResult, "structuredResult", issues);
  validateSnapshotArray(value.observationSnapshots, "observationSnapshots", issues, "observation");
  validateEvidenceArray(value.evidenceSnapshots, "evidenceSnapshots", issues);
  stringArray(value.knownLimitations, "knownLimitations", issues);
  nullableText(value.inconclusiveReason, "inconclusiveReason", issues);
  if (value.status === "inconclusive" && !text(value.inconclusiveReason))
    issue(issues, "inconclusiveReason", "est obligatoire pour un résultat inconclusif");
  if (value.status !== "inconclusive" && value.inconclusiveReason !== null)
    issue(issues, "inconclusiveReason", "doit être null hors résultat inconclusif");
  validateProvenance(value.provenance, "provenance", issues);
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as DiagnosticTestResult };
});

export const humanEvaluationValidationSchema = createSchema<HumanEvaluationValidation>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["validatorId", "validatorRole", "validatedAt", "rationale"], issues);
  for (const key of ["validatorId", "validatorRole"] as const)
    if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  timestamp(value.validatedAt, "validatedAt", issues);
  nullableText(value.rationale, "rationale", issues);
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as HumanEvaluationValidation };
});

export const competenceEvaluationSchema = createSchema<CompetenceEvaluation>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "recordVersion", "evaluatedAt", "competenceSnapshot",
    "contextSnapshot", "effectiveVariablesSnapshot", "observationSnapshots", "evidenceSnapshots", "structuredResult",
    "validationMode", "humanValidation", "knownLimitations", "rationale", "provenance"], issues);
  runtimeRecord(value, "evaluatedAt", issues);
  validateSnapshot(value.competenceSnapshot, "competenceSnapshot", issues, "competence");
  validateOptionalSnapshot(value.contextSnapshot, "contextSnapshot", issues, "pedagogical_context");
  if (value.effectiveVariablesSnapshot !== null) {
    const parsed = effectivePedagogicalVariablesSnapshotSchema.safeParse(value.effectiveVariablesSnapshot);
    if (!parsed.success) for (const variableIssue of parsed.issues)
      issue(issues, `effectiveVariablesSnapshot.${variableIssue.path}`, variableIssue.message);
  }
  validateSnapshotArray(value.observationSnapshots, "observationSnapshots", issues, "observation");
  validateEvidenceArray(value.evidenceSnapshots, "evidenceSnapshots", issues);
  validateStructuredResult(value.structuredResult, "structuredResult", issues);
  if (!validationModeSchema.safeParse(value.validationMode).success)
    issue(issues, "validationMode", "mode de validation inconnu");
  if (value.humanValidation !== null) {
    const parsed = humanEvaluationValidationSchema.safeParse(value.humanValidation);
    if (!parsed.success) for (const validationIssue of parsed.issues)
      issue(issues, `humanValidation.${validationIssue.path}`, validationIssue.message);
  }
  stringArray(value.knownLimitations, "knownLimitations", issues);
  if (!text(value.rationale)) issue(issues, "rationale", "doit être une chaîne non vide");
  validateProvenance(value.provenance, "provenance", issues);
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as CompetenceEvaluation };
});

export const shooterSelfReportSchema = createSchema<ShooterSelfReport>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "recordVersion", "reportedAt", "subjectSnapshot", "content",
    "confidence", "contextSnapshot", "provenance"], issues);
  runtimeRecord(value, "reportedAt", issues);
  validateSnapshot(value.subjectSnapshot, "subjectSnapshot", issues);
  if (!text(value.content)) issue(issues, "content", "doit être une chaîne non vide");
  if (value.confidence !== null &&
    (typeof value.confidence !== "number" || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1))
    issue(issues, "confidence", "doit être null ou un nombre compris entre 0 et 1");
  validateOptionalSnapshot(value.contextSnapshot, "contextSnapshot", issues, "pedagogical_context");
  validateProvenance(value.provenance, "provenance", issues);
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as ShooterSelfReport };
});

export type { HumanEvaluationValidation, PedagogicalRecordProvenance };
