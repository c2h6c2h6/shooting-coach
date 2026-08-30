import type { MasteryLevel, PedagogicalEvidence } from "./contracts";
import type {
  EffectivePedagogicalVariablesSnapshot,
  PedagogicalReferenceSnapshot,
} from "./decisionContracts";
import type { HumanEvaluationValidation } from "./inputContracts";

export const PEDAGOGICAL_MASTERY_SCHEMA_VERSION = "pedagogical-mastery-v1";

export interface MasteryEvent {
  readonly id: string;
  readonly schemaVersion: string;
  readonly recordVersion: string;
  readonly shooterId: string;
  readonly competenceSnapshot: PedagogicalReferenceSnapshot;
  readonly expectedPreviousLevel: MasteryLevel;
  readonly resultingLevel: MasteryLevel;
  readonly eventType: string;
  readonly sourceType: string;
  readonly pedagogicalDecisionSnapshot: PedagogicalReferenceSnapshot | null;
  readonly competenceEvaluationSnapshot: PedagogicalReferenceSnapshot | null;
  readonly evidenceSnapshots: readonly PedagogicalEvidence[];
  readonly contextSnapshot: PedagogicalReferenceSnapshot | null;
  readonly effectiveVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null;
  readonly humanValidation: HumanEvaluationValidation | null;
  readonly rationale: string;
  readonly occurredAt: string;
  readonly transitionRuleVersion: string;
}

export const masteryTransitionKinds = ["maintain", "progression", "regression", "rejected"] as const;
export type MasteryTransitionKind = (typeof masteryTransitionKinds)[number];

export interface MasteryTransitionResult {
  readonly accepted: boolean;
  readonly kind: MasteryTransitionKind;
  readonly fromLevel: MasteryLevel;
  readonly toLevel: MasteryLevel;
  readonly reasonCode: string;
  readonly reason: string;
}

export const masteryHistoryAnomalyCodes = [
  "OUT_OF_ORDER_EVENT",
  "DUPLICATE_EVENT_ID",
  "PREVIOUS_LEVEL_MISMATCH",
  "INVALID_TRANSITION",
  "TARGET_MISMATCH",
  "HISTORY_ALREADY_INCONSISTENT",
] as const;
export type MasteryHistoryAnomalyCode = (typeof masteryHistoryAnomalyCodes)[number];

export interface MasteryHistoryAnomaly {
  readonly code: MasteryHistoryAnomalyCode;
  readonly eventId: string;
  readonly message: string;
}

export interface MasteryStateTarget {
  readonly shooterId: string;
  readonly competenceSnapshot: PedagogicalReferenceSnapshot;
}

/** Derived projection only. MasteryEvent history remains the sole source of truth. */
export interface CurrentMasteryState {
  readonly schemaVersion: string;
  readonly shooterId: string;
  readonly competenceSnapshot: PedagogicalReferenceSnapshot;
  readonly currentLevel: MasteryLevel;
  readonly lastAppliedEventId: string | null;
  readonly lastAppliedAt: string | null;
  readonly lastChangedAt: string | null;
  readonly lastContextSnapshot: PedagogicalReferenceSnapshot | null;
  readonly lastEffectiveVariablesSnapshot: EffectivePedagogicalVariablesSnapshot | null;
  readonly appliedEventCount: number;
  readonly anomalies: readonly MasteryHistoryAnomaly[];
}

export type MasteryEventApplicationResult =
  | {
    readonly applied: true;
    readonly state: CurrentMasteryState;
    readonly transition: MasteryTransitionResult;
    readonly anomaly: null;
  }
  | {
    readonly applied: false;
    readonly state: CurrentMasteryState;
    readonly transition: MasteryTransitionResult;
    readonly anomaly: MasteryHistoryAnomaly;
  };
