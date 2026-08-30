import type { ConfirmationOutcome } from "../coachingTypes";
import type { TechnicalObservationControlDefinition } from "../technicalObservationControl";
import type { PedagogicalChainBinding } from "./twoHandContributionPedagogicalBinding";

export const e1AnticipationTechnicalControl: TechnicalObservationControlDefinition = {
  mode: "technical_observation", definitionCode: "CONTROL-E1-ANTICIPATION-01", competenceId: "competence-e1",
  competenceCode: "E1", competenceName: "Accepter le départ sans réponse anticipatrice", catalogVersion: "pedagogical-reference-e-v1",
  exerciseDefinitionId: "exercise-e1-01", exerciseCode: "EX-E1-01", exerciseName: "Laisser partir sans anticiper",
  exerciseInstructions: ["Produire l’action normale sans chercher à provoquer l’instant du départ.", "Observer directement l’absence de réponse anticipatrice."],
  protocol: ["Répéter le protocole de départ attendu non produit après l’exercice.", "Observer la chronologie sans utiliser les impacts comme preuve."],
  observationCriteria: [
    { code: "anticipation_absent", label: "Aucune réponse anticipatrice désormais observable", outcome: "objective_improved", evidenceEffect: "strengthens", evidenceStrength: 1 },
    { code: "anticipation_reduced", label: "Réponse encore présente mais diminuée", outcome: "mixed_result", evidenceEffect: "strengthens", evidenceStrength: .5 },
    { code: "anticipation_comparable", label: "Réponse comparable à avant", outcome: "objective_stable", evidenceEffect: "neutral", evidenceStrength: 0 },
    { code: "variable_or_ambiguous", label: "Résultat variable ou non interprétable", outcome: "insufficient_data", evidenceEffect: "neutral", evidenceStrength: 0 },
  ],
  knownLimitations: ["Le contrôle évalue la chronologie d’une réponse motrice, pas la géométrie des impacts.", "Une réponse uniquement postérieure au départ réel ne suffit pas à caractériser E1.", "Cette évaluation ne produit ni décision pédagogique automatique ni promotion de maîtrise."],
};

export const e1AnticipationPedagogicalBinding: PedagogicalChainBinding = {
  hypothesisCode: "SHOT_ANTICIPATION", confirmationTestCode: "TEST_ANTICIPATION_DRY", competenceId: "competence-e1",
  pedagogicalTechniqueId: "technique-e1-01", recommendationCode: "REC_ANTICIPATION", trainingDrillCode: "DRILL_ACCEPT_DEPARTURE_E1",
  exerciseDefinitionId: "exercise-e1-01", controlObjective: "consistency",
};

export function e1AnticipationInterventionForOutcome(outcome: ConfirmationOutcome) {
  return outcome === "supports_hypothesis" || outcome === "weakly_supports_hypothesis"
    ? { binding: e1AnticipationPedagogicalBinding, control: e1AnticipationTechnicalControl } : null;
}
