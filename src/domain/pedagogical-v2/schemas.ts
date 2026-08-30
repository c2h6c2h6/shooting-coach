import {Competence,evidenceEffects,EvidenceEffect,ExerciseDefinition,masteryLevels,MasteryLevel,
 pedagogicalDecisionTypes,PedagogicalDecisionType,pedagogicalVariableKeys,PedagogicalEvidence,PedagogicalTechnique,
 PedagogicalTool,PedagogicalVariables,ValidationMode,validationModes,VersionedPedagogicalReference} from "./contracts";

export interface ContractValidationIssue{readonly path:string;readonly message:string;}
export type ContractValidationResult<T>={readonly success:true;readonly data:T}|{readonly success:false;readonly issues:readonly ContractValidationIssue[]};
export interface ContractSchema<T>{safeParse(value:unknown):ContractValidationResult<T>;parse(value:unknown):T;}

export class PedagogicalContractValidationError extends Error{
 constructor(readonly issues:readonly ContractValidationIssue[]){super(issues.map(issue=>`${issue.path}: ${issue.message}`).join("; "));
  this.name="PedagogicalContractValidationError";}
}

type RecordValue=Record<string,unknown>;
const record=(value:unknown):value is RecordValue=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const text=(value:unknown):value is string=>typeof value==="string"&&value.trim().length>0;
const finiteNonNegative=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>=0;
const issue=(issues:ContractValidationIssue[],path:string,message:string)=>issues.push({path,message});

function stringArray(value:unknown,path:string,issues:ContractValidationIssue[],options:{minimum?:number}={}):value is string[]{
 if(!Array.isArray(value)){issue(issues,path,"doit être un tableau");return false;}
 if(value.some(item=>!text(item)))issue(issues,path,"doit contenir uniquement des chaînes non vides");
 if(new Set(value).size!==value.length)issue(issues,path,"ne doit pas contenir de doublon");
 if(value.length<(options.minimum??0))issue(issues,path,`doit contenir au moins ${options.minimum} élément(s)`);
 return issues.every(item=>item.path!==path);
}

function versioned(value:RecordValue,issues:ContractValidationIssue[]){
 for(const key of ["id","schemaVersion","itemVersion","catalogVersion"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne stable non vide");
}

function commonReference(value:RecordValue,issues:ContractValidationIssue[]){versioned(value,issues);if(!text(value.code))issue(issues,"code","doit être une chaîne non vide");}

function createSchema<T>(validate:(value:unknown)=>ContractValidationResult<T>):ContractSchema<T>{return{
 safeParse:validate,parse(value){const result=validate(value);if(!result.success)throw new PedagogicalContractValidationError(result.issues);return result.data;},
};}

function literalSchema<const T extends readonly string[]>(values:T):ContractSchema<T[number]>{return createSchema(value=>
 typeof value==="string"&&(values as readonly string[]).includes(value)?{success:true,data:value as T[number]}:
 {success:false,issues:[{path:"$",message:`valeur attendue : ${values.join(", ")}`}]} );}

export const validationModeSchema=literalSchema(validationModes);
export const masteryLevelSchema=literalSchema(masteryLevels);
export const pedagogicalDecisionTypeSchema=literalSchema(pedagogicalDecisionTypes);
export const evidenceEffectSchema=literalSchema(evidenceEffects);

function quantified(value:unknown,path:string,issues:ContractValidationIssue[]){
 if(!record(value)){issue(issues,path,"doit être un objet quantifié");return;}
 if(!finiteNonNegative(value.value))issue(issues,`${path}.value`,"doit être un nombre positif ou nul");
 if(!text(value.unit))issue(issues,`${path}.unit`,"doit être une unité non vide");
}

function nullableText(value:unknown,path:string,issues:ContractValidationIssue[]){if(value!==null&&!text(value))issue(issues,path,"doit être null ou une chaîne non vide");}

export const pedagogicalVariablesSchema=createSchema<PedagogicalVariables>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};
 const expected=new Set<string>(pedagogicalVariableKeys);for(const key of Object.keys(value))if(!expected.has(key))issue(issues,key,"variable pédagogique inconnue");
 for(const key of pedagogicalVariableKeys)if(!(key in value))issue(issues,key,"variable obligatoire absente");
 if(value.distance!==null)quantified(value.distance,"distance",issues);if(value.time!==null)quantified(value.time,"time",issues);
 if(value.numberOfHands!==null&&value.numberOfHands!==1&&value.numberOfHands!==2)issue(issues,"numberOfHands","doit valoir 1, 2 ou null");
 if(value.shotCount!==null&&(!Number.isInteger(value.shotCount)||Number(value.shotCount)<0))issue(issues,"shotCount","doit être un entier positif ou nul, ou null");
 for(const key of ["cadence","targetType","sightSystem","movement","attentionalLoad","complexity","supervision"] as const)
  nullableText(value[key],key,issues);
 if(value.zoneSize!==null){if(!record(value.zoneSize))issue(issues,"zoneSize","doit être null ou un objet");else{
  if(value.zoneSize.width!==null)quantified(value.zoneSize.width,"zoneSize.width",issues);
  if(value.zoneSize.height!==null)quantified(value.zoneSize.height,"zoneSize.height",issues);
  nullableText(value.zoneSize.label,"zoneSize.label",issues);}}
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as PedagogicalVariables};
});

