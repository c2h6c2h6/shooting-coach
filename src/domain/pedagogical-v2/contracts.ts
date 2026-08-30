export const PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION="pedagogical-v2-contracts-v1";

export const validationModes=["automatic","semi_automatic","instructor","future_video"] as const;
export type ValidationMode=(typeof validationModes)[number];

export const masteryLevels=["not_evaluated","discovery","acquisition","stabilization","transfer","robustness"] as const;
export type MasteryLevel=(typeof masteryLevels)[number];

export const pedagogicalDecisionTypes=["PROGRESS","MAINTAIN","SIMPLIFY","RETURN_TO_PREREQUISITE",
 "TEST_ANOTHER_HYPOTHESIS","INSUFFICIENT_INFORMATION","STOP"] as const;
export type PedagogicalDecisionType=(typeof pedagogicalDecisionTypes)[number];

export const evidenceEffects=["strengthens","weakens","contradicts","neutral"] as const;
export type EvidenceEffect=(typeof evidenceEffects)[number];

export interface VersionedPedagogicalReference{
 readonly id:string;
 readonly schemaVersion:string;
 readonly itemVersion:string;
 readonly catalogVersion:string;
}

export interface CompetenceInternalComponent{
 readonly code:string;
 readonly description:string;
}

export interface Competence extends VersionedPedagogicalReference{
 readonly code:string;
 readonly domain:string;
 readonly name:string;
 readonly definition:string;
 readonly pedagogicalObjective:string;
 readonly prerequisiteIds:readonly string[];
 readonly dependentCompetenceIds:readonly string[];
 readonly observableIndicators:readonly string[];
 readonly indirectIndicators:readonly string[];
 readonly interpretationLimits:readonly string[];
 readonly validationMode:ValidationMode;
 readonly pedagogicalToolIds?:readonly string[];
 readonly pedagogicalSupportNotes?:readonly string[];
 readonly internalComponents?:readonly CompetenceInternalComponent[];
 readonly referenceStatements?:readonly string[];
}

export interface PedagogicalTechnique extends VersionedPedagogicalReference{
 readonly code:string;
 readonly name:string;
 readonly principle:string;
 readonly compatibleCompetenceIds:readonly string[];
 readonly indications:readonly string[];
 readonly contraindications:readonly string[];
 readonly instructorRequired:boolean;
 readonly compatiblePedagogicalToolIds:readonly string[];
}

export interface PedagogicalTool extends VersionedPedagogicalReference{
 readonly kind:"pedagogical_tool";
 readonly code:string;
 readonly name:string;
 readonly description:string;
}

export interface QuantifiedPedagogicalValue{
 readonly value:number;
 readonly unit:string;
}

export interface ZoneSize{
 readonly width:QuantifiedPedagogicalValue|null;
 readonly height:QuantifiedPedagogicalValue|null;
 readonly label:string|null;
}

export interface PedagogicalVariables{
 readonly distance:QuantifiedPedagogicalValue|null;
 readonly numberOfHands:1|2|null;
 readonly time:QuantifiedPedagogicalValue|null;
 readonly cadence:string|null;
 readonly zoneSize:ZoneSize|null;
 readonly targetType:string|null;
 readonly sightSystem:string|null;
 readonly shotCount:number|null;
 readonly movement:string|null;
 readonly attentionalLoad:string|null;
 readonly complexity:string|null;
 readonly supervision:string|null;
}

export const pedagogicalVariableKeys=["distance","numberOfHands","time","cadence","zoneSize","targetType","sightSystem",
 "shotCount","movement","attentionalLoad","complexity","supervision"] as const satisfies readonly (keyof PedagogicalVariables)[];
export type PedagogicalVariableKey=(typeof pedagogicalVariableKeys)[number];

export interface ExerciseDefinition extends VersionedPedagogicalReference{
 readonly code:string;
 readonly name:string;
 readonly primaryCompetenceId:string;
 readonly secondaryCompetenceIds:readonly string[];
 readonly pedagogicalTechniqueIds:readonly string[];
 readonly learningPhase:string|null;
 readonly pedagogicalObjective:string;
 readonly rationale:string;
 readonly prerequisiteCompetenceIds:readonly string[];
 readonly modeCodes:readonly string[];
 readonly instructorRequired:boolean;
 readonly technicalEquipmentCodes:readonly string[];
 readonly protocol:readonly string[];
 readonly instructions:readonly string[];
 readonly desiredSensations:readonly string[];
 readonly frequentErrors:readonly string[];
 readonly successCriteria:readonly string[];
 readonly stopCriteria:readonly string[];
 readonly doNotUseWhen:readonly string[];
 readonly pedagogicalToolIds:readonly string[];
 readonly defaultVariables:PedagogicalVariables;
 readonly modifiableVariableKeys:readonly PedagogicalVariableKey[];
}

export interface ExerciseIdentity{
 readonly id:string;
 readonly code:string;
 readonly schemaVersion:string;
 readonly itemVersion:string;
 readonly catalogVersion:string;
}

export interface PedagogicalEvidence extends VersionedPedagogicalReference{
 readonly subjectType:string;
 readonly subjectId:string;
 readonly sourceType:string;
 readonly sourceReferenceId:string|null;
 readonly value:unknown;
 readonly effect:EvidenceEffect;
 readonly strength:number;
 readonly reliability:number;
}

export function exerciseIdentity(exercise:ExerciseDefinition):ExerciseIdentity{
 return{id:exercise.id,code:exercise.code,schemaVersion:exercise.schemaVersion,itemVersion:exercise.itemVersion,
  catalogVersion:exercise.catalogVersion};
}

export function isCurrentlyAutomaticValidation(mode:ValidationMode):boolean{return mode==="automatic";}
