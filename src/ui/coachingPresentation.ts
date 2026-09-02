import type {
  CoachingObjective,
  ConfirmationOutcome,
  ConfirmationTestDefinition,
  TechnicalObservationControlSnapshot,
  TrainingDrill,
} from "../domain/coachingTypes";
import type { HypothesisCode } from "../domain/technicalHypothesisCatalog";
import { technicalHypothesisCatalog } from "../domain/technicalHypothesisCatalog";

interface HypothesisPresentation {
  title: string;
  explanation: string;
}

interface TestPresentation {
  why: string;
  instructions: string[];
  observationQuestion: string;
}

interface DrillPresentation {
  title: string;
  objective: string;
  instructions: string[];
  successCriterion: string;
}

/** Projects the selected technical control without inferring a competence from its mode. */
export function presentTechnicalControlTitle(control: Pick<TechnicalObservationControlSnapshot, "exerciseName" | "competenceName"> | null | undefined): string {
  return control?.exerciseName?.trim() || control?.competenceName?.trim() || "Observation technique";
}

const objectiveLabels: Record<CoachingObjective, string> = {
  dispersion: "Rendre le groupement plus régulier.",
  centering: "Rapprocher durablement le groupement de la zone visée.",
  horizontal_stability: "Déclencher sans provoquer de déplacement visible des organes de visée.",
  vertical_stability: "Conserver la stabilité verticale des organes de visée au départ.",
  consistency: "Reproduire une action régulière d’un départ à l’autre.",
};

const hypothesisOverrides: Partial<Record<HypothesisCode, HypothesisPresentation>> = {
  ABRUPT_TRIGGER_PRESS: {
    title: "Action brusque sur la détente",
    explanation: "Une action trop brusque sur la détente peut provoquer un déplacement de l’arme au moment du départ.",
  },
};

export function presentHypothesis(code: HypothesisCode): HypothesisPresentation {
  const definition = technicalHypothesisCatalog[code];
  return hypothesisOverrides[code] ?? {
    title: definition.titleFr,
    explanation: definition.cautiousStatementFr,
  };
}

export function presentConfirmationTest(test: ConfirmationTestDefinition): TestPresentation {
  if (test.code === "TEST_SIGHT_STABILITY_DRY") {
    return {
      why: "Ce test permet de vérifier si l’action sur la détente provoque un mouvement visible de l’arme au moment du départ.",
      instructions: [
        "Préparez l’arme pour un travail à sec dans les conditions de sécurité prévues.",
        "Prenez votre visée normalement.",
        "Effectuez 5 départs à sec, sans chercher la vitesse.",
        "Observez uniquement le guidon au moment du départ.",
      ],
      observationQuestion: "Le guidon reste-t-il stable ou se déplace-t-il au moment du départ ?",
    };
  }
  if (test.code === "TEST_GRIP_CONSTANCY") {
    return {
      why: "Vérifier si la prise change entre les répétitions.",
      instructions: [
        "Prenez l’arme normalement.",
        "Effectuez plusieurs répétitions sans chercher à corriger volontairement la prise.",
        "Observez uniquement si la sensation ou le placement de la prise change d’une répétition à l’autre.",
      ],
      observationQuestion: "La prise reste-t-elle réellement constante entre les répétitions ?",
    };
  }
  if (test.code === "TEST_EQUIPMENT_CONTEXT_CHECK") {
    return {
      why: "Avant d’attribuer un décalage régulier à la technique du tireur, vérifiez que les conditions et la configuration correspondent bien à ce qui est attendu.",
      instructions: test.instructions,
      observationQuestion: "La configuration réelle correspond-elle aux conditions et aux données attendues ?",
    };
  }
  return {
    why: test.objective,
    instructions: test.instructions,
    observationQuestion: "Qu’avez-vous observé pendant le test ?",
  };
}

