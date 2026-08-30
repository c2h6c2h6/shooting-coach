import { CoachingRecommendation, ConfirmationOutcome, COACHING_RULESET_VERSION, ShooterLevel, TrainingDrill } from "./coachingTypes";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { trainingDrillCatalog } from "./trainingDrillCatalog";
import { TechnicalHypothesis } from "./technicalHypothesis";
import { NumberOfHands } from "./session";
import { isTrainingDrillApplicableForNumberOfHands } from "./numberOfHandsApplicability";
import type { HypothesisCode } from "./technicalHypothesisCatalog";
import { safetyBlockers } from "./coachingSafetyRules";
import type { SafetyContext } from "./coachingTypes";
import { pedagogicalBindingForHypothesis,type PedagogicalChainBinding } from "./pedagogical-v2/twoHandContributionPedagogicalBinding";

export const MAX_CONTROL_SERIES_PER_CYCLE=2;
export const MAX_LIVE_SHOTS_PER_DRILL=5;
const targetedDrillByHypothesis:Partial<Record<HypothesisCode,string>>={
 INCONSISTENT_GRIP_PRESSURE:"DRILL_CONSTANT_GRIP",
 GRIP_CHANGES_BETWEEN_SHOTS:"DRILL_CONSTANT_GRIP",
 WRIST_INSTABILITY:"DRILL_WRIST_ORGANIZATION",
 POOR_RECOIL_RETURN:"DRILL_RETURN_TO_LINE",
 SIGHT_ALIGNMENT_VARIATION:"DRILL_SIGHT_ALIGNMENT_RECONSTRUCTION",
 SHOT_ANTICIPATION:"DRILL_ACCEPT_DEPARTURE_E1",
};
export interface CoachingProposal {recommendation:Omit<CoachingRecommendation,"id">;drill:TrainingDrill;
 pedagogicalBinding:PedagogicalChainBinding|null}
export function proposeCoaching(input:{hypothesis:TechnicalHypothesis;testRunId:string;outcome:ConfirmationOutcome;
 sessionId:string;level:ShooterLevel;numberOfHands?:NumberOfHands|null;safety:SafetyContext;now?:string}):CoachingProposal|null{
 if(!["supports_hypothesis","weakly_supports_hypothesis"].includes(input.outcome))return null;
 const def=coachingRecommendationCatalog.find(r=>r.hypothesisCodes.includes(input.hypothesis.hypothesisCode));
 if(!def)return null;
 const numberOfHands=input.numberOfHands===1||input.numberOfHands===2?input.numberOfHands:null;
 let drills=trainingDrillCatalog.filter(d=>d.linkedRecommendationCodes.includes(def.code)&&d.difficultyLevel.includes(input.level)
  &&isTrainingDrillApplicableForNumberOfHands(d,input.hypothesis.hypothesisCode,numberOfHands)
  &&safetyBlockers(d,input.safety).length===0);
 if(input.level==="beginner")drills=drills.sort((a,b)=>a.numberOfShots-b.numberOfShots||a.numberOfRepetitions-b.numberOfRepetitions);
 const targetedCode=targetedDrillByHypothesis[input.hypothesis.hypothesisCode];
 const drill=(targetedCode?drills.find(item=>item.code===targetedCode):undefined)??drills[0];if(!drill)return null;
 const adapted={...drill,numberOfShots:Math.min(drill.numberOfShots,MAX_LIVE_SHOTS_PER_DRILL),
  numberOfRepetitions:input.level==="beginner"?Math.min(drill.numberOfRepetitions,5):drill.numberOfRepetitions,
  executionSteps:input.level==="beginner"?drill.executionSteps.slice(0,1):drill.executionSteps};
 return{recommendation:{sessionId:input.sessionId,hypothesisId:input.hypothesis.id,confirmationTestRunId:input.testRunId,
  recommendationCode:def.code,recommendationType:"drill",title:def.title,rationale:def.rationale,objective:def.objective,
  instructions:[def.instruction],safetyNotes:adapted.safetyRequirements,expectedObservation:adapted.successCriteria[0],
  stopConditions:adapted.stopConditions,priority:1,status:"proposed",rulesetVersion:COACHING_RULESET_VERSION,
  generatedAt:input.now??new Date().toISOString()},drill:adapted,
  pedagogicalBinding:pedagogicalBindingForHypothesis(input.hypothesis.hypothesisCode)};
}
