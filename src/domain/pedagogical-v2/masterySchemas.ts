import { masteryLevelSchema, pedagogicalEvidenceSchema, type ContractSchema,
  type ContractValidationIssue, type ContractValidationResult, PedagogicalContractValidationError } from "./schemas";
import { effectivePedagogicalVariablesSnapshotSchema, pedagogicalReferenceSnapshotSchema } from "./decisionSchemas";
import { humanEvaluationValidationSchema } from "./inputSchemas";
import {
  type CurrentMasteryState,
  masteryHistoryAnomalyCodes,
  type MasteryEvent,
  masteryTransitionKinds,
  type MasteryTransitionResult,
  PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
} from "./masteryContracts";
import type { PedagogicalReferenceType } from "./decisionContracts";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const issue = (issues: ContractValidationIssue[], path: string, message: string) => issues.push({ path, message });

function createSchema<T>(validate: (value: unknown) => ContractValidationResult<T>): ContractSchema<T> {
  return { safeParse: validate, parse(value) { const result = validate(value);
    if (!result.success) throw new PedagogicalContractValidationError(result.issues); return result.data; } };
}

function rejectUnknownKeys(value: RecordValue, allowed: readonly string[], issues: ContractValidationIssue[]) {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) if (!known.has(key)) issue(issues, key, "champ inconnu");
}

function timestamp(value: unknown, path: string, issues: ContractValidationIssue[], nullable = false) {
  if (nullable && value === null) return;
  if (!text(value) || Number.isNaN(Date.parse(String(value)))) issue(issues, path, "doit être un horodatage ISO interprétable");
}

function snapshot(value: unknown, path: string, issues: ContractValidationIssue[], type: PedagogicalReferenceType) {
  const parsed = pedagogicalReferenceSnapshotSchema.safeParse(value);
  if (!parsed.success) {
    for (const snapshotIssue of parsed.issues) issue(issues, `${path}.${snapshotIssue.path}`, snapshotIssue.message);
  } else if (parsed.data.referenceType !== type) issue(issues, `${path}.referenceType`, `doit valoir ${type}`);
}

function optionalSnapshot(value: unknown, path: string, issues: ContractValidationIssue[], type: PedagogicalReferenceType) {
  if (value !== null) snapshot(value, path, issues, type);
}

function evidenceArray(value: unknown, path: string, issues: ContractValidationIssue[]) {
  if (!Array.isArray(value)) { issue(issues, path, "doit être un tableau"); return; }
  value.forEach((evidence, index) => { const parsed = pedagogicalEvidenceSchema.safeParse(evidence);
    if (!parsed.success) for (const evidenceIssue of parsed.issues)
      issue(issues, `${path}[${index}].${evidenceIssue.path}`, evidenceIssue.message); });
}

function anomaliesArray(value: unknown, issues: ContractValidationIssue[]) {
  if (!Array.isArray(value)) { issue(issues, "anomalies", "doit être un tableau"); return; }
  value.forEach((anomaly, index) => {
    if (!record(anomaly)) { issue(issues, `anomalies[${index}]`, "doit être un objet"); return; }
    rejectUnknownKeys(anomaly, ["code", "eventId", "message"], issues);
    if (!(masteryHistoryAnomalyCodes as readonly unknown[]).includes(anomaly.code))
      issue(issues, `anomalies[${index}].code`, "code d'anomalie inconnu");
    for (const key of ["eventId", "message"] as const)
      if (!text(anomaly[key])) issue(issues, `anomalies[${index}].${key}`, "doit être une chaîne non vide");
  });
}

