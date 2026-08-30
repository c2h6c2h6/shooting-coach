import { HypothesisCode } from "./technicalHypothesisCatalog";
export type DiagnosticAnswerValue = "yes"|"no"|"uncertain"|"not_observed";
export interface DiagnosticQuestion {
  code:string; textFr:string; hypotheses:HypothesisCode[];
  yesEffect:"support"|"weaken"; noEffect:"support"|"weaken"|"neutral";
}
export const diagnosticQuestionCatalog: DiagnosticQuestion[] = [
  {code:"FELT_TENSION",textFr:"Avez-vous senti une crispation juste avant le départ du coup ?",
    hypotheses:["SHOT_ANTICIPATION","TRIGGER_HAND_TENSION"],yesEffect:"support",noEffect:"weaken"},
  {code:"FRONT_SIGHT_CLEAR",textFr:"Le guidon est-il resté visible et net pendant le départ ?",
    hypotheses:["LOSS_OF_VISUAL_FOCUS_AT_SHOT"],yesEffect:"weaken",noEffect:"support"},
  {code:"SUPPORT_PRESSURE_CONSTANT",textFr:"La pression de la main faible est-elle restée constante ?",
    hypotheses:["INCONSISTENT_GRIP_PRESSURE","UNBALANCED_HAND_PRESSURE"],yesEffect:"weaken",noEffect:"support"},
  {code:"LATE_SHOTS_HARDER",textFr:"Les derniers tirs ont-ils été plus difficiles que les premiers ?",
    hypotheses:["FATIGUE","LOSS_OF_TECHNIQUE_DURING_SERIES"],yesEffect:"support",noEffect:"weaken"},
  {code:"PROVOKED_SHOT",textFr:"Avez-vous cherché à provoquer le départ du coup ?",
    hypotheses:["ABRUPT_TRIGGER_PRESS","SHOT_ANTICIPATION"],yesEffect:"support",noEffect:"weaken"},
];
