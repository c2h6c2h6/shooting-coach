export type SeriesType =
  | "reference"
  | "diagnostic"
  | "corrective"
  | "consolidation"
  | "progression";

export type SeriesStatus = "planned" | "active" | "completed" | "cancelled";
export type CadenceType = "free" | "timed" | "fixed_interval" | "unknown";

export interface SeriesDraft {
  sessionId: string;
  sequenceNumber: number;
  type: SeriesType;
  expectedShotCount: number;
  instruction?: string | null;
  pedagogicalObjective?: string | null;
  selectedSkillId?: string | null;
  durationSeconds?: number | null;
  cadenceType?: CadenceType | null;
  notes?: string | null;
}

export interface Series extends SeriesDraft {
  id: string;
  status: SeriesStatus;
  recordedShotCount: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const MIN_SHOT_COUNT = 1;
export const MAX_SHOT_COUNT = 50;
export const DEFAULT_REFERENCE_SHOT_COUNT = 5;
export const DEFAULT_REFERENCE_INSTRUCTION =
  "Réalisez cette série pour observer votre niveau du jour.";

export type SeriesValidationErrors = Partial<Record<keyof SeriesDraft, string>>;

export function validateSeriesDraft(draft: SeriesDraft): SeriesValidationErrors {
  const errors: SeriesValidationErrors = {};
  if (!draft.sessionId) errors.sessionId = "La séance est obligatoire.";
  if (!Number.isInteger(draft.sequenceNumber) || draft.sequenceNumber < 1) {
    errors.sequenceNumber = "Le numéro de série doit être un entier positif.";
  }
  if (
    !Number.isInteger(draft.expectedShotCount) ||
    draft.expectedShotCount < MIN_SHOT_COUNT ||
    draft.expectedShotCount > MAX_SHOT_COUNT
  ) {
    errors.expectedShotCount = `Le nombre de coups doit être compris entre ${MIN_SHOT_COUNT} et ${MAX_SHOT_COUNT}.`;
  }
  if (
    draft.durationSeconds !== null &&
    draft.durationSeconds !== undefined &&
    (!Number.isInteger(draft.durationSeconds) || draft.durationSeconds < 1)
  ) {
    errors.durationSeconds = "La durée doit être un nombre entier de secondes positif.";
  }
  return errors;
}

export function assertValidRecordedShotCount(count: number): void {
  if (!Number.isInteger(count) || count < 0 || count > MAX_SHOT_COUNT) {
    throw new Error(`Le nombre de coups enregistrés doit être compris entre 0 et ${MAX_SHOT_COUNT}.`);
  }
}

export function canTransitionSeries(from: SeriesStatus, to: SeriesStatus): boolean {
  return (
    (from === "planned" && (to === "active" || to === "cancelled")) ||
    (from === "active" && (to === "completed" || to === "cancelled"))
  );
}