export const masteryEventSchema = createSchema<MasteryEvent>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["id", "schemaVersion", "recordVersion", "shooterId", "competenceSnapshot",
    "expectedPreviousLevel", "resultingLevel", "eventType", "sourceType", "pedagogicalDecisionSnapshot",
    "competenceEvaluationSnapshot", "evidenceSnapshots", "contextSnapshot", "effectiveVariablesSnapshot",
    "humanValidation", "rationale", "occurredAt", "transitionRuleVersion"], issues);
  for (const key of ["id", "recordVersion", "shooterId", "eventType", "sourceType", "rationale",
    "transitionRuleVersion"] as const) if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  if (value.schemaVersion !== PEDAGOGICAL_MASTERY_SCHEMA_VERSION)
    issue(issues, "schemaVersion", `doit valoir ${PEDAGOGICAL_MASTERY_SCHEMA_VERSION}`);
  snapshot(value.competenceSnapshot, "competenceSnapshot", issues, "competence");
  if (!masteryLevelSchema.safeParse(value.expectedPreviousLevel).success)
    issue(issues, "expectedPreviousLevel", "niveau de maîtrise inconnu");
  if (!masteryLevelSchema.safeParse(value.resultingLevel).success)
    issue(issues, "resultingLevel", "niveau de maîtrise inconnu");
  optionalSnapshot(value.pedagogicalDecisionSnapshot, "pedagogicalDecisionSnapshot", issues, "pedagogical_decision");
  optionalSnapshot(value.competenceEvaluationSnapshot, "competenceEvaluationSnapshot", issues, "evaluation");
  evidenceArray(value.evidenceSnapshots, "evidenceSnapshots", issues);
  optionalSnapshot(value.contextSnapshot, "contextSnapshot", issues, "pedagogical_context");
  if (value.effectiveVariablesSnapshot !== null) {
    const parsed = effectivePedagogicalVariablesSnapshotSchema.safeParse(value.effectiveVariablesSnapshot);
    if (!parsed.success) for (const variableIssue of parsed.issues)
      issue(issues, `effectiveVariablesSnapshot.${variableIssue.path}`, variableIssue.message);
  }
  if (value.humanValidation !== null) {
    const parsed = humanEvaluationValidationSchema.safeParse(value.humanValidation);
    if (!parsed.success) for (const validationIssue of parsed.issues)
      issue(issues, `humanValidation.${validationIssue.path}`, validationIssue.message);
  }
  timestamp(value.occurredAt, "occurredAt", issues);
  return issues.length ? { success: false, issues } : { success: true, data: value as unknown as MasteryEvent };
});

export const masteryTransitionResultSchema = createSchema<MasteryTransitionResult>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["accepted", "kind", "fromLevel", "toLevel", "reasonCode", "reason"], issues);
  if (typeof value.accepted !== "boolean") issue(issues, "accepted", "doit être un booléen");
  if (!(masteryTransitionKinds as readonly unknown[]).includes(value.kind)) issue(issues, "kind", "type de transition inconnu");
  if (!masteryLevelSchema.safeParse(value.fromLevel).success) issue(issues, "fromLevel", "niveau inconnu");
  if (!masteryLevelSchema.safeParse(value.toLevel).success) issue(issues, "toLevel", "niveau inconnu");
  for (const key of ["reasonCode", "reason"] as const) if (!text(value[key])) issue(issues, key, "doit être une chaîne non vide");
  if (value.accepted === true && value.kind === "rejected") issue(issues, "kind", "une transition acceptée ne peut pas être rejetée");
  if (value.accepted === false && value.kind !== "rejected") issue(issues, "kind", "une transition refusée doit être marquée rejected");
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as MasteryTransitionResult };
});

export const currentMasteryStateSchema = createSchema<CurrentMasteryState>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["schemaVersion", "shooterId", "competenceSnapshot", "currentLevel", "lastAppliedEventId",
    "lastAppliedAt", "lastChangedAt", "lastContextSnapshot", "lastEffectiveVariablesSnapshot", "appliedEventCount",
    "anomalies"], issues);
  if (value.schemaVersion !== PEDAGOGICAL_MASTERY_SCHEMA_VERSION)
    issue(issues, "schemaVersion", `doit valoir ${PEDAGOGICAL_MASTERY_SCHEMA_VERSION}`);
  if (!text(value.shooterId)) issue(issues, "shooterId", "doit être une chaîne non vide");
  snapshot(value.competenceSnapshot, "competenceSnapshot", issues, "competence");
  if (!masteryLevelSchema.safeParse(value.currentLevel).success) issue(issues, "currentLevel", "niveau inconnu");
  if (value.lastAppliedEventId !== null && !text(value.lastAppliedEventId))
    issue(issues, "lastAppliedEventId", "doit être null ou une chaîne non vide");
  timestamp(value.lastAppliedAt, "lastAppliedAt", issues, true);
  timestamp(value.lastChangedAt, "lastChangedAt", issues, true);
  optionalSnapshot(value.lastContextSnapshot, "lastContextSnapshot", issues, "pedagogical_context");
  if (value.lastEffectiveVariablesSnapshot !== null) {
    const parsed = effectivePedagogicalVariablesSnapshotSchema.safeParse(value.lastEffectiveVariablesSnapshot);
    if (!parsed.success) for (const variableIssue of parsed.issues)
      issue(issues, `lastEffectiveVariablesSnapshot.${variableIssue.path}`, variableIssue.message);
  }
  if (!Number.isInteger(value.appliedEventCount) || Number(value.appliedEventCount) < 0)
    issue(issues, "appliedEventCount", "doit être un entier positif ou nul");
  if ((value.lastAppliedEventId === null) !== (value.lastAppliedAt === null))
    issue(issues, "lastAppliedAt", "doit être présente exactement lorsqu'un événement a été appliqué");
  if (value.lastAppliedEventId === null && value.appliedEventCount !== 0)
    issue(issues, "appliedEventCount", "doit valoir zéro sans événement appliqué");
  anomaliesArray(value.anomalies, issues);
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as CurrentMasteryState };
});
