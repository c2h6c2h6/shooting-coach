import { REASONING_TRACE_VERSION, ReasoningTrace } from "./mvpValidationTypes";
import { COACHING_RULESET_VERSION, CoachingObjective } from "./coachingTypes";
import { TechnicalHypothesis } from "./technicalHypothesis";

const metricsByObjective:Record<CoachingObjective,string[]>={
 dispersion:["meanRadius","extremeSpread","boundingBoxWidth","boundingBoxHeight"],centering:["centroidDistanceToTargetCenter"],
 horizontal_stability:["boundingBoxWidth","horizontalOffset"],vertical_stability:["boundingBoxHeight","verticalOffset"],
 consistency:["meanRadius","extremeSpread"]
};
export function createReasoningTrace(input:{
 id:string;cycleId:string;sessionId:string;sourceSeriesId:string;createdAt:string;sourceSnapshot:unknown;
 retainedObservationCodes:string[];rejectedObservations:{code:string;reason:string}[];hypotheses:TechnicalHypothesis[];
 rankingReason:string;testChoiceReason:string|null;recommendationChoiceReason:string|null;objective:CoachingObjective|null;
 partition?:"real"|"demo"|"automated_test";
}):ReasoningTrace{
 return{id:input.id,cycleId:input.cycleId,sessionId:input.sessionId,sourceSeriesId:input.sourceSeriesId,
  createdAt:input.createdAt,dataPartition:input.partition??"real",algorithmVersions:{coaching:COACHING_RULESET_VERSION},
  sourceSnapshot:input.sourceSnapshot,rules:[
   {ruleCode:"RULE_OBSERVATION_REQUIRED",ruleVersion:COACHING_RULESET_VERSION,triggered:input.retainedObservationCodes.length>0,
    reason:input.retainedObservationCodes.length?"Observation source disponible.":"Aucune observation exploitable.",thresholds:{minimumObservations:1},sourceIds:input.retainedObservationCodes},
   {ruleCode:"RULE_SINGLE_PRIORITY",ruleVersion:COACHING_RULESET_VERSION,triggered:input.hypotheses.length>0,
    reason:"Une seule hypothèse de rang 1 peut piloter le cycle.",thresholds:{maximumActivePriorities:1},sourceIds:input.hypotheses.slice(0,1).map(h=>h.id)},
   {ruleCode:"RULE_RECOMMENDATION_REQUIRES_SUPPORT",ruleVersion:COACHING_RULESET_VERSION,triggered:Boolean(input.recommendationChoiceReason),
    reason:input.recommendationChoiceReason??"Non déclenchée avant un résultat compatible.",thresholds:{compatibleOutcomeRequired:true},sourceIds:[]},
  ],retainedObservationCodes:input.retainedObservationCodes,
  rejectedObservations:input.rejectedObservations,candidates:input.hypotheses.map(h=>({hypothesisCode:h.hypothesisCode,
   score:h.internalScore,strengtheners:h.supportingEvidence.map(x=>x.labelFr),weakeners:h.contradictingEvidence.map(x=>x.labelFr),
   contradictions:h.contradictingEvidence.filter(x=>/contrad/i.test(x.code)).map(x=>x.labelFr)})),rankingReason:input.rankingReason,
  testChoiceReason:input.testChoiceReason,recommendationChoiceReason:input.recommendationChoiceReason,
  evaluationMetricKeys:input.objective?metricsByObjective[input.objective]:[],limitations:[
   "Impacts placés manuellement.","Une cible ne permet pas d’identifier seule la cause d’un résultat.",
   "Une amélioration isolée ne démontre ni la cause ni la reproductibilité."
  ],traceVersion:REASONING_TRACE_VERSION};
}
