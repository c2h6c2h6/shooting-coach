import { ShootingObservation } from "./shootingObservation";
import { DiagnosticAnswerValue, diagnosticQuestionCatalog } from "./diagnosticQuestionCatalog";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { HypothesisCategory, HypothesisCode, HYPOTHESIS_RULESET_VERSION, technicalHypothesisCatalog } from "./technicalHypothesisCatalog";
import { NumberOfHands } from "./session";
import {
  hypothesisApplicabilityForNumberOfHands,
  isDiagnosticQuestionApplicableForNumberOfHands,
} from "./numberOfHandsApplicability";
import { normalizeTwoHandContributionHypothesis } from "./twoHandContributionCompatibility";
export const HYPOTHESIS_ALGORITHM_VERSION="technical-hypothesis-v2";
export type HypothesisStatus="candidate"|"strengthened"|"weakened"|"unsupported"|"contradicted"|"requires_confirmation"|"not_applicable";
export type PlausibilityLevel="low"|"medium"|"high";
export type HypothesisConfidence="very_low"|"low"|"medium"|"high";
export interface Evidence {code:string; labelFr:string; source:"observation"|"context"|"answer"|"limitation"}
export interface MissingEvidence {code:string; labelFr:string; kind:"question"|"observation"|"test"|"context"}
export interface TechnicalHypothesis {
  id:string;sessionId:string;seriesId:string|null;comparisonId:string|null;observationId:string;
  hypothesisCode:HypothesisCode;category:HypothesisCategory;status:HypothesisStatus;
  plausibilityLevel:PlausibilityLevel;confidenceLevel:HypothesisConfidence;rank:number;internalScore:number;
  supportingEvidence:Evidence[];contradictingEvidence:Evidence[];missingEvidence:MissingEvidence[];
  applicableContext:Record<string,unknown>;sourceRules:string[];rulesetVersion:string;generatedAt:string;
}
export interface HypothesisInput {
  observations:ShootingObservation[]; laterality:"right"|"left"; impactCount:number;
  numberOfHands?:NumberOfHands|null; cadenceKnown?:boolean;
  answers?:Record<string,DiagnosticAnswerValue>; generatedAt?:string;
}
const missingLabels:Record<string,string>={
  gesture_observation:"Observation directe du geste",controlled_follow_up_series:"Nouvelle série contrôlée",
};
export function generateTechnicalHypotheses(input:HypothesisInput):Omit<TechnicalHypothesis,"id">[] {
  const at=input.generatedAt??new Date().toISOString();
  const numberOfHands=input.numberOfHands??null;
  const outlierPresent=input.observations.some(o=>o.observationCode==="OUTLIER_TO_VERIFY");
  if(input.observations.some(o=>o.observationCode==="CENTERED_AND_COMPACT")&&!outlierPresent) return [];
  const compactOffset=input.observations.some(o=>o.observationCode==="COMPACT_BUT_OFFSET");
  const dispersed=input.observations.some(o=>["WIDE_GROUP","CENTERED_BUT_DISPERSED","OFFSET_AND_DISPERSED"]
    .includes(o.observationCode));
  const candidates=[] as Omit<TechnicalHypothesis,"id">[];
  for(const observation of input.observations.filter(o=>o.rank!=="limitation")){
    for(const relation of observationHypothesisMappings.filter(r=>r.observation===observation.observationCode)){
      if(!relation.lateralities.includes(input.laterality)||input.impactCount<relation.minimumImpacts) continue;
      const handsApplicability=hypothesisApplicabilityForNumberOfHands(relation.hypothesis,numberOfHands);
      if(handsApplicability==="inapplicable")continue;
      let score=relation.initialWeight;
      const supporting:Evidence[]=[{code:"COMPATIBLE_OBSERVATION",labelFr:`Compatible avec ${observation.observationCode}.`,source:"observation"}];
      const contradicting:Evidence[]=[];
      if(observation.observationCode==="OUTLIER_TO_VERIFY"){
        score+=1;
        supporting.push({code:"PUNCTUAL_PERTURBATION_COMPATIBILITY",
          labelFr:"Un impact isolé reste compatible avec une perturbation ponctuelle, sans en identifier la cause.",source:"observation"});
      }
      const nature=technicalHypothesisCatalog[relation.hypothesis].patternNature;
      if(compactOffset&&nature==="systematic"){
        score+=3;
        supporting.push({code:"SYSTEMATIC_BIAS_COMPATIBILITY",
          labelFr:"Un groupement resserré mais décalé favorise provisoirement un biais constant.",source:"observation"});
      }else if(compactOffset&&nature==="variable"){
        score-=4;
        contradicting.push({code:"VARIABLE_CAUSE_VS_COMPACT_GROUP",
          labelFr:"La bonne régularité interne affaiblit une cause supposant des variations entre les coups.",source:"observation"});
      }else if(dispersed&&nature==="variable"){
        score+=1;
        supporting.push({code:"VARIABLE_CAUSE_COMPATIBILITY",
          labelFr:"La dispersion observée reste compatible avec une exécution variable.",source:"observation"});
      }
      if(observation.scope==="session_pattern"){score+=2;supporting.push({code:"REPEATED",labelFr:"Observation répétée pendant la séance.",source:"observation"});}
      if(observation.limitingFactors.some(x=>x.toLowerCase().includes("manuel"))){score-=1;contradicting.push({code:"MANUAL_INPUT",labelFr:"Impacts placés manuellement.",source:"limitation"});}
      for(const q of diagnosticQuestionCatalog.filter(q=>q.hypotheses.includes(relation.hypothesis)
        &&isDiagnosticQuestionApplicableForNumberOfHands(q,numberOfHands))){
        const answer=input.answers?.[q.code];
        if(!answer||answer==="uncertain"||answer==="not_observed") continue;
        const effect=answer==="yes"?q.yesEffect:q.noEffect;
        if(effect==="support"){score+=2;supporting.push({code:`ANSWER_${q.code}`,labelFr:`Réponse diagnostique compatible : ${q.textFr}`,source:"answer"});}
        if(effect==="weaken"){score-=2;contradicting.push({code:`ANSWER_${q.code}`,labelFr:`Réponse diagnostique qui affaiblit : ${q.textFr}`,source:"answer"});}
      }
      const confidence:HypothesisConfidence=input.impactCount<5?"very_low":supporting.length>=3?"low":"very_low";
      candidates.push({sessionId:observation.sessionId,seriesId:observation.seriesId,comparisonId:observation.comparisonId,
        observationId:observation.id,hypothesisCode:relation.hypothesis,category:technicalHypothesisCatalog[relation.hypothesis].category,
        status:score>=5?"strengthened":score<=0?"unsupported":"requires_confirmation",
        plausibilityLevel:score>=5?"high":score>=2?"medium":"low",confidenceLevel:confidence,rank:0,internalScore:score,
        supportingEvidence:supporting,contradictingEvidence:contradicting,
        missingEvidence:[...(handsApplicability==="insufficient_information"?[{code:"number_of_hands_unknown",
          labelFr:"Nombre de mains non renseigné : vérifier le contexte avant d’examiner une piste propre à la main faible.",kind:"context" as const}]:[]),
          ...(compactOffset?[{code:"repeat_same_conditions",labelFr:"Seconde série comparable pour confirmer la persistance du biais.",kind:"observation" as const}]:[]),
          ...relation.missing.map(code=>({code,labelFr:missingLabels[code]??code,kind:"observation" as const})),
          ...relation.confirmationTests.map(code=>({code,labelFr:missingLabels[code]??"Test de confirmation nécessaire",kind:"test" as const}))],
        applicableContext:{laterality:input.laterality,weapon:"semi_automatic_pistol",sight:"open",minimumImpacts:relation.minimumImpacts,
          numberOfHands,numberOfHandsApplicability:handsApplicability},
        sourceRules:[`${relation.observation}->${relation.hypothesis}`,HYPOTHESIS_ALGORITHM_VERSION],
        rulesetVersion:HYPOTHESIS_RULESET_VERSION,generatedAt:at});
    }
  }
  const bestByCode=new Map<HypothesisCode,Omit<TechnicalHypothesis,"id">>();
  for(const c of candidates){const old=bestByCode.get(c.hypothesisCode);if(!old||c.internalScore>old.internalScore)bestByCode.set(c.hypothesisCode,c);}
  const sorted=[...bestByCode.values()].sort((a,b)=>b.internalScore-a.internalScore||a.hypothesisCode.localeCompare(b.hypothesisCode));
  const selected:typeof sorted=[]; const categoryCount=new Map<HypothesisCategory,number>();
  for(const c of sorted){if(selected.length>=4)break;if((categoryCount.get(c.category)??0)>=1&&selected.length>=2)continue;
    selected.push(c);categoryCount.set(c.category,(categoryCount.get(c.category)??0)+1);}
  return selected.map((h,i)=>normalizeTwoHandContributionHypothesis({...h,rank:i+1}));
}
