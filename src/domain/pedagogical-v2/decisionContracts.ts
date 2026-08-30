import type {
  PedagogicalDecisionType,
  PedagogicalEvidence,
  PedagogicalVariables,
} from "./contracts";

export const PEDAGOGICAL_DECISION_SCHEMA_VERSION = "pedagogical-decision-v1";
export const EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION =
  "effective-pedagogical-variables-snapshot-v1";

export const pedagogicalReferenceTypes = [
  "source",
  "observation",
  "hypothesis",
  "diagnostic_test",
  "diagnostic_test_result",
  "pedagogical_decision",
  "pedagogical_context",
  "shooter_self_report",
  "competence",
  "pedagogical_technique",
  "exercise",
  "evaluation",
] as const;
export type PedagogicalReferenceType = (typeof pedagogicalReferenceTypes)[number];

export const pedagogicalReferenceOrigins = ["catalog_item", "versioned_entity"] as const;
export type PedagogicalReferenceOrigin = (typeof pedagogicalReferenceOrigins)[number];

/** Immutable identity copied from the reference as it existed when the decision was produced. */
export interface PedagogicalReferenceSnapshot {
  readonly referenceType: PedagogicalReferenceType;
  readonly origin: PedagogicalReferenceOrigin;
  readonly id: string;
  readonly code: string | null;
  readonly displayName: string;
  readonly itemVersion: string | null;
  readonly catalogVersion: string | null;
  readonly schemaVersion: string;
}

/** Effective values are kept separately from the versioned identity of an exercise. */
export interface EffectivePedagogicalVariablesSnapshot {
  readonly snapshotSchemaVersion: string;
  readonly variablesSchemaVersion: string;
  readonly values: PedagogicalVariables;
}

export interface PedagogicalDecision {
  readonly id: string;
  readonly schemaVersion: string;
  readonly createdAt: string;
  readonly sourceSnapshots: readonly PedagogicalReferenceSnapshot[];
  readonly observationSnapshots: readonly PedagogicalReferenceSnapshot[];
  readonly hypothesisSnapshots: readonly PedagogicalReferenceSnapshot[];
  readonly pedagogicalContextSnapshots?: readonly PedagogicalReferenceSnapshot[];
  readonly shooterSelfReportSnapshots?: readonly PedagogicalReferenceSnapshot[];
  readonly evidenceSnapshots: readonly PedagogicalEvidence[];
  readonly uncertainty: number | null;
  readonly knownLimitations: readonly string[];
  readonly diagnosticTestSnapshot: PedagogicalReferenceSnapshot | null;
  readonly diagnosticTestResultSnapshot: PedagogicalReferenceSnapshot | null;
  readonly targetCompetenceSnapshot: PedagogicalReferenceSnapshot | null;
  readonly pedagogicalTechniqueSnapshot: PedagogicalReferenceSnapshot | null;
  readonly exerciseSnapshot: PedagogicalReferenceSnapshot | null;
  readonly effectiveVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null;
  readonly evaluationSnapshot: PedagogicalReferenceSnapshot | null;
  readonly decisionType: PedagogicalDecisionType;
  readonly rationale: string;
  readonly ruleVersions: Readonly<Record<string, string>>;
}
