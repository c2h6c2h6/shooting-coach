export const APP_OPENING_INITIAL_HOLD_MS = 1_200;
export const APP_OPENING_SPLIT_FLAP_DURATION_MS = 1_310;
export const APP_OPENING_FINAL_HOLD_MS = 1_200;
export const APP_OPENING_ANIMATION_DURATION_MS =
  APP_OPENING_INITIAL_HOLD_MS
  + APP_OPENING_SPLIT_FLAP_DURATION_MS
  + APP_OPENING_FINAL_HOLD_MS;

export const APP_OPENING_BRAND = "C2H6 / ACDC";

export const APP_OPENING_BRAND_CHARACTERS = ["C", "2", "H", "6", "/", "A", "C", "D", "C"] as const;

export const APP_OPENING_SPLIT_FLAP_SEQUENCES = [
  ["C", "7", "R", "N", "F", "A"],
  ["2", "9", "E", "4", "P", "C"],
  ["H", "3", "K", "8", "B", "D"],
  ["6", "0", "T", "5", "M", "C"],
] as const;

export interface OpeningSafetyRule {
  readonly keyword: "Arme" | "Canon" | "Doigt" | "Cible";
  readonly statement: string;
}

export const APP_OPENING_SAFETY_RULES: readonly OpeningSafetyRule[] = [
  { keyword: "Arme", statement: "Une arme est toujours chargée" },
  { keyword: "Canon", statement: "Vers la cible ou la zone la plus sûre" },
  { keyword: "Doigt", statement: "Doigt haut tant que je ne tire pas" },
  { keyword: "Cible", statement: "Je suis responsable de mon tir et de ses conséquences" },
] as const;
