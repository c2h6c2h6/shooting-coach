import { ConfirmationTestDefinition, ConfirmationOutcome, SafetyContext, SessionMode } from "./coachingTypes";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { safetyBlockers } from "./coachingSafetyRules";
import { TechnicalHypothesis } from "./technicalHypothesis";
import { NumberOfHands } from "./session";
import { isConfirmationTestApplicableForNumberOfHands,numberOfHandsFromApplicableContext } from "./numberOfHandsApplicability";

export interface TestSelectionContext {
  hypothesis:TechnicalHypothesis; alternatives:TechnicalHypothesis[]; sessionMode:SessionMode;
  safety:SafetyContext; userCanPerform:boolean; contextKnown:boolean; numberOfHands?:NumberOfHands|null;
  allowRankedFallback?:boolean;
}
export interface TestSelection {primary:ConfirmationTestDefinition|null;alternative:ConfirmationTestDefinition|null;reason:string;blockers:string[]}
export function selectConfirmationTest(c:TestSelectionContext):TestSelection{
 if(!c.contextKnown)return{primary:null,alternative:null,reason:"Les données actuelles ne permettent pas de choisir un test fiable. Une nouvelle série contrôlée est préférable.",blockers:["Contexte inconnu."]};
 if(!c.userCanPerform)return{primary:null,alternative:null,reason:"Le test n’est pas réalisable dans le contexte déclaré.",blockers:["Utilisateur indisponible pour ce test."]};
 if((c.hypothesis.rank!==1&&!c.allowRankedFallback)||!["strengthened","requires_confirmation"].includes(c.hypothesis.status)||
   c.hypothesis.internalScore<2)return{primary:null,alternative:null,reason:"L’hypothèse est trop faiblement soutenue pour proposer un test.",blockers:["Soutien insuffisant."]};
 const numberOfHands=c.numberOfHands===1||c.numberOfHands===2?c.numberOfHands:null;
 const supported=confirmationTestCatalog.filter(t=>t.hypothesisCodes.includes(c.hypothesis.hypothesisCode)&&t.supportedSessionModes.includes(c.sessionMode));
 const applicable=supported.filter(t=>isConfirmationTestApplicableForNumberOfHands(t,c.hypothesis.hypothesisCode,numberOfHands));
 if(supported.length&&!applicable.length)return{primary:null,alternative:null,
  reason:numberOfHands===1?"Ce test concerne une interaction entre les deux mains et n’est pas applicable à cette séance à une main.":
   "Le nombre de mains doit être renseigné avant de proposer ce test.",
  blockers:[numberOfHands===1?"Test incompatible avec une séance à une main.":"Information insuffisante : nombre de mains non renseigné."]};
 const candidates=applicable
  .map(t=>({t,b:safetyBlockers(t,c.safety),disc:t.discriminatesAgainst.filter(x=>c.alternatives.some(a=>a.hypothesisCode===x)).length}))
  .sort((a,b)=>a.b.length-b.b.length||b.disc-a.disc||Number(a.t.requiresLiveFire)-Number(b.t.requiresLiveFire));
 const usable=candidates.filter(x=>!x.b.length);
 const primary=usable[0]?.t??null;
 const alternative=usable.find(x=>primary&&x.t.code!==primary.code&&x.t.requiresDryFire&&!x.t.requiresLiveFire)?.t??null;
 return primary?{primary,alternative,reason:"Ce test cherche à départager l’hypothèse principale des causes concurrentes.",blockers:[]}:
  {primary:null,alternative:null,reason:"Les prérequis de sécurité ne permettent pas de proposer ce test dans le contexte actuel.",blockers:candidates[0]?.b??["Aucun test applicable."]};
}
export function firstStructurallyTestableHypothesis(input:{hypotheses:TechnicalHypothesis[];sessionMode:SessionMode}){
 return input.hypotheses.find(h=>{
  if(!["strengthened","requires_confirmation"].includes(h.status)||h.internalScore<2)return false;
  const numberOfHands=numberOfHandsFromApplicableContext(h.applicableContext);
  return confirmationTestCatalog.some(t=>t.hypothesisCodes.includes(h.hypothesisCode)
   &&t.supportedSessionModes.includes(input.sessionMode)
   &&isConfirmationTestApplicableForNumberOfHands(t,h.hypothesisCode,numberOfHands));
 })??null;
}
export function hypothesisEffect(outcome:ConfirmationOutcome){
 switch(outcome){
  case"supports_hypothesis":return{scoreDelta:3,status:"strengthened" as const};
  case"weakly_supports_hypothesis":return{scoreDelta:1,status:"requires_confirmation" as const};
  case"does_not_support_hypothesis":return{scoreDelta:-2,status:"weakened" as const};
  case"contradicts_hypothesis":return{scoreDelta:-4,status:"contradicted" as const};
  default:return{scoreDelta:0,status:"requires_confirmation" as const};
 }
}
