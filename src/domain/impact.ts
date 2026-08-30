export type ImpactSource = "manual" | "automatic" | "corrected";

export interface ImpactDraft {
  seriesId: string;
  sequenceNumber: number;
  normalizedX: number;
  normalizedY: number;
  targetX?: number | null;
  targetY?: number | null;
  physicalXmm?: number | null;
  physicalYmm?: number | null;
  source: ImpactSource;
  confidence?: number | null;
  isExcluded?: boolean;
  exclusionReason?: string | null;
}

export interface Impact extends ImpactDraft {
  id: string;
  isExcluded: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ImpactValidationErrors = Partial<Record<keyof ImpactDraft, string>>;

export function validateImpactDraft(draft: ImpactDraft): ImpactValidationErrors {
  const errors: ImpactValidationErrors = {};
  if (!draft.seriesId) errors.seriesId = "La série est obligatoire.";
  if (!Number.isInteger(draft.sequenceNumber) || draft.sequenceNumber < 1) {
    errors.sequenceNumber = "Le numéro d’impact doit être un entier strictement positif.";
  }
  if (!Number.isFinite(draft.normalizedX) || draft.normalizedX < 0 || draft.normalizedX > 1) {
    errors.normalizedX = "La coordonnée X doit être comprise entre 0 et 1.";
  }
  if (!Number.isFinite(draft.normalizedY) || draft.normalizedY < 0 || draft.normalizedY > 1) {
    errors.normalizedY = "La coordonnée Y doit être comprise entre 0 et 1.";
  }
  if (draft.confidence != null && (draft.confidence < 0 || draft.confidence > 1)) {
    errors.confidence = "La confiance doit être comprise entre 0 et 1.";
  }
  if (draft.isExcluded && !draft.exclusionReason?.trim()) {
    errors.exclusionReason = "Une raison est requise pour exclure un impact.";
  }
  return errors;
}

export function assertValidImpactDraft(draft: ImpactDraft): void {
  if (Object.keys(validateImpactDraft(draft)).length) throw new Error("Impact invalide.");
}

export function compareImpacts(a: Pick<Impact, "sequenceNumber">, b: Pick<Impact, "sequenceNumber">) {
  return a.sequenceNumber - b.sequenceNumber;
}

export type ImpactCountRelation = "fewer" | "equal" | "more";
export function compareImpactCount(impactCount: number, expectedShotCount: number): ImpactCountRelation {
  if (impactCount < expectedShotCount) return "fewer";
  if (impactCount > expectedShotCount) return "more";
  return "equal";
}
