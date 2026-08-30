import type {ConfirmationOutcome} from "../coachingTypes";
import type {TechnicalObservationControlDefinition} from "../technicalObservationControl";
import type {PedagogicalChainBinding} from "./twoHandContributionPedagogicalBinding";

const common={mode:"technical_observation" as const,competenceId:"competence:B6",competenceCode:"B6",
 competenceName:"Organiser et stabiliser les poignets",catalogVersion:"pedagogical-reference-ab-v1",
 knownLimitations:["Le contrôle repose sur une observation technique directe.",
  "Le recul et le mouvement normal de l’arme ne constituent pas en eux-mêmes une faute.",
  "Cette évaluation ne produit ni décision pédagogique automatique ni promotion de maîtrise."]};

export const wristOrganizationTechnicalControl:TechnicalObservationControlDefinition={...common,
 definitionCode:"CONTROL-B6-WRIST-ORGANIZATION-01",exerciseDefinitionId:"exercise:B6:01",exerciseCode:"EX-B6-01",
 exerciseName:"Reproduire l’organisation du poignet",
 exerciseInstructions:["Installer une organisation fonctionnelle du poignet sans rigidité excessive.",
  "Répéter plusieurs actions comparables sans chercher à bloquer le mouvement normal de l’arme."],
 protocol:["Répéter le protocole dans des conditions comparables.","Observer directement l’organisation du poignet."],
 observationCriteria:[
  {code:"wrist_stable",label:"Organisation désormais stable",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"break_reduced",label:"Rupture encore présente mais diminuée",outcome:"mixed_result",evidenceEffect:"strengthens",evidenceStrength:.5},
  {code:"break_comparable",label:"Rupture comparable à avant",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"variable_or_inconclusive",label:"Résultat variable ou non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ]};

export const returnToLineTechnicalControl:TechnicalObservationControlDefinition={...common,
 definitionCode:"CONTROL-B6-RETURN-TO-LINE-01",exerciseDefinitionId:"exercise:B6:02",exerciseCode:"EX-B6-02",
 exerciseName:"Reproduire un retour en ligne cohérent",
 exerciseInstructions:["Conserver l’organisation fonctionnelle du poignet et laisser le recul se produire.",
  "Observer plusieurs retours sans correction volontaire excessive."],
 protocol:["Réaliser plusieurs répétitions comparables.","Observer directement la reproductibilité du retour en ligne."],
 observationCriteria:[
  {code:"return_regular",label:"Retour devenu régulier et comparable",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"return_improved",label:"Retour amélioré mais encore variable",outcome:"mixed_result",evidenceEffect:"strengthens",evidenceStrength:.5},
  {code:"return_comparable",label:"Retour comparable à avant",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"variable_or_inconclusive",label:"Résultat variable ou non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ]};

export const wristPedagogicalBindings:readonly PedagogicalChainBinding[]=[
 {hypothesisCode:"WRIST_INSTABILITY",confirmationTestCode:"TEST_WRIST_STABILITY",competenceId:"competence:B6",
  pedagogicalTechniqueId:"technique:B6:01",recommendationCode:"REC_WRIST_ORGANIZATION",
  trainingDrillCode:"DRILL_WRIST_ORGANIZATION",exerciseDefinitionId:"exercise:B6:01",controlObjective:"consistency"},
 {hypothesisCode:"POOR_RECOIL_RETURN",confirmationTestCode:"TEST_RETURN_TO_LINE",competenceId:"competence:B6",
  pedagogicalTechniqueId:"technique:B6:01",recommendationCode:"REC_RETURN_TO_LINE",
  trainingDrillCode:"DRILL_RETURN_TO_LINE",exerciseDefinitionId:"exercise:B6:02",controlObjective:"consistency"},
];

export function wristInterventionForOutcome(hypothesisCode:string,outcome:ConfirmationOutcome){
 if(outcome!=="supports_hypothesis"&&outcome!=="weakly_supports_hypothesis")return null;
 if(hypothesisCode==="WRIST_INSTABILITY")return{binding:wristPedagogicalBindings[0],control:wristOrganizationTechnicalControl};
 if(hypothesisCode==="POOR_RECOIL_RETURN")return{binding:wristPedagogicalBindings[1],control:returnToLineTechnicalControl};
 return null;
}
