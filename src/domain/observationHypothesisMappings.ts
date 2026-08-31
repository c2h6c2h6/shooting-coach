import { ObservationCode } from "./observationCatalog";
import { HypothesisCode } from "./technicalHypothesisCatalog";
export interface ObservationHypothesisMapping {
  observation:ObservationCode; hypothesis:HypothesisCode; initialWeight:number;
  minimumImpacts:number; lateralities:Array<"right"|"left">;
  supporting:string[]; weakening:string[]; contradictions:string[]; missing:string[];
  confirmationTests:string[];
}
const m=(observation:ObservationCode,hypothesis:HypothesisCode,initialWeight:number,
  extra:Partial<ObservationHypothesisMapping>={}):ObservationHypothesisMapping=>({
  observation,hypothesis,initialWeight,minimumImpacts:5,lateralities:["right","left"],
  supporting:["observation_repeated"],weakening:["manual_input","single_series"],
  contradictions:["opposite_direction","inconsistent_between_series"],
  missing:["gesture_observation"],confirmationTests:["controlled_follow_up_series"],...extra,
});
export const observationHypothesisMappings:ObservationHypothesisMapping[]=[
  m("OFFSET_LEFT","LATERAL_TRIGGER_PRESSURE",3),m("OFFSET_LEFT","TWO_HAND_CONTRIBUTION",2),
  m("OFFSET_LEFT","SIGHT_ALIGNMENT_VARIATION",2),m("OFFSET_LEFT","EQUIPMENT_OR_SIGHT_ISSUE",2),
  m("OFFSET_RIGHT","LATERAL_TRIGGER_PRESSURE",3),m("OFFSET_RIGHT","TWO_HAND_CONTRIBUTION",2),
  m("OFFSET_RIGHT","SIGHT_ALIGNMENT_VARIATION",2),m("OFFSET_RIGHT","EQUIPMENT_OR_SIGHT_ISSUE",2),
  ...(["OFFSET_HIGH","OFFSET_LOW","OFFSET_HIGH_LEFT","OFFSET_HIGH_RIGHT","OFFSET_LOW_LEFT","OFFSET_LOW_RIGHT"] as ObservationCode[])
    .flatMap(o=>[m(o,"SIGHT_ALIGNMENT_VARIATION",3),m(o,"TWO_HAND_CONTRIBUTION",2),
      m(o,o.includes("LOW")?"SHOT_ANTICIPATION":"SIGHT_PICTURE_VARIATION",2),m(o,"EQUIPMENT_OR_SIGHT_ISSUE",1)]),
  m("HORIZONTAL_SPREAD","SIGHT_ALIGNMENT_VARIATION",2),
  m("HORIZONTAL_SPREAD","TWO_HAND_CONTRIBUTION",2),
  m("VERTICAL_SPREAD","SIGHT_PICTURE_VARIATION",3),m("VERTICAL_SPREAD","BREATHING_DISRUPTION",2),
  m("VERTICAL_SPREAD","EXCESSIVE_AIMING_TIME",2),m("VERTICAL_SPREAD","WRIST_INSTABILITY",2),
  m("TWO_AXIS_SPREAD","INCONSISTENT_GRIP_PRESSURE",3),
  m("TWO_AXIS_SPREAD","ATTENTION_LOSS",1),m("TWO_AXIS_SPREAD","SIGHT_ALIGNMENT_VARIATION",2),
  // La géométrie seule établit un biais constant possible, pas sa cause :
  // configuration et action latérale partent donc au même niveau.
  m("COMPACT_BUT_OFFSET","EQUIPMENT_OR_SIGHT_ISSUE",4),
  m("COMPACT_BUT_OFFSET","LATERAL_TRIGGER_PRESSURE",4),
  m("COMPACT_BUT_OFFSET","TWO_HAND_CONTRIBUTION",2),
  m("COMPACT_BUT_OFFSET","SIGHT_ALIGNMENT_VARIATION",1),
  m("CENTERED_BUT_DISPERSED","INCONSISTENT_GRIP_PRESSURE",3),m("CENTERED_BUT_DISPERSED","SIGHT_ALIGNMENT_VARIATION",3),
  m("OUTLIER_TO_VERIFY","SHOT_ANTICIPATION",1,{minimumImpacts:3}),
  m("OUTLIER_TO_VERIFY","ATTENTION_LOSS",1,{minimumImpacts:3}),
  m("GROUP_WIDER","LOSS_OF_TECHNIQUE_DURING_SERIES",2),m("GROUP_WIDER","FATIGUE",1),
  m("SHAPE_CHANGED","INCONSISTENT_BODY_POSITION",2),m("SHAPE_CHANGED","GRIP_CHANGES_BETWEEN_SHOTS",2),
  m("NO_NOTABLE_CHANGE","EQUIPMENT_OR_SIGHT_ISSUE",1),
];
