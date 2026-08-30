import {
  l1PlusValidationStatuses,
  pedagogicalVariableChangeKinds,
  pedagogicalVariablesMetadataKeys,
  type L1PlusValidationResult,
  type PedagogicalVariableChangeAnalysis,
} from "./pedagogicalVariableProgression";
import { pedagogicalVariableKeys } from "./contracts";
import {
  PedagogicalContractValidationError,
  type ContractSchema,
  type ContractValidationIssue,
  type ContractValidationResult,
} from "./schemas";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const issue = (issues: ContractValidationIssue[], path: string, message: string) => issues.push({ path, message });

function createSchema<T>(validate: (value: unknown) => ContractValidationResult<T>): ContractSchema<T> {
  return { safeParse: validate, parse(value) { const result = validate(value);
    if (!result.success) throw new PedagogicalContractValidationError(result.issues); return result.data; } };
}

function rejectUnknownKeys(value: RecordValue, allowed: readonly string[], issues: ContractValidationIssue[], path = "") {
  const known = new Set(allowed);
  for (const key of Object.keys(value)) if (!known.has(key)) issue(issues, `${path}${key}`, "champ inconnu");
}

function validateAnalysis(value: unknown): ContractValidationResult<PedagogicalVariableChangeAnalysis> {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["comparisonStatus", "changedVariableCount", "changes", "nonComparableVariableKeys",
    "metadataChanges"], issues);
  if (value.comparisonStatus !== "comparable" && value.comparisonStatus !== "not_comparable")
    issue(issues, "comparisonStatus", "statut de comparaison inconnu");
  if (value.changedVariableCount !== null && (!Number.isInteger(value.changedVariableCount) || Number(value.changedVariableCount) < 0))
    issue(issues, "changedVariableCount", "doit être un entier positif ou nul, ou null");

  if (!Array.isArray(value.changes)) issue(issues, "changes", "doit être un tableau");
  else value.changes.forEach((change, index) => {
    if (!record(change)) { issue(issues, `changes[${index}]`, "doit être un objet"); return; }
    rejectUnknownKeys(change, ["key", "previousValue", "nextValue", "kind", "interpretable"], issues, `changes[${index}].`);
    if (!(pedagogicalVariableKeys as readonly unknown[]).includes(change.key)) issue(issues, `changes[${index}].key`, "variable inconnue");
    if (!(pedagogicalVariableChangeKinds as readonly unknown[]).includes(change.kind)) issue(issues, `changes[${index}].kind`, "type de changement inconnu");
    if (change.interpretable !== true) issue(issues, `changes[${index}].interpretable`, "doit valoir true");
  });

  if (!Array.isArray(value.nonComparableVariableKeys)) issue(issues, "nonComparableVariableKeys", "doit être un tableau");
  else for (const key of value.nonComparableVariableKeys)
    if (!(pedagogicalVariableKeys as readonly unknown[]).includes(key)) issue(issues, "nonComparableVariableKeys", "variable inconnue");

  if (!Array.isArray(value.metadataChanges)) issue(issues, "metadataChanges", "doit être un tableau");
  else value.metadataChanges.forEach((change, index) => {
    if (!record(change)) { issue(issues, `metadataChanges[${index}]`, "doit être un objet"); return; }
    rejectUnknownKeys(change, ["key", "previousValue", "nextValue"], issues, `metadataChanges[${index}].`);
    if (!(pedagogicalVariablesMetadataKeys as readonly unknown[]).includes(change.key)) issue(issues, `metadataChanges[${index}].key`, "métadonnée inconnue");
    for (const key of ["previousValue", "nextValue"] as const)
      if (!text(change[key])) issue(issues, `metadataChanges[${index}].${key}`, "doit être une chaîne non vide");
  });

  if (value.comparisonStatus === "comparable") {
    if (value.changedVariableCount !== (Array.isArray(value.changes) ? value.changes.length : -1))
      issue(issues, "changedVariableCount", "doit correspondre au nombre de changements");
    if (Array.isArray(value.nonComparableVariableKeys) && value.nonComparableVariableKeys.length > 0)
      issue(issues, "nonComparableVariableKeys", "doit être vide pour une comparaison interprétable");
  } else {
    if (value.changedVariableCount !== null) issue(issues, "changedVariableCount", "doit être null si la comparaison est impossible");
    if (Array.isArray(value.nonComparableVariableKeys) && value.nonComparableVariableKeys.length === 0)
      issue(issues, "nonComparableVariableKeys", "doit identifier au moins une variable");
  }
  return issues.length ? { success: false, issues } :
    { success: true, data: value as unknown as PedagogicalVariableChangeAnalysis };
}

export const pedagogicalVariableChangeAnalysisSchema = createSchema(validateAnalysis);

export const l1PlusValidationResultSchema = createSchema<L1PlusValidationResult>((value) => {
  const issues: ContractValidationIssue[] = [];
  if (!record(value)) return { success: false, issues: [{ path: "$", message: "doit être un objet" }] };
  rejectUnknownKeys(value, ["status", "compatibleWithNormalL1Plus", "representsVariableProgression",
    "configurationValidity", "analysis"], issues);
  if (!(l1PlusValidationStatuses as readonly unknown[]).includes(value.status)) issue(issues, "status", "statut L1+ inconnu");
  if (value.compatibleWithNormalL1Plus !== null && typeof value.compatibleWithNormalL1Plus !== "boolean")
    issue(issues, "compatibleWithNormalL1Plus", "doit être un booléen ou null");
  if (value.representsVariableProgression !== null && typeof value.representsVariableProgression !== "boolean")
    issue(issues, "representsVariableProgression", "doit être un booléen ou null");
  if (value.configurationValidity !== "not_assessed") issue(issues, "configurationValidity", "doit valoir not_assessed");
  const analysis = validateAnalysis(value.analysis);
  if (!analysis.success) for (const analysisIssue of analysis.issues)
    issue(issues, `analysis.${analysisIssue.path}`, analysisIssue.message);

  const count = analysis.success ? analysis.data.changedVariableCount : undefined;
  if (value.status === "not_comparable" && (count !== null || value.compatibleWithNormalL1Plus !== null || value.representsVariableProgression !== null))
    issue(issues, "status", "un résultat non comparable doit conserver des conclusions nulles");
  if (value.status === "no_variable_change" && (count !== 0 || value.compatibleWithNormalL1Plus !== true || value.representsVariableProgression !== false))
    issue(issues, "status", "incohérent avec zéro changement");
  if (value.status === "compatible_single_change" && (count !== 1 || value.compatibleWithNormalL1Plus !== true || value.representsVariableProgression !== true))
    issue(issues, "status", "incohérent avec un changement");
  if (value.status === "multiple_changes" && (typeof count !== "number" || count <= 1 || value.compatibleWithNormalL1Plus !== false || value.representsVariableProgression !== true))
    issue(issues, "status", "incohérent avec plusieurs changements");
  return issues.length ? { success: false, issues } : { success: true, data: value as unknown as L1PlusValidationResult };
});
