import { Laterality } from "./profile";

export type SessionMode = "coaching_free" | "training";
export type SessionStatus = "draft" | "active" | "completed" | "cancelled";
export type NumberOfHands = 1 | 2;

export interface WeaponReference {
  id: string;
  name: string;
  active: boolean;
}

export interface TargetTypeReference {
  id: string;
  name: string;
  active: boolean;
  widthMm: number | null;
  heightMm: number | null;
}

export interface ProvisionalSkill {
  id: string;
  label: string;
}

export interface SessionDraft {
  shooterProfileId: string | null;
  mode: SessionMode;
  weaponId: string | null;
  distanceMm: number | null;
  numberOfHands: NumberOfHands;
  targetTypeId: string | null;
  objectiveType?: "free_text" | "provisional_skill" | null;
  objectiveLabel?: string | null;
  selectedSkillId?: string | null;
}

export interface SessionSnapshot {
  shooterDisplayName: string;
  shooterLaterality: Laterality;
  weaponName: string;
  targetTypeName: string;
  targetWidthMm: number | null;
  targetHeightMm: number | null;
}

export interface Session extends Omit<SessionDraft, "shooterProfileId" | "weaponId" | "distanceMm" | "numberOfHands" | "targetTypeId">, SessionSnapshot {
  id: string;
  shooterProfileId: string;
  weaponId: string;
  distanceMm: number;
  numberOfHands: NumberOfHands | null;
  targetTypeId: string;
  status: SessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const STANDARD_DISTANCES_MM = [5000, 7000, 10000, 15000, 20000, 25000] as const;
export const MIN_DISTANCE_MM = 1000;
export const MAX_DISTANCE_MM = 100000;

export const provisionalSkills: readonly ProvisionalSkill[] = [
  { id: "TEMP_TRIGGER_CONTROL", label: "Contrôle de la détente" },
  { id: "TEMP_GRIP", label: "Prise en main" },
  { id: "TEMP_SIGHT_ALIGNMENT", label: "Alignement des organes de visée" },
  { id: "TEMP_STABILITY", label: "Stabilité" },
] as const;

export type SessionValidationErrors = Partial<Record<keyof SessionDraft, string>>;

export function validateSessionDraft(draft: SessionDraft): SessionValidationErrors {
  const errors: SessionValidationErrors = {};
  if (!draft.shooterProfileId) errors.shooterProfileId = "Un profil actif est obligatoire.";
  if (!draft.weaponId) errors.weaponId = "Choisissez une arme.";
  if (!draft.targetTypeId) errors.targetTypeId = "Choisissez un type de cible.";
  if (draft.numberOfHands !== 1 && draft.numberOfHands !== 2) {
    errors.numberOfHands = "Le nombre de mains doit valoir 1 ou 2.";
  }
  if (
    draft.distanceMm === null ||
    !Number.isInteger(draft.distanceMm) ||
    draft.distanceMm < MIN_DISTANCE_MM ||
    draft.distanceMm > MAX_DISTANCE_MM
  ) {
    errors.distanceMm = "La distance doit être comprise entre 1 et 100 mètres.";
  }
  if (draft.mode === "training") {
    const hasLabel = Boolean(draft.objectiveLabel?.trim());
    const hasSkill = Boolean(draft.selectedSkillId);
    if (!hasLabel && !hasSkill) {
      errors.objectiveLabel = "Précisez un objectif ou choisissez une compétence.";
    }
  }
  return errors;
}

export function assertValidSnapshot(snapshot: SessionSnapshot): void {
  if (
    snapshot.shooterDisplayName.trim().length < 2 ||
    !snapshot.shooterLaterality ||
    snapshot.weaponName.trim().length === 0 ||
    snapshot.targetTypeName.trim().length === 0
  ) {
    throw new Error("Snapshot de séance incomplet.");
  }
}

export function formatDistance(distanceMm: number): string {
  return `${distanceMm / 1000} m`;
}
