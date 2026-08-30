import { PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION } from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type EffectivePedagogicalVariablesSnapshot,
  type PedagogicalDecision,
  pedagogicalReferenceOrigins,
  type PedagogicalReferenceSnapshot,
  pedagogicalReferenceTypes,
  type PedagogicalReferenceType,
} from "./decisionContracts";
import {
  type ContractSchema,
  type ContractValidationIssue,
  type ContractValidationResult,
  PedagogicalContractValidationError,
  pedagogicalDecisionTypeSchema,
  pedagogicalEvidenceSchema,
  pedagogicalVariablesSchema,
} from "./schemas";

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

function validateSnapshotAt(
  value: unknown,
  path: string,
  issues: ContractValidationIssue[],
  expectedType?: PedagogicalReferenceType,
) {
  const result = pedagogicalReferenceSnapshotSchema.safeParse(value);
  if (!result.success) {
    for (const snapshotIssue of result.issues) {
      issue(issues, `${path}.${snapshotIssue.path}`, snapshotIssue.message);
    }
    return;
  }
  if (expectedType && result.data.referenceType !== expectedType) {
    issue(issues, `${path}.referenceType`, `doit valoir ${expectedType}`);
  }
}

function validateSnapshotArray(
  value: unknown,
  path: string,
  type: PedagogicalReferenceType,
  issues: ContractValidationIssue[],
) {
  if (!Array.isArray(value)) {
    issue(issues, path, "doit être un tableau");
    return;
  }
  value.forEach((snapshot, index) => validateSnapshotAt(snapshot, `${path}[${index}]`, issues, type));
}

function validateOptionalSnapshot(
  value: unknown,
  path: string,
  type: PedagogicalReferenceType,
  issues: ContractValidationIssue[],
) {
  if (value !== null) validateSnapshotAt(value, path, issues, type);
}

export const pedagogicalReferenceSnapshotSchema = createSchema<PedagogicalReferenceSnapshot>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["referenceType", "origin", "id", "code", "displayName", "itemVersion",
    "catalogVersion", "schemaVersion"], issues);
  if (!(pedagogicalReferenceTypes as readonly unknown[]).includes(value.referenceType))
    issue(issues, "referenceType", "type de référence inconnu");
  if (!(pedagogicalReferenceOrigins as readonly unknown[]).includes(value.origin))
    issue(issues, "origin", "origine de référence inconnue");
  for (const key of ["id", "displayName", "schemaVersion"] as const)
    if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  for (const key of ["code", "itemVersion", "catalogVersion"] as const)
    if (value[key] !== null && !text(value[key])) issue(issues, key, "doit être null ou une chaîne non vide");
  if (value.origin === "catalog_item") {
    for (const key of ["code", "itemVersion", "catalogVersion"] as const)
      if (!text(value[key])) issue(issues, key, "est obligatoire pour une référence de catalogue");
  }
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as PedagogicalReferenceSnapshot };
});

export const effectivePedagogicalVariablesSnapshotSchema =
  createSchema<EffectivePedagogicalVariablesSnapshot>((value) => {
    const issues: ContractValidationIssue[] = [];
    if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
    rejectUnknownKeys(value, ["snapshotSchemaVersion", "variablesSchemaVersion", "values"], issues);
    if (value.snapshotSchemaVersion !== EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION)
      issue(issues, "snapshotSchemaVersion", `doit valoir ${EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION}`);
    if (value.variablesSchemaVersion !== PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION)
      issue(issues, "variablesSchemaVersion", `doit valoir ${PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION}`);
    const variables = pedagogicalVariablesSchema.safeParse(value.values);
    if (!variables.success) for (const variableIssue of variables.issues)
      issue(issues, `values.${variableIssue.path}`, variableIssue.message);
    return issues.length ? { success: false, issues } :
      { success: true, data: value as unknown as EffectivePedagogicalVariablesSnapshot };
  });

