import { masteryLevels, type MasteryLevel } from "./contracts";
import {
  type CurrentMasteryState,
  type MasteryEvent,
  type MasteryEventApplicationResult,
  type MasteryHistoryAnomaly,
  type MasteryStateTarget,
  type MasteryTransitionResult,
  PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
} from "./masteryContracts";

const levelIndex = (level: MasteryLevel) => masteryLevels.indexOf(level);

const rejectedTransition = (
  fromLevel: MasteryLevel,
  toLevel: MasteryLevel,
  reasonCode: string,
  reason: string,
): MasteryTransitionResult => ({ accepted: false, kind: "rejected", fromLevel, toLevel, reasonCode, reason });

export function validateMasteryTransition(
  fromLevel: MasteryLevel,
  toLevel: MasteryLevel,
): MasteryTransitionResult {
  if (fromLevel === toLevel) return {
    accepted: true,
    kind: "maintain",
    fromLevel,
    toLevel,
    reasonCode: "MAINTAIN_ALLOWED",
    reason: "Le maintien explicite du niveau est structurellement autorisé.",
  };
  if (fromLevel === "acquisition" && toLevel === "transfer") return rejectedTransition(
    fromLevel,
    toLevel,
    "ACQUISITION_TO_TRANSFER_FORBIDDEN",
    "Le passage direct de acquisition à transfer est interdit.",
  );
  const fromIndex = levelIndex(fromLevel);
  const toIndex = levelIndex(toLevel);
  if (toIndex === fromIndex + 1) return {
    accepted: true,
    kind: "progression",
    fromLevel,
    toLevel,
    reasonCode: "NEXT_LEVEL_PROGRESSION_ALLOWED",
    reason: "La progression respecte l'ordre structurel des niveaux.",
  };
  if (toIndex < fromIndex) return {
    accepted: true,
    kind: "regression",
    fromLevel,
    toLevel,
    reasonCode: "EXPLICIT_REGRESSION_ALLOWED",
    reason: "Une régression explicitement motivée est structurellement représentable.",
  };
  return rejectedTransition(
    fromLevel,
    toLevel,
    "SKIPPED_PROGRESSION_LEVEL",
    "Une progression ne peut pas sauter un niveau intermédiaire.",
  );
}

export function createNotEvaluatedMasteryState(target: MasteryStateTarget): CurrentMasteryState {
  return {
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    shooterId: target.shooterId,
    competenceSnapshot: target.competenceSnapshot,
    currentLevel: "not_evaluated",
    lastAppliedEventId: null,
    lastAppliedAt: null,
    lastChangedAt: null,
    lastContextSnapshot: null,
    lastEffectiveVariablesSnapshot: null,
    appliedEventCount: 0,
    anomalies: [],
  };
}

function applicationFailure(
  state: CurrentMasteryState,
  event: MasteryEvent,
  transition: MasteryTransitionResult,
  code: MasteryHistoryAnomaly["code"],
  message: string,
): MasteryEventApplicationResult {
  return { applied: false, state, transition, anomaly: { code, eventId: event.id, message } };
}

