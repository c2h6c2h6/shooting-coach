import type {ConfirmationOutcome} from "../coachingTypes";
import type {TechnicalObservationControlDefinition} from "../technicalObservationControl";
import type {PedagogicalChainBinding} from "./twoHandContributionPedagogicalBinding";

export const sightAlignmentTechnicalControl:TechnicalObservationControlDefinition={
 mode:"technical_observation",definitionCode:"CONTROL-C1-ALIGNMENT-01",competenceId:"competence:C1",competenceCode:"C1",
 competenceName:"Construire l’alignement des organes de visée",catalogVersion:"pedagogical-reference-c-v1",
 exerciseDefinitionId:"exercise:C1:01",exerciseCode:"EX-C1-01",exerciseName:"Reconstruire le même alignement",
 exerciseInstructions:["Quitter volontairement la visée puis la reconstruire plusieurs fois.",
  "Comparer directement la relation géométrique entre les organes de visée."],
 protocol:["Répéter plusieurs reconstructions après l’exercice dans les mêmes conditions de sécurité.",
  "Observer la reproductibilité géométrique sans utiliser les impacts comme preuve."],
 observationCriteria:[
  {code:"alignment_reproducible",label:"Alignement désormais reproductible",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"alignment_improved",label:"Amélioration mais variation encore présente",outcome:"mixed_result",evidenceEffect:"strengthens",evidenceStrength:.5},
  {code:"alignment_comparable",label:"Variation comparable à avant",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"variable_or_inconclusive",label:"Résultat variable ou non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ],
 knownLimitations:["Le contrôle évalue la reproductibilité géométrique, pas le focus visuel.",
  "Le résultat en cible ne constitue pas la preuve principale.",
  "Cette évaluation ne produit ni décision pédagogique automatique ni promotion de maîtrise."],
};

export const sightAlignmentPedagogicalBinding:PedagogicalChainBinding={
 hypothesisCode:"SIGHT_ALIGNMENT_VARIATION",confirmationTestCode:"TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY",
 competenceId:"competence:C1",pedagogicalTechniqueId:"technique:C1:01",
 recommendationCode:"REC_SIGHT_ALIGNMENT_REPRODUCIBILITY",trainingDrillCode:"DRILL_SIGHT_ALIGNMENT_RECONSTRUCTION",
 exerciseDefinitionId:"exercise:C1:01",controlObjective:"consistency",
};

export function sightAlignmentInterventionForOutcome(outcome:ConfirmationOutcome){
 return outcome==="supports_hypothesis"||outcome==="weakly_supports_hypothesis"
  ?{binding:sightAlignmentPedagogicalBinding,control:sightAlignmentTechnicalControl}:null;
}
