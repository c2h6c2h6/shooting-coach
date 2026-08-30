import type { PedagogicalDecision, EffectivePedagogicalVariablesSnapshot } from "./decisionContracts";
import type { CompetenceEvaluation, DiagnosticTestResult } from "./inputContracts";
import type {
  CurrentMasteryState,
  MasteryEvent,
  MasteryHistoryAnomaly,
  MasteryTransitionResult,
} from "./masteryContracts";
import { applyMasteryEvent } from "./masteryState";
import {
  type L1PlusValidationResult,
  validateL1PlusProgression,
} from "./pedagogicalVariableProgression";

export interface SyntheticMasteryOutcome {
  readonly transition: MasteryTransitionResult | null;
  readonly masteryEvent: MasteryEvent | null;
  readonly currentMasteryStateBefore: CurrentMasteryState;
  readonly currentMasteryStateAfter: CurrentMasteryState;
  readonly anomalies: readonly MasteryHistoryAnomaly[];
}

export type SyntheticVariableProgressionInput =
  | {
    readonly previousVariablesSnapshot: null;
    readonly nextVariablesSnapshot: null;
  }
  | {
    readonly previousVariablesSnapshot: EffectivePedagogicalVariablesSnapshot;
    readonly nextVariablesSnapshot: EffectivePedagogicalVariablesSnapshot;
  };

export type SyntheticPedagogicalOrchestrationInput = SyntheticVariableProgressionInput & {
  readonly diagnosticTestResult: DiagnosticTestResult | null;
  readonly competenceEvaluation: CompetenceEvaluation | null;
  readonly decision: PedagogicalDecision;
  readonly currentMasteryState: CurrentMasteryState;
  /** No event is inferred: a fixture must explicitly supply the complete proposal. */
  readonly proposedMasteryEvent: MasteryEvent | null;
};

/** Non-persisted result used only to prove that the isolated v2 contracts compose. */
export interface SyntheticPedagogicalOrchestrationResult extends SyntheticMasteryOutcome {
  readonly diagnosticTestResult: DiagnosticTestResult | null;
  readonly competenceEvaluation: CompetenceEvaluation | null;
  readonly decision: PedagogicalDecision;
  readonly l1PlusValidation: L1PlusValidationResult | null;
}

function cloneAndFreeze<T>(value: T, ancestors = new Map<object, unknown>()): T {
  if (value === null || typeof value !== "object") return value;
  const existing = ancestors.get(value);
  if (existing !== undefined) return existing as T;
  if (Array.isArray(value)) {
    const clone: unknown[] = [];
    ancestors.set(value, clone);
    for (const item of value) clone.push(cloneAndFreeze(item, ancestors));
    return Object.freeze(clone) as T;
  }
  const clone: Record<string, unknown> = {};
  ancestors.set(value, clone);
  for (const key of Object.keys(value)) clone[key] = cloneAndFreeze((value as Record<string, unknown>)[key], ancestors);
  return Object.freeze(clone) as T;
}

/** Copies a fully explicit decision so later fixture mutations cannot rewrite its historical snapshots. */
export function buildSyntheticPedagogicalDecision(decision: PedagogicalDecision): PedagogicalDecision {
  return cloneAndFreeze(decision);
}

/** Delegates only to the already validated structural 4D comparison. */
export function evaluateSyntheticProgression(
  previous: EffectivePedagogicalVariablesSnapshot,
  next: EffectivePedagogicalVariablesSnapshot,
): L1PlusValidationResult {
  return cloneAndFreeze(validateL1PlusProgression(previous, next));
}

/** Applies an explicitly supplied event; it never infers whether an event should exist. */
export function deriveSyntheticMasteryOutcome(
  currentMasteryState: CurrentMasteryState,
  proposedMasteryEvent: MasteryEvent | null,
): SyntheticMasteryOutcome {
  const before = cloneAndFreeze(currentMasteryState);
  if (proposedMasteryEvent === null) return {
    transition: null,
    masteryEvent: null,
    currentMasteryStateBefore: before,
    currentMasteryStateAfter: cloneAndFreeze(before),
    anomalies: [],
  };

  const event = cloneAndFreeze(proposedMasteryEvent);
  const application = applyMasteryEvent(before, event);
  if (!application.applied) return {
    transition: cloneAndFreeze(application.transition),
    masteryEvent: null,
    currentMasteryStateBefore: before,
    currentMasteryStateAfter: cloneAndFreeze(application.state),
    anomalies: cloneAndFreeze([application.anomaly]),
  };
  return {
    transition: cloneAndFreeze(application.transition),
    masteryEvent: event,
    currentMasteryStateBefore: before,
    currentMasteryStateAfter: cloneAndFreeze(application.state),
    anomalies: [],
  };
}

/** Pure synthetic composition. Every pedagogical choice is already explicit in the input fixtures. */
export function orchestrateSyntheticPedagogicalFlow(
  input: SyntheticPedagogicalOrchestrationInput,
): SyntheticPedagogicalOrchestrationResult {
  const mastery = deriveSyntheticMasteryOutcome(input.currentMasteryState, input.proposedMasteryEvent);
  return cloneAndFreeze({
    diagnosticTestResult: input.diagnosticTestResult,
    competenceEvaluation: input.competenceEvaluation,
    decision: buildSyntheticPedagogicalDecision(input.decision),
    l1PlusValidation: input.previousVariablesSnapshot === null
      ? null
      : evaluateSyntheticProgression(input.previousVariablesSnapshot, input.nextVariablesSnapshot),
    ...mastery,
  });
}