export function applyMasteryEvent(
  currentState: CurrentMasteryState,
  event: MasteryEvent,
): MasteryEventApplicationResult {
  if (currentState.anomalies.length > 0) return applicationFailure(
    currentState,
    event,
    rejectedTransition(currentState.currentLevel, event.resultingLevel, "HISTORY_ALREADY_INCONSISTENT",
      "Un historique déjà incohérent ne peut pas recevoir un nouvel événement."),
    "HISTORY_ALREADY_INCONSISTENT",
    "L'état courant contient déjà une anomalie d'historique.",
  );
  if (event.shooterId !== currentState.shooterId ||
    event.competenceSnapshot.id !== currentState.competenceSnapshot.id) return applicationFailure(
    currentState,
    event,
    rejectedTransition(currentState.currentLevel, event.resultingLevel, "TARGET_MISMATCH",
      "L'événement ne concerne pas la cible de maîtrise courante."),
    "TARGET_MISMATCH",
    "L'événement concerne un autre tireur ou une autre compétence.",
  );
  if (event.id === currentState.lastAppliedEventId) return applicationFailure(
    currentState,
    event,
    rejectedTransition(currentState.currentLevel, event.resultingLevel, "DUPLICATE_EVENT_ID",
      "Un événement ne peut pas être appliqué deux fois."),
    "DUPLICATE_EVENT_ID",
    "L'identifiant d'événement est déjà le dernier événement appliqué.",
  );
  if (currentState.lastAppliedAt !== null && Date.parse(event.occurredAt) <= Date.parse(currentState.lastAppliedAt))
    return applicationFailure(
      currentState,
      event,
      rejectedTransition(currentState.currentLevel, event.resultingLevel, "OUT_OF_ORDER_EVENT",
        "Les événements doivent être fournis dans un ordre chronologique strict."),
      "OUT_OF_ORDER_EVENT",
      "L'événement n'est pas strictement postérieur au dernier événement appliqué.",
    );
  if (event.expectedPreviousLevel !== currentState.currentLevel) return applicationFailure(
    currentState,
    event,
    rejectedTransition(currentState.currentLevel, event.resultingLevel, "PREVIOUS_LEVEL_MISMATCH",
      "Le niveau précédent déclaré ne correspond pas à l'état dérivé."),
    "PREVIOUS_LEVEL_MISMATCH",
    `Niveau précédent attendu ${event.expectedPreviousLevel}, état dérivé ${currentState.currentLevel}.`,
  );
  const transition = validateMasteryTransition(currentState.currentLevel, event.resultingLevel);
  if (!transition.accepted) return applicationFailure(
    currentState,
    event,
    transition,
    "INVALID_TRANSITION",
    transition.reason,
  );
  if (transition.kind === "regression" && event.rationale.trim().length === 0) return applicationFailure(
    currentState,
    event,
    rejectedTransition(currentState.currentLevel, event.resultingLevel, "REGRESSION_RATIONALE_REQUIRED",
      "Une régression doit être explicitement motivée."),
    "INVALID_TRANSITION",
    "Une régression sans rationale explicite ne peut pas être appliquée.",
  );
  const changed = currentState.currentLevel !== event.resultingLevel;
  return {
    applied: true,
    transition,
    anomaly: null,
    state: {
      schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
      shooterId: currentState.shooterId,
      competenceSnapshot: event.competenceSnapshot,
      currentLevel: event.resultingLevel,
      lastAppliedEventId: event.id,
      lastAppliedAt: event.occurredAt,
      lastChangedAt: changed ? event.occurredAt : currentState.lastChangedAt,
      lastContextSnapshot: event.contextSnapshot,
      lastEffectiveVariablesSnapshot: event.effectiveVariablesSnapshot,
      appliedEventCount: currentState.appliedEventCount + 1,
      anomalies: currentState.anomalies,
    },
  };
}

export function deriveCurrentMasteryState(
  target: MasteryStateTarget,
  events: readonly MasteryEvent[],
): CurrentMasteryState {
  let state = createNotEvaluatedMasteryState(target);
  const seenEventIds = new Set<string>();
  for (const event of events) {
    if (event.shooterId !== target.shooterId || event.competenceSnapshot.id !== target.competenceSnapshot.id) continue;
    if (seenEventIds.has(event.id)) {
      return {
        ...state,
        anomalies: [...state.anomalies, {
          code: "DUPLICATE_EVENT_ID",
          eventId: event.id,
          message: "L'historique contient deux événements portant le même identifiant.",
        }],
      };
    }
    seenEventIds.add(event.id);
    const application = applyMasteryEvent(state, event);
    if (!application.applied) return {
      ...state,
      anomalies: [...state.anomalies, application.anomaly],
    };
    state = application.state;
  }
  return state;
}
