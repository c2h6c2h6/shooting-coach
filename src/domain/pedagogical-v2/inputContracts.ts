import type {
  PedagogicalEvidence,
  ValidationMode,
  VersionedPedagogicalReference,
} from "./contracts";
import type {
  EffectivePedagogicalVariablesSnapshot,
  PedagogicalReferenceSnapshot,
} from "./decisionContracts";

export const PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION = "pedagogical-v2-inputs-v1";

export interface PedagogicalRecordProvenance {
  readonly sourceType: string;
  readonly sourceId: string | null;
  readonly actorType: string | null;
  readonly actorId: string | null;
}

/** Autonomous pedagogical context. It deliberately carries no predefined business vocabulary. */
export interface PedagogicalContext extends VersionedPedagogicalReference {
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface DiagnosticTestDefinition extends VersionedPedagogicalReference {
  readonly code: string;
  readonly name: string;
  readonly objective: string;
  readonly discriminatedHypothesisIds: readonly string[];
  readonly discriminatedUncertaintyCodes: readonly string[];
  readonly observedCompetenceId: string | null;
  readonly prerequisiteReferenceIds: readonly string[];
  readonly conditionsOfUse: readonly string[];
  readonly interpretationLimits: readonly string[];
  readonly stopCriteria: readonly string[];
  readonly validationMode: ValidationMode;
  readonly supervisionRequirements: readonly string[];
}

export const diagnosticTestResultStatuses = ["usable", "non_discriminating", "inconclusive"] as const;
export type DiagnosticTestResultStatus = (typeof diagnosticTestResultStatuses)[number];

export interface DiagnosticTestResult {
  readonly id: string;
  readonly schemaVersion: string;
  readonly recordVersion: string;
  readonly performedAt: string;
  readonly diagnosticTestSnapshot: PedagogicalReferenceSnapshot;
  readonly status: DiagnosticTestResultStatus;
  readonly structuredResult: Readonly<Record<string, unknown>>;
  readonly observationSnapshots: readonly PedagogicalReferenceSnapshot[];
  readonly evidenceSnapshots: readonly PedagogicalEvidence[];
  readonly knownLimitations: readonly string[];
  readonly inconclusiveReason: string | null;
  readonly provenance: PedagogicalRecordProvenance;
}

export interface HumanEvaluationValidation {
  readonly validatorId: string;
  readonly validatorRole: string;
  readonly validatedAt: string;
  readonly rationale: string | null;
}

/** Evaluation evidence for a competence. It is not a mastery state or a mastery transition. */
export interface CompetenceEvaluation {
  readonly id: string;
  readonly schemaVersion: string;
  readonly recordVersion: string;
  readonly evaluatedAt: string;
  readonly competenceSnapshot: PedagogicalReferenceSnapshot;
  readonly contextSnapshot: PedagogicalReferenceSnapshot | null;
  readonly effectiveVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null;
  readonly observationSnapshots: readonly PedagogicalReferenceSnapshot[];
  readonly evidenceSnapshots: readonly PedagogicalEvidence[];
  readonly structuredResult: Readonly<Record<string, unknown>>;
  readonly validationMode: ValidationMode;
  readonly humanValidation: HumanEvaluationValidation | null;
  readonly knownLimitations: readonly string[];
  readonly rationale: string;
  readonly provenance: PedagogicalRecordProvenance;
}

/** What the shooter reports perceiving. It may later be the source of evidence, never technical truth by itself. */
export interface ShooterSelfReport {
  readonly id: string;
  readonly schemaVersion: string;
  readonly recordVersion: string;
  readonly reportedAt: string;
  readonly subjectSnapshot: PedagogicalReferenceSnapshot;
  readonly content: string;
  readonly confidence: number | null;
  readonly contextSnapshot: PedagogicalReferenceSnapshot | null;
  readonly provenance: PedagogicalRecordProvenance;
}
