import type { CoachingObjective } from "../coachingTypes";
import type { HypothesisCode } from "../technicalHypothesisCatalog";
import type { MasteryLevel } from "./contracts";
import {wristPedagogicalBindings} from "./wristStabilityPedagogicalChain";
import {sightAlignmentPedagogicalBinding} from "./sightAlignmentPedagogicalChain";
import {e1AnticipationPedagogicalBinding} from "./e1AnticipationPedagogicalChain";

export interface PedagogicalChainBinding {
  readonly hypothesisCode:HypothesisCode;
  readonly confirmationTestCode:string;
  readonly competenceId:string;
  readonly pedagogicalTechniqueId:string;
  readonly recommendationCode:string;
  readonly trainingDrillCode:string;
  readonly exerciseDefinitionId:string;
  readonly controlObjective:CoachingObjective;
  readonly masteryIntents?:readonly MasteryLevel[];
}

export const twoHandContributionPedagogicalBinding:PedagogicalChainBinding={
  hypothesisCode:"TWO_HAND_CONTRIBUTION",
  confirmationTestCode:"TEST_TWO_HAND_CONTRIBUTION",
  competenceId:"competence:B4",
  pedagogicalTechniqueId:"technique:B4:01",
  recommendationCode:"REC_TWO_HAND_COORDINATION",
  trainingDrillCode:"DRILL_TWO_HAND_CONTRIBUTION",
  exerciseDefinitionId:"exercise:B4:01",
  controlObjective:"consistency",
};

function gripConsistencyBindingsFor(competenceId:string,masteryIntents?:readonly MasteryLevel[]):readonly PedagogicalChainBinding[] {
  return [
  "INCONSISTENT_GRIP_PRESSURE","GRIP_CHANGES_BETWEEN_SHOTS",
].map((hypothesisCode)=>({
  hypothesisCode:hypothesisCode as HypothesisCode,
  confirmationTestCode:"TEST_GRIP_CONSTANCY",
  competenceId,
  pedagogicalTechniqueId:"technique:B7:01",
  recommendationCode:"REC_GRIP_CONSTANCY",
  trainingDrillCode:"DRILL_CONSTANT_GRIP",
  exerciseDefinitionId:"exercise:B7:01",
  controlObjective:"consistency",
  ...(masteryIntents===undefined?{}:{masteryIntents}),
 }));
}

export const historicalGripConsistencyPedagogicalBindings=gripConsistencyBindingsFor("competence:B7");

export const gripConsistencyPedagogicalBindings=gripConsistencyBindingsFor(
  "competence:B3",["stabilization","robustness"],
);

export function pedagogicalBindingForHypothesis(hypothesisCode:HypothesisCode):PedagogicalChainBinding|null {
  if(hypothesisCode===twoHandContributionPedagogicalBinding.hypothesisCode)
    return twoHandContributionPedagogicalBinding;
  const wrist=wristPedagogicalBindings.find(binding=>binding.hypothesisCode===hypothesisCode);
  if(wrist)return wrist;
  if(hypothesisCode===sightAlignmentPedagogicalBinding.hypothesisCode)return sightAlignmentPedagogicalBinding;
  if(hypothesisCode===e1AnticipationPedagogicalBinding.hypothesisCode)return e1AnticipationPedagogicalBinding;
  return gripConsistencyPedagogicalBindings.find(binding=>binding.hypothesisCode===hypothesisCode)??null;
}