export const competenceSchema=createSchema<Competence>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};commonReference(value,issues);
 for(const key of ["domain","name","definition","pedagogicalObjective"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne non vide");
 for(const key of ["prerequisiteIds","dependentCompetenceIds","observableIndicators","indirectIndicators","interpretationLimits"] as const)
  stringArray(value[key],key,issues);
 for(const key of ["pedagogicalToolIds","pedagogicalSupportNotes","referenceStatements"] as const)
  if(value[key]!==undefined)stringArray(value[key],key,issues);
 if(value.internalComponents!==undefined){
  if(!Array.isArray(value.internalComponents))issue(issues,"internalComponents","doit être un tableau");
  else{
   const componentCodes=new Set<string>();
   value.internalComponents.forEach((component,index)=>{
    if(!record(component)){issue(issues,`internalComponents[${index}]`,"doit être un objet");return;}
    const componentCode=component.code;
    if(!text(componentCode))issue(issues,`internalComponents[${index}].code`,"doit être une chaîne non vide");
    else if(componentCodes.has(componentCode))issue(issues,"internalComponents","ne doit pas contenir de code dupliqué");
    else componentCodes.add(componentCode);
    if(!text(component.description))issue(issues,`internalComponents[${index}].description`,"doit être une chaîne non vide");
   });
  }
 }
 if(!validationModeSchema.safeParse(value.validationMode).success)issue(issues,"validationMode","mode de validation inconnu");
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as Competence};
});

export const pedagogicalTechniqueSchema=createSchema<PedagogicalTechnique>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};commonReference(value,issues);
 for(const key of ["name","principle"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne non vide");
 for(const key of ["compatibleCompetenceIds","indications","contraindications","compatiblePedagogicalToolIds"] as const)stringArray(value[key],key,issues);
 if(typeof value.instructorRequired!=="boolean")issue(issues,"instructorRequired","doit être un booléen");
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as PedagogicalTechnique};
});

export const pedagogicalToolSchema=createSchema<PedagogicalTool>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};commonReference(value,issues);
 if(value.kind!=="pedagogical_tool")issue(issues,"kind","doit identifier explicitement un outil pédagogique");
 for(const key of ["name","description"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne non vide");
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as PedagogicalTool};
});

export const exerciseDefinitionSchema=createSchema<ExerciseDefinition>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};commonReference(value,issues);
 for(const key of ["name","primaryCompetenceId","pedagogicalObjective","rationale"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne non vide");
 for(const key of ["secondaryCompetenceIds","pedagogicalTechniqueIds","prerequisiteCompetenceIds","modeCodes","technicalEquipmentCodes",
  "protocol","instructions","desiredSensations","frequentErrors","doNotUseWhen","pedagogicalToolIds"] as const)stringArray(value[key],key,issues);
 stringArray(value.successCriteria,"successCriteria",issues,{minimum:1});stringArray(value.stopCriteria,"stopCriteria",issues,{minimum:1});
 if(Array.isArray(value.secondaryCompetenceIds)&&value.secondaryCompetenceIds.includes(value.primaryCompetenceId))
  issue(issues,"secondaryCompetenceIds","ne peut pas répéter la compétence principale");
 if(typeof value.instructorRequired!=="boolean")issue(issues,"instructorRequired","doit être un booléen");
 nullableText(value.learningPhase,"learningPhase",issues);
 const variables=pedagogicalVariablesSchema.safeParse(value.defaultVariables);if(!variables.success)
  for(const variableIssue of variables.issues)issue(issues,`defaultVariables.${variableIssue.path}`,variableIssue.message);
 if(Array.isArray(value.modifiableVariableKeys)){
  if(new Set(value.modifiableVariableKeys).size!==value.modifiableVariableKeys.length)issue(issues,"modifiableVariableKeys","ne doit pas contenir de doublon");
  for(const key of value.modifiableVariableKeys)if(!(pedagogicalVariableKeys as readonly unknown[]).includes(key))issue(issues,"modifiableVariableKeys","contient une variable inconnue");
 }else issue(issues,"modifiableVariableKeys","doit être un tableau");
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as ExerciseDefinition};
});

export const pedagogicalEvidenceSchema=createSchema<PedagogicalEvidence>(value=>{
 const issues:ContractValidationIssue[]=[];if(!record(value))return{success:false,issues:[{path:"$",message:"doit être un objet"}]};versioned(value,issues);
 for(const key of ["subjectType","subjectId","sourceType"] as const)if(!text(value[key]))issue(issues,key,"doit être une chaîne non vide");
 nullableText(value.sourceReferenceId,"sourceReferenceId",issues);
 if(!evidenceEffectSchema.safeParse(value.effect).success)issue(issues,"effect","effet inconnu");
 for(const key of ["strength","reliability"] as const)if(!finiteNonNegative(value[key])||Number(value[key])>1)issue(issues,key,"doit être compris entre 0 et 1");
 return issues.length?{success:false,issues}:{success:true,data:value as unknown as PedagogicalEvidence};
});

export type {EvidenceEffect,MasteryLevel,PedagogicalDecisionType,ValidationMode,VersionedPedagogicalReference};