export function presentOutcome(outcome: ConfirmationOutcome, testCode?: string): string {
  if (testCode === "TEST_EQUIPMENT_CONTEXT_CHECK") {
    const configurationTexts: Record<ConfirmationOutcome, string> = {
      supports_hypothesis: "Un écart de configuration a été identifié. Il peut contribuer au décalage observé.",
      weakly_supports_hypothesis: "Un élément de configuration mérite d’être vérifié davantage, sans permettre de conclure à ce stade.",
      does_not_support_hypothesis: "Aucun écart évident de configuration n’a été identifié. La piste matérielle est moins soutenue et une cause technique peut être examinée davantage.",
      contradicts_hypothesis: "Les éléments vérifiés ne soutiennent pas une explication par la configuration dans les conditions observées.",
      inconclusive: "Le résultat ne permet pas de conclure sans vérification qualifiée du matériel ou du réglage.",
      not_observed: "Les éléments nécessaires à la vérification de configuration n’ont pas pu être observés suffisamment.",
    };
    return configurationTexts[outcome];
  }
  const texts: Record<ConfirmationOutcome, string> = {
    supports_hypothesis: "Le test suggère que l’action observée peut provoquer un déplacement de l’arme. Cette hypothèse est renforcée, sans être confirmée définitivement.",
    weakly_supports_hypothesis: "Le test apporte un indice limité en faveur de cette hypothèse, sans permettre de la confirmer.",
    does_not_support_hypothesis: "Le résultat observé ne soutient pas cette hypothèse et la rend moins probable dans les conditions du test.",
    contradicts_hypothesis: "Le résultat observé est contradictoire avec cette hypothèse dans les conditions du test.",
    inconclusive: "Le test ne permet pas de départager suffisamment les hypothèses.",
    not_observed: "Aucun résultat suffisamment observable n’a été obtenu pendant ce test.",
  };
  return texts[outcome];
}

/** Short, action-oriented wording for the coaching screen; the detailed wording remains available on demand. */
export function presentCoachingOutcome(
  outcome: ConfirmationOutcome,
  testCode?: string,
  hypothesisCode?: HypothesisCode,
): string {
  if (testCode === "TEST_EQUIPMENT_CONTEXT_CHECK") {
    const equipmentTexts: Record<ConfirmationOutcome, string> = {
      supports_hypothesis: "Un problème de visée / matériel reste possible.",
      weakly_supports_hypothesis: "Un problème de visée / matériel reste possible.",
      does_not_support_hypothesis: "Rien d’anormal côté visée / matériel. La piste matériel est peu probable.",
      contradicts_hypothesis: "La piste matériel est peu probable.",
      inconclusive: "Impossible de conclure.",
      not_observed: "Impossible de conclure.",
    };
    return equipmentTexts[outcome];
  }
  const title = hypothesisCode ? presentHypothesis(hypothesisCode).title : null;
  if (title) {
    const namedTexts: Record<ConfirmationOutcome, string> = {
      supports_hypothesis: `${title} reste possible.`,
      weakly_supports_hypothesis: `${title} reste possible.`,
      does_not_support_hypothesis: `${title} est peu probable.`,
      contradicts_hypothesis: `${title} est peu probable.`,
      inconclusive: `${title} : résultat non concluant.`,
      not_observed: `${title} : résultat non concluant.`,
    };
    return namedTexts[outcome];
  }
  const texts: Record<ConfirmationOutcome, string> = {
    supports_hypothesis: "Le résultat reste compatible avec la piste testée.",
    weakly_supports_hypothesis: "Le résultat reste compatible avec la piste testée.",
    does_not_support_hypothesis: "La piste testée est peu probable.",
    contradicts_hypothesis: "La piste testée est peu probable.",
    inconclusive: "Résultat non concluant pour la piste testée.",
    not_observed: "Résultat non concluant pour la piste testée.",
  };
  return texts[outcome];
}

export function presentDrill(drill: TrainingDrill): DrillPresentation {
  if (drill.code === "DRILL_DRY_CONTROLLED_RELEASES") {
    return {
      title: drill.title,
      objective: objectiveLabels[drill.objective],
      instructions: [
        "Effectuez 5 départs à sec en maintenant une action progressive et continue sur la détente.",
        "Cherchez à garder le guidon stable jusqu’au départ.",
      ],
      successCriterion: "Réussite : le guidon reste stable pendant au moins 4 départs sur 5.",
    };
  }
  if (drill.code === "DRILL_EQUIPMENT_CONTROL") {
    return {
      title: drill.title,
      objective: "Vérifier si le décalage se reproduit après avoir confirmé la configuration.",
      instructions: drill.executionSteps,
      successCriterion: drill.successCriteria[0],
    };
  }
  if (drill.code === "DRILL_CONSTANT_GRIP") {
    return {
      title: "Reproduire la même prise",
      objective: "Retrouver une pression et un placement de prise comparables d’une répétition à l’autre.",
      instructions: [
        "Prenez l’arme avec votre prise habituelle.",
        "Réalisez une série de 5 coups en cherchant à retrouver, avant chaque départ, un placement et une sensation de pression comparables, sans augmenter progressivement la force.",
      ],
      successCriterion: "Réussite : la prise est ressentie comparable sur au moins 4 répétitions sur 5.",
    };
  }
  return {
    title: drill.title,
    objective: objectiveLabels[drill.objective],
    instructions: drill.executionSteps,
    successCriterion: `Réussite : ${drill.successCriteria[0]}`,
  };
}
