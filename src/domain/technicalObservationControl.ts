import type {CoachingCycle,CoachingOutcome,TechnicalObservationControlSnapshot} from "./coachingTypes";
import {PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,type EvidenceEffect,type PedagogicalEvidence} from "./pedagogical-v2/contracts";
import {PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,type CompetenceEvaluation} from "./pedagogical-v2/inputContracts";
import type {PedagogicalReferenceSnapshot} from "./pedagogical-v2/decisionContracts";

export type TechnicalObservationControlDefinition=TechnicalObservationControlSnapshot;

export const d2TriggerHandTechnicalControl:TechnicalObservationControlDefinition={
 mode:"technical_observation",definitionCode:"CONTROL-D2-INDEPENDENCE-01",competenceId:"competence-d2",
 competenceCode:"D2",competenceName:"Appliquer une pression directionnellement neutre sur la détente",
 exerciseDefinitionId:"exercise-d2-index-hand-independence-01",
 exerciseCode:"EX-D2-INDEPENDENCE-01",exerciseName:"Index indépendant",catalogVersion:"pedagogical-reference-d-v1",
 exerciseInstructions:["Installer la prise normalement.","Réaliser plusieurs actions contrôlées de l’index.",
  "Maintenir l’organisation des autres doigts aussi constante que possible."],
 protocol:["Répéter plusieurs actions contrôlées de l’index après l’exercice, dans les mêmes conditions de sécurité.",
  "Observer directement les autres doigts de la main qui tient l’arme."],
 observationCriteria:[
  {code:"fingers_stable",label:"Autres doigts désormais sensiblement stables",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
  {code:"coactivation_reduced",label:"Co-activation encore présente mais diminuée",outcome:"mixed_result",evidenceEffect:"strengthens",evidenceStrength:.5},
  {code:"coactivation_comparable",label:"Co-activation comparable à avant",outcome:"objective_stable",evidenceEffect:"neutral",evidenceStrength:0},
  {code:"variable_or_inconclusive",label:"Résultat variable ou non interprétable",outcome:"insufficient_data",evidenceEffect:"neutral",evidenceStrength:0},
 ],
 knownLimitations:["Le résultat repose sur une observation technique directe dans les conditions du contrôle.",
  "Cette évaluation ne produit ni décision pédagogique définitive ni promotion automatique de maîtrise."],
};

export function controlModeForCycle(cycle:CoachingCycle){
 return cycle.controlMode??"series_comparison";
}

export function prepareTechnicalObservationControl(cycle:CoachingCycle,definition:TechnicalObservationControlDefinition):CoachingCycle {
 return {...cycle,status:"evaluation_pending",controlMode:"technical_observation",controlSeriesId:null,
  technicalControl:definition,competenceEvaluation:null,pedagogicalDecision:null,masteryEvent:null};
}

function snapshot(referenceType:PedagogicalReferenceSnapshot["referenceType"],id:string,code:string|null,
 displayName:string,schemaVersion:string,catalogVersion:string):PedagogicalReferenceSnapshot {
 return{referenceType,origin:"catalog_item",id,code,displayName,itemVersion:"1.0.0",
  catalogVersion,schemaVersion};
}

export function buildTechnicalCompetenceEvaluation(input:{definition:TechnicalObservationControlDefinition;
 observationCode:string;evaluationId:string;evidenceId:string;evaluatedAt:string;cycleId:string}):CompetenceEvaluation {
 const criterion=input.definition.observationCriteria.find(item=>item.code===input.observationCode);
 if(!criterion)throw new Error(`Observation de contrôle technique inconnue : ${input.observationCode}.`);
 const competenceSnapshot=snapshot("competence",input.definition.competenceId,input.definition.competenceCode,
  input.definition.competenceName,PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,input.definition.catalogVersion);
 const observationSnapshot:PedagogicalReferenceSnapshot={referenceType:"observation",origin:"versioned_entity",
  id:`${input.evaluationId}:observation`,code:criterion.code,displayName:criterion.label,itemVersion:"1.0.0",
  catalogVersion:null,schemaVersion:PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION};
 const evidence:PedagogicalEvidence={id:input.evidenceId,schemaVersion:PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion:"1.0.0",catalogVersion:"technical-observation-control-v1",subjectType:"competence",
  subjectId:input.definition.competenceId,sourceType:"technical_observation_control",sourceReferenceId:input.cycleId,
  value:{observationCode:criterion.code,observation:criterion.label,outcome:criterion.outcome},
  effect:criterion.evidenceEffect as EvidenceEffect,strength:criterion.evidenceStrength,reliability:1};
 return{id:input.evaluationId,schemaVersion:PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,recordVersion:"1.0.0",
  evaluatedAt:input.evaluatedAt,competenceSnapshot,contextSnapshot:null,effectiveVariablesSnapshot:null,
  observationSnapshots:[observationSnapshot],evidenceSnapshots:[evidence],structuredResult:{controlMode:"technical_observation",
   definitionCode:input.definition.definitionCode,exerciseDefinitionId:input.definition.exerciseDefinitionId,
   exerciseInstructions:input.definition.exerciseInstructions,observationCode:criterion.code,observation:criterion.label,
   outcome:criterion.outcome},validationMode:"semi_automatic",humanValidation:null,
  knownLimitations:input.definition.knownLimitations,rationale:"Évaluation du résultat de l’exercice par observation technique directe.",
  provenance:{sourceType:"technical_observation_control",sourceId:input.cycleId,actorType:null,actorId:null}};
}

export function completeTechnicalObservationControl(input:{cycle:CoachingCycle;definition:TechnicalObservationControlDefinition;
 observationCode:string;evaluationId:string;evidenceId:string;evaluatedAt:string}):CoachingCycle {
 if(controlModeForCycle(input.cycle)!=="technical_observation"||input.cycle.status!=="evaluation_pending")
  throw new Error("Ce cycle n’attend pas une évaluation technique.");
 const competenceEvaluation=buildTechnicalCompetenceEvaluation({...input,cycleId:input.cycle.id});
 const outcome=competenceEvaluation.structuredResult.outcome as CoachingOutcome;
 return{...input.cycle,status:"completed",outcome,completedAt:input.evaluatedAt,controlSeriesId:null,
  competenceEvaluation,pedagogicalDecision:null,masteryEvent:null};
}
