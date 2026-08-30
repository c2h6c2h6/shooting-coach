import { confirmationTestCatalog } from "./confirmationTestCatalog";
import type { ConfirmationOutcome } from "./coachingTypes";
import type { HypothesisCode } from "./technicalHypothesisCatalog";

type ObservationMap = Readonly<Record<string, ConfirmationOutcome>>;

const directMappings: Readonly<Record<string, ObservationMap>> = {
  TEST_TRIGGER_FINGER_PLACEMENT: {
    "Pression dans l’axe sans déplacement visible": "does_not_support_hypothesis",
    "Déplacement répétitif selon le placement": "supports_hypothesis",
    "Aucune différence observable": "does_not_support_hypothesis",
  },
  TEST_ANTICIPATION_DRY: {
    "Aucune réaction anticipatrice observable": "does_not_support_hypothesis",
    "Abaissement anticipé reproductible": "supports_hypothesis",
    "Poussée anticipée reproductible": "supports_hypothesis",
    "Sursaut ou crispation anticipatrice reproductible": "supports_hypothesis",
    "Fermeture des yeux anticipatrice reproductible": "supports_hypothesis",
    "Autre réponse anticipatrice reproductible": "supports_hypothesis",
    "Résultat non observable ou ambigu": "inconclusive",
  },
  TEST_GRIP_CONSTANCY: {
    "Prise ressentie constante": "does_not_support_hypothesis",
    "Crispation croissante": "supports_hypothesis",
    "Pression variable": "supports_hypothesis",
    "Changement de placement": "supports_hypothesis",
  },
  TEST_TWO_HAND_CONTRIBUTION: {
    "Amélioration reproductible": "supports_hypothesis",
    "Dégradation reproductible": "supports_hypothesis",
    "Aucune différence observable": "does_not_support_hypothesis",
    "Résultat variable ou non interprétable": "inconclusive",
  },
  TEST_TRIGGER_HAND_INDEPENDENCE: {
    "Autres doigts sensiblement stables pendant l’action de l’index": "does_not_support_hypothesis",
    "Augmentation reproductible de leur action ou pression synchronisée avec l’index": "supports_hypothesis",
    "Relâchement reproductible synchronisé avec l’index": "supports_hypothesis",
    "Comportement variable ou non observable de manière fiable": "inconclusive",
  },
  TEST_WRIST_STABILITY: {
    "Organisation sensiblement stable": "does_not_support_hypothesis",
    "Flexion ou rupture parasite reproductible": "supports_hypothesis",
    "Variation irrégulière": "inconclusive",
    "Non observable de manière fiable": "not_observed",
  },
  TEST_RETURN_TO_LINE: {
    "Retour régulier et comparable": "does_not_support_hypothesis",
    "Retour variable d’un coup à l’autre": "supports_hypothesis",
    "Correction musculaire importante nécessaire": "supports_hypothesis",
    "Retour systématiquement décalé mais reproductible": "inconclusive",
    "Non observable de manière fiable": "not_observed",
  },
  TEST_VISUAL_FOCUS: {
    "Repère visuel constant": "does_not_support_hypothesis",
    "Focalisation changeante": "supports_hypothesis",
    "Perte du guidon au départ": "supports_hypothesis",
    "Non observable": "not_observed",
  },
  TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY: {
    "Alignement reproduit de manière comparable": "does_not_support_hypothesis",
    "Variation latérale reproductible de l’alignement": "supports_hypothesis",
    "Variation verticale reproductible de l’alignement": "supports_hypothesis",
    "Variation irrégulière ou non interprétable": "inconclusive",
    "Alignement non observable de manière fiable": "not_observed",
  },
  TEST_AIMING_DURATION: {
    "Stabilité conservée": "does_not_support_hypothesis",
    "Dégradation après plusieurs secondes": "supports_hypothesis",
    "Départ forcé": "supports_hypothesis",
  },
  TEST_NATURAL_POINT: {
    "Retour naturel vers la zone": "does_not_support_hypothesis",
    "Décalage répété": "supports_hypothesis",
    "Correction musculaire marquée": "supports_hypothesis",
  },
  TEST_SLOW_CONTROLLED_SERIES: {
    "Qualité stable": "does_not_support_hypothesis",
    "Dégradation en fin de série": "supports_hypothesis",
    "Amélioration à cadence lente": "supports_hypothesis",
  },
  TEST_REGULAR_CADENCE: {
    "Cadence et qualité stables": "does_not_support_hypothesis",
    "Précipitation": "supports_hypothesis",
    "Pauses irrégulières": "supports_hypothesis",
  },
  TEST_DUMMY_ROUND_SUPERVISED: {
    "Mouvement observé sur cartouche inerte": "supports_hypothesis",
    "Aucun mouvement": "does_not_support_hypothesis",
    "Résultat non observable": "not_observed",
  },
  TEST_EQUIPMENT_CONTEXT_CHECK: {
    "Configuration cohérente": "does_not_support_hypothesis",
    "Écart entre saisie et conditions réelles": "supports_hypothesis",
    "Point visé différent de celui supposé": "supports_hypothesis",
    "Doute sur le réglage ou le matériel": "weakly_supports_hypothesis",
    "Vérification qualifiée nécessaire": "inconclusive",
    "Résultat non concluant": "inconclusive",
  },
};

function sightStabilityOutcome(
  hypothesisCode: HypothesisCode,
  observation: string,
): ConfirmationOutcome | null {
  if (observation === "Guidon stable") return "does_not_support_hypothesis";
  if (observation === "Résultat non observable") return "not_observed";
  if (observation === "Mouvement variable") {
    return hypothesisCode === "INCONSISTENT_TRIGGER_PRESS"
      ? "supports_hypothesis"
      : "weakly_supports_hypothesis";
  }
  if (observation === "Mouvement latéral répétitif") {
    return hypothesisCode === "LATERAL_TRIGGER_PRESSURE" || hypothesisCode === "ABRUPT_TRIGGER_PRESS"
      ? "supports_hypothesis"
      : "weakly_supports_hypothesis";
  }
  if (observation === "Mouvement vertical") {
    return hypothesisCode === "ABRUPT_TRIGGER_PRESS"
      ? "supports_hypothesis"
      : "weakly_supports_hypothesis";
  }
  return null;
}

export function outcomeForTestObservation(
  testCode: string,
  hypothesisCode: HypothesisCode,
  observation: string,
): ConfirmationOutcome {
  const test = confirmationTestCatalog.find((item) => item.code === testCode);
  if (!test) throw new Error(`Test de confirmation inconnu : ${testCode}.`);
  if (!test.hypothesisCodes.includes(hypothesisCode)) {
    throw new Error(`L’hypothèse ${hypothesisCode} n’est pas couverte par ${testCode}.`);
  }
  if (!test.observationCriteria.includes(observation)) {
    throw new Error(`Observation non prévue pour ${testCode} : ${observation}.`);
  }
  const outcome = testCode === "TEST_SIGHT_STABILITY_DRY"
    ? sightStabilityOutcome(hypothesisCode, observation)
    : directMappings[testCode]?.[observation] ?? null;
  if (!outcome || !test.possibleOutcomes.includes(outcome)) {
    throw new Error(`Aucun statut de preuve valide pour ${testCode} / ${observation}.`);
  }
  return outcome;
}
