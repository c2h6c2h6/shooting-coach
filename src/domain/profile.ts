export type Laterality = "right" | "left";
export type DeclaredLevel = "beginner" | "intermediate" | "advanced";
export type SupportedWeapon = "glock-19" | "glock-48" | "glock-43x";

export interface ShooterProfileDraft {
  displayName: string;
  laterality: Laterality | null;
  declaredLevel: DeclaredLevel;
  primaryWeapon: SupportedWeapon;
}

export interface ShooterProfile extends Omit<ShooterProfileDraft, "laterality"> {
  id: string;
  laterality: Laterality;
  createdAt: string;
  updatedAt: string;
}

export const lateralityLabels: Record<Laterality, string> = {
  right: "Droitier",
  left: "Gaucher",
};

export const levelLabels: Record<DeclaredLevel, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

export const weaponLabels: Record<SupportedWeapon, string> = {
  "glock-19": "Glock 19",
  "glock-48": "Glock 48",
  "glock-43x": "Glock 43X",
};

export type ProfileValidationErrors = Partial<
  Record<keyof ShooterProfileDraft, string>
>;

export function validateProfile(
  draft: ShooterProfileDraft,
): ProfileValidationErrors {
  const errors: ProfileValidationErrors = {};
  if (draft.displayName.trim().length < 2) {
    errors.displayName = "Saisissez au moins 2 caractères.";
  }
  if (!draft.laterality) {
    errors.laterality = "La latéralité est obligatoire pour toute analyse.";
  }
  return errors;
}
