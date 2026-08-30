export const OBSERVATION_RULESET_VERSION = "observation-rules-v1";

export const observationCodes = [
  "CENTERED", "OFFSET_LEFT", "OFFSET_RIGHT", "OFFSET_HIGH", "OFFSET_LOW",
  "OFFSET_HIGH_LEFT", "OFFSET_HIGH_RIGHT", "OFFSET_LOW_LEFT", "OFFSET_LOW_RIGHT",
  "OFFSET_DIRECTION_UNCERTAIN",
  "COMPACT_GROUP", "WIDE_GROUP", "HORIZONTAL_SPREAD", "VERTICAL_SPREAD",
  "TWO_AXIS_SPREAD", "SHAPE_UNDETERMINED",
  "COMPACT_BUT_OFFSET", "CENTERED_BUT_DISPERSED", "CENTERED_AND_COMPACT",
  "OFFSET_AND_DISPERSED",
  "INSUFFICIENT_IMPACTS", "MANUAL_INPUT_LIMITATION", "OUTLIER_TO_VERIFY",
  "EXCLUDED_IMPACTS_PRESENT", "SHOT_COUNT_MISMATCH", "MEASUREMENT_LIMITED",
  "TARGET_GEOMETRY_UNVERIFIED",
  "CENTER_MOVED_CLOSER", "CENTER_MOVED_FARTHER", "CENTER_POSITION_STABLE",
  "GROUP_TIGHTER", "GROUP_WIDER", "DISPERSION_STABLE",
  "HORIZONTAL_SPREAD_REDUCED", "HORIZONTAL_SPREAD_INCREASED",
  "VERTICAL_SPREAD_REDUCED", "VERTICAL_SPREAD_INCREASED", "SHAPE_CHANGED",
  "NO_NOTABLE_CHANGE", "COMPARISON_LIMITED",
] as const;

export type ObservationCode = typeof observationCodes[number];
export type ObservationCategory = "centering" | "dispersion_shape" | "combined" | "data_quality" | "evolution";

export const categoryByCode: Record<ObservationCode, ObservationCategory> = Object.fromEntries(
  observationCodes.map((code) => [code,
    code.startsWith("CENTER_") || code.startsWith("GROUP_") || code.includes("_REDUCED") ||
    code.includes("_INCREASED") || code === "SHAPE_CHANGED" || code === "NO_NOTABLE_CHANGE" ||
    code === "COMPARISON_LIMITED" ? "evolution"
      : code.startsWith("OFFSET_") || code === "CENTERED" ? "centering"
      : ["COMPACT_GROUP", "WIDE_GROUP", "HORIZONTAL_SPREAD", "VERTICAL_SPREAD",
        "TWO_AXIS_SPREAD", "SHAPE_UNDETERMINED"].includes(code) ? "dispersion_shape"
      : ["COMPACT_BUT_OFFSET", "CENTERED_BUT_DISPERSED", "CENTERED_AND_COMPACT",
        "OFFSET_AND_DISPERSED"].includes(code) ? "combined" : "data_quality",
  ]),
) as Record<ObservationCode, ObservationCategory>;

export const observationLabelsFr: Record<ObservationCode, string> = {
  CENTERED: "Le centre du groupement est proche du centre de la cible.",
  OFFSET_LEFT: "Le centre du groupement est décalé vers la gauche.",
  OFFSET_RIGHT: "Le centre du groupement est décalé vers la droite.",
  OFFSET_HIGH: "Le centre du groupement est décalé vers le haut.",
  OFFSET_LOW: "Le centre du groupement est décalé vers le bas.",
  OFFSET_HIGH_LEFT: "Le centre du groupement est décalé vers le haut et la gauche.",
  OFFSET_HIGH_RIGHT: "Le centre du groupement est décalé vers le haut et la droite.",
  OFFSET_LOW_LEFT: "Le centre du groupement est décalé vers le bas et la gauche.",
  OFFSET_LOW_RIGHT: "Le centre du groupement est décalé vers le bas et la droite.",
  OFFSET_DIRECTION_UNCERTAIN: "Le décalage est proche du seuil et sa direction reste incertaine.",
  COMPACT_GROUP: "Le groupement est resserré.",
  WIDE_GROUP: "Le groupement présente une dispersion importante.",
  HORIZONTAL_SPREAD: "Le groupement est principalement étendu horizontalement.",
  VERTICAL_SPREAD: "Le groupement est principalement étendu verticalement.",
  TWO_AXIS_SPREAD: "Le groupement est étendu dans les deux axes.",
  SHAPE_UNDETERMINED: "Les données sont insuffisantes pour décrire la forme du groupement.",
  COMPACT_BUT_OFFSET: "Le groupement est resserré, mais reste éloigné du centre.",
  CENTERED_BUT_DISPERSED: "Le groupement est centré, mais reste dispersé.",
  CENTERED_AND_COMPACT: "Le groupement est centré et resserré.",
  OFFSET_AND_DISPERSED: "Le groupement est décentré et dispersé.",
  INSUFFICIENT_IMPACTS: "Les données sont insuffisantes pour produire toutes les observations géométriques.",
  MANUAL_INPUT_LIMITATION: "Les impacts ont été placés manuellement.",
  OUTLIER_TO_VERIFY: "Un impact est nettement éloigné des autres et mérite d’être vérifié.",
  EXCLUDED_IMPACTS_PRESENT: "Un ou plusieurs impacts sont exclus des mesures.",
  SHOT_COUNT_MISMATCH: "Le nombre d’impacts ne correspond pas au nombre de coups déclaré.",
  MEASUREMENT_LIMITED: "Certaines mesures ne sont pas disponibles.",
  TARGET_GEOMETRY_UNVERIFIED: "La géométrie physique de la cible n’est pas vérifiée.",
  CENTER_MOVED_CLOSER: "Le centre du groupement se rapproche du centre par rapport à la série de référence.",
  CENTER_MOVED_FARTHER: "Le centre du groupement s’éloigne du centre par rapport à la série de référence.",
  CENTER_POSITION_STABLE: "La distance du centre du groupement au centre de la cible reste proche.",
  GROUP_TIGHTER: "Le groupement est plus resserré.",
  GROUP_WIDER: "Le groupement est plus étendu.",
  DISPERSION_STABLE: "La dispersion reste proche.",
  HORIZONTAL_SPREAD_REDUCED: "La largeur du groupement diminue.",
  HORIZONTAL_SPREAD_INCREASED: "La largeur du groupement augmente.",
  VERTICAL_SPREAD_REDUCED: "La hauteur du groupement diminue.",
  VERTICAL_SPREAD_INCREASED: "La hauteur du groupement augmente.",
  SHAPE_CHANGED: "La forme géométrique du groupement a changé.",
  NO_NOTABLE_CHANGE: "Aucun changement géométrique notable n’est observé.",
  COMPARISON_LIMITED: "La comparaison est limitée par les données disponibles.",
};
