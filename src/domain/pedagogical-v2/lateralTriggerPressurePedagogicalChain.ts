import type {ConfirmationOutcome,TransferState} from "../coachingTypes";
import type {TechnicalObservationControlDefinition} from "../technicalObservationControl";

const common={mode:"technical_observation" as const,competenceId:"competence-d2",competenceCode:"D2",
 competenceName:"Appliquer une pression directionnellement neutre sur la détente",catalogVersion:"pedagogical-reference-d-v1",
 knownLimitations:["Le résultat en cible ne constitue pas la preuve causale de la compétence.",
  "Cette évaluation ne produit ni décision pédagogique automatique ni promotion de maîtrise."]};

export const d2LateralAcquisitionTechnicalControl:TechnicalObservationControlDefinition={...common,
 definitionCode:"CONTROL-D2-01",exerciseDefinitionId:"exercise-d2-lateral-acquisition-01",exerciseCode:"EX-D2-01",
 exerciseName:"Reproduire une action de détente directionnellement neutre",requiresDryFire:true,
 exerciseInstructions:["Préparer une zone à sec.","Répéter l’action sur la détente en observant directement l’orientation de l’arme.","Rechercher l’absence reproductible de déplacement latéral synchronisé."],
 protocol:["Effectuer plusieurs actions à sec dans les mêmes conditions de sécurité.","Lors de l’action sur la détente, observer si un déplacement latéral synchronisé de l’arme est reproductible."],
 observationCriteria:[
  {code:"lateral_absent",label:"Absence reproductible de déplacement latéral",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"lateral_reproducible",label:"Déplacement latéral reproductible",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"lateral_inconclusive",label:"Observation non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ]};

export const d2LateralTransferTechnicalControl:TechnicalObservationControlDefinition={...common,
 definitionCode:"CONTROL-D2-02",exerciseDefinitionId:"exercise-d2-lateral-transfer-02",exerciseCode:"EX-D2-02",
 exerciseName:"Conserver une action directionnellement neutre en tir réel",requiresLiveFire:true,
 exerciseInstructions:["Au stand autorisé, réaliser plusieurs départs réels en conservant l’organisation acquise à sec.","Observer l’action sur la détente sans transformer les impacts en preuve technique."],
 protocol:["Pendant le tir réel, observer si l’action sur la détente reste sans déplacement latéral reproductible synchronisé.","La géométrie en cible peut être enregistrée mais ne conclut pas à elle seule."],
 observationCriteria:[
  {code:"lateral_neutral_live",label:"Neutralité latérale reproductible observée en tir réel",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"lateral_reproducible_live",label:"Déplacement latéral reproductible observé en tir réel",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"lateral_live_inconclusive",label:"Observation live non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ]};

export const lateralTriggerPressurePedagogicalChain={hypothesisCode:"LATERAL_TRIGGER_PRESSURE",confirmationTestCode:"TEST_TRIGGER_FINGER_PLACEMENT",
 competenceId:"competence-d2",pedagogicalTechniqueId:"technique-d2-lateral-pressure-01",acquisitionExerciseDefinitionId:"exercise-d2-lateral-acquisition-01",
 acquisitionDrillCode:"DRILL_D2_LATERAL_ACQUISITION",acquisitionControl:d2LateralAcquisitionTechnicalControl,
 transferExerciseDefinitionId:"exercise-d2-lateral-transfer-02",transferDrillCode:"DRILL_D2_LATERAL_TRANSFER",transferControl:d2LateralTransferTechnicalControl} as const;

export function lateralTransferState():TransferState{return{acquisitionControlCompleted:false,acquisitionOutcome:null,acquisitionEvaluation:null,
 transferRequired:true,transferDrillCode:lateralTriggerPressurePedagogicalChain.transferDrillCode,
 transferControlCode:lateralTriggerPressurePedagogicalChain.transferControl.definitionCode,transferStatus:"pending",transferOutcome:null};}

export function lateralTriggerPressureInterventionForOutcome(outcome:ConfirmationOutcome){return outcome==="supports_hypothesis"||outcome==="weakly_supports_hypothesis"
 ?{chain:lateralTriggerPressurePedagogicalChain,transferState:lateralTransferState()}:null;}