export const pedagogicalDecisionSchema = createSchema<PedagogicalDecision>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, [
    "id", "schemaVersion", "createdAt", "sourceSnapshots", "observationSnapshots", "hypothesisSnapshots",
    "pedagogicalContextSnapshots", "shooterSelfReportSnapshots", "evidenceSnapshots", "uncertainty",
    "knownLimitations", "diagnosticTestSnapshot",
    "diagnosticTestResultSnapshot", "targetCompetenceSnapshot", "pedagogicalTechniqueSnapshot",
    "exerciseSnapshot", "effectiveVariablesSnapshot", "evaluationSnapshot", "decisionType", "rationale",
    "ruleVersions",
  ], issues);
  if (!text(value.id)) issue(issues, "id", "doit être une chaîne stable non vide");
  if (value.schemaVersion !== PEDAGOGICAL_DECISION_SCHEMA_VERSION)
    issue(issues, "schemaVersion", `doit valoir ${PEDAGOGICAL_DECISION_SCHEMA_VERSION}`);
  if (!text(value.createdAt) || Number.isNaN(Date.parse(String(value.createdAt))))
    issue(issues, "createdAt", "doit être un horodatage ISO interprétable");
  validateSnapshotArray(value.sourceSnapshots, "sourceSnapshots", "source", issues);
  validateSnapshotArray(value.observationSnapshots, "observationSnapshots", "observation", issues);
  validateSnapshotArray(value.hypothesisSnapshots, "hypothesisSnapshots", "hypothesis", issues);
  if (value.pedagogicalContextSnapshots !== undefined)
    validateSnapshotArray(value.pedagogicalContextSnapshots, "pedagogicalContextSnapshots", "pedagogical_context", issues);
  if (value.shooterSelfReportSnapshots !== undefined)
    validateSnapshotArray(value.shooterSelfReportSnapshots, "shooterSelfReportSnapshots", "shooter_self_report", issues);
  if (!Array.isArray(value.evidenceSnapshots)) issue(issues, "evidenceSnapshots", "doit être un tableau");
  else value.evidenceSnapshots.forEach((evidence, index) => {
    const result = pedagogicalEvidenceSchema.safeParse(evidence);
    if (!result.success) for (const evidenceIssue of result.issues)
      issue(issues, `evidenceSnapshots[${index}].${evidenceIssue.path}`, evidenceIssue.message);
  });
  if (value.uncertainty !== null &&
    (typeof value.uncertainty !== "number" || !Number.isFinite(value.uncertainty) || value.uncertainty < 0 || value.uncertainty > 1))
    issue(issues, "uncertainty", "doit être null ou un nombre compris entre 0 et 1");
  if (!Array.isArray(value.knownLimitations) || value.knownLimitations.some((item) => !text(item)))
    issue(issues, "knownLimitations", "doit être un tableau de chaînes non vides");
  else if (new Set(value.knownLimitations).size !== value.knownLimitations.length)
    issue(issues, "knownLimitations", "ne doit pas contenir de doublon");
  validateOptionalSnapshot(value.diagnosticTestSnapshot, "diagnosticTestSnapshot", "diagnostic_test", issues);
  validateOptionalSnapshot(value.diagnosticTestResultSnapshot, "diagnosticTestResultSnapshot", "diagnostic_test_result", issues);
  validateOptionalSnapshot(value.targetCompetenceSnapshot, "targetCompetenceSnapshot", "competence", issues);
  validateOptionalSnapshot(value.pedagogicalTechniqueSnapshot, "pedagogicalTechniqueSnapshot", "pedagogical_technique", issues);
  validateOptionalSnapshot(value.exerciseSnapshot, "exerciseSnapshot", "exercise", issues);
  validateOptionalSnapshot(value.evaluationSnapshot, "evaluationSnapshot", "evaluation", issues);
  if (value.diagnosticTestResultSnapshot !== null && value.diagnosticTestSnapshot === null)
    issue(issues, "diagnosticTestResultSnapshot", "nécessite le snapshot du test correspondant");
  if (value.effectiveVariablesSnapshot !== null) {
    const variables = effectivePedagogicalVariablesSnapshotSchema.safeParse(value.effectiveVariablesSnapshot);
    if (!variables.success) for (const variableIssue of variables.issues)
      issue(issues, `effectiveVariablesSnapshot.${variableIssue.path}`, variableIssue.message);
  }
  if ((value.exerciseSnapshot === null) !== (value.effectiveVariablesSnapshot === null))
    issue(issues, "effectiveVariablesSnapshot", "doit être présente exactement lorsqu'un exercice est snapshoté");
  if (!pedagogicalDecisionTypeSchema.safeParse(value.decisionType).success)
    issue(issues, "decisionType", "type de décision inconnu");
  if (!text(value.rationale)) issue(issues, "rationale", "doit être une chaîne non vide");
  if (!record(value.ruleVersions) || Object.keys(value.ruleVersions).length === 0)
    issue(issues, "ruleVersions", "doit contenir au moins une version de règle");
  else for (const [key, ruleVersion] of Object.entries(value.ruleVersions))
    if (!text(key) || !text(ruleVersion)) issue(issues, "ruleVersions", "doit associer des noms et versions non vides");
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as PedagogicalDecision };
});
