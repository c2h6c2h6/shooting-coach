export const HYPOTHESIS_RULESET_VERSION = "technical-hypothesis-rules-v1";

export const hypothesisCodes = [
  "TRIGGER_FINGER_TOO_LITTLE","TRIGGER_FINGER_TOO_DEEP","LATERAL_TRIGGER_PRESSURE",
  "ABRUPT_TRIGGER_PRESS","INCONSISTENT_TRIGGER_PRESS","TRIGGER_RESET_DISTURBANCE","TRIGGER_HAND_TENSION",
  "SHOT_ANTICIPATION","MUZZLE_DIP_BEFORE_SHOT","PUSHING_AGAINST_RECOIL","FLINCH_RESPONSE",
  "EYES_CLOSING_AT_SHOT","LOSS_OF_VISUAL_FOCUS_AT_SHOT",
  "WEAK_SUPPORT_HAND_PRESSURE","EXCESSIVE_SUPPORT_HAND_PRESSURE","UNBALANCED_HAND_PRESSURE",
  "INCONSISTENT_GRIP_PRESSURE","DOMINANT_HAND_OVERGRIP","GRIP_CHANGES_BETWEEN_SHOTS",
  "WRIST_INSTABILITY","POOR_RECOIL_RETURN",
  "SIGHT_ALIGNMENT_VARIATION","SIGHT_PICTURE_VARIATION","FOCUS_ON_TARGET_INSTEAD_OF_SIGHTS",
  "INCONSISTENT_VISUAL_FOCUS","AIMING_ZONE_TOO_RESTRICTED","EXCESSIVE_AIMING_TIME",
  "UNSTABLE_STANCE","INCONSISTENT_BODY_POSITION","POSTURAL_SWAY","POOR_NATURAL_POINT_OF_AIM",
  "HEAD_POSITION_VARIATION","SHOULDER_TENSION",
  "CADENCE_TOO_FAST","CADENCE_IRREGULAR","RUSHED_FOLLOW_UP_SHOTS",
  "INSUFFICIENT_RECOVERY_BETWEEN_SHOTS","EXCESSIVE_TIME_BETWEEN_SHOTS","LOSS_OF_TECHNIQUE_DURING_SERIES",
  "FATIGUE","STRESS_OR_PRESSURE","ATTENTION_LOSS","BREATHING_DISRUPTION","PHYSICAL_DISCOMFORT",
  "UNFAMILIAR_EQUIPMENT","EQUIPMENT_OR_SIGHT_ISSUE",
  "TWO_HAND_CONTRIBUTION",
  "TRIGGER_FINGER_HAND_COACTIVATION",
] as const;
export type HypothesisCode = typeof hypothesisCodes[number];
/** Codes that may be generated for a new diagnosis.  Older codes remain in
 * `hypothesisCodes` so persisted v13 records can still be read. */
export const historicalE1HypothesisCodes = ["FLINCH_RESPONSE","PUSHING_AGAINST_RECOIL"] as const;
export const activeHypothesisCodes = hypothesisCodes.filter((code) =>
 !historicalE1HypothesisCodes.includes(code as typeof historicalE1HypothesisCodes[number]),
) as readonly HypothesisCode[];
export type HypothesisCategory = "trigger"|"anticipation"|"grip"|"vision"|"stability"|"cadence"|"context_equipment";
export type ErrorPatternNature = "systematic"|"variable"|"mixed";
export interface HypothesisDefinition {
  code: HypothesisCode; category: HypothesisCategory; titleFr: string; cautiousStatementFr: string;
  patternNature: ErrorPatternNature;
  laterality: "right"|"left"|"any"; weapon: "semi_automatic_pistol"; sight: "open";
}
const categoryRanges: Array<[HypothesisCategory, number, number]> = [
  ["trigger",0,7],["anticipation",7,13],["grip",13,21],["vision",21,27],
  ["stability",27,33],["cadence",33,39],["context_equipment",39,46],
];
const title = (code: string) => code.toLowerCase().replaceAll("_"," ");
const systematic = new Set<HypothesisCode>([
  "TRIGGER_FINGER_TOO_LITTLE","TRIGGER_FINGER_TOO_DEEP","LATERAL_TRIGGER_PRESSURE",
  "UNBALANCED_HAND_PRESSURE","TWO_HAND_CONTRIBUTION","POOR_NATURAL_POINT_OF_AIM","EQUIPMENT_OR_SIGHT_ISSUE",
]);
const variable = new Set<HypothesisCode>([
  "INCONSISTENT_TRIGGER_PRESS","INCONSISTENT_GRIP_PRESSURE","GRIP_CHANGES_BETWEEN_SHOTS",
  "WRIST_INSTABILITY","SIGHT_ALIGNMENT_VARIATION","SIGHT_PICTURE_VARIATION",
  "INCONSISTENT_VISUAL_FOCUS","UNSTABLE_STANCE","INCONSISTENT_BODY_POSITION","POSTURAL_SWAY",
  "HEAD_POSITION_VARIATION","CADENCE_IRREGULAR","LOSS_OF_TECHNIQUE_DURING_SERIES",
  "ATTENTION_LOSS","BREATHING_DISRUPTION",
]);
export const technicalHypothesisCatalog: Record<HypothesisCode,HypothesisDefinition> =
  Object.fromEntries(hypothesisCodes.map((code,index)=>{
    const category = code==="TWO_HAND_CONTRIBUTION"?"grip":code==="TRIGGER_FINGER_HAND_COACTIVATION"?"trigger":
      categoryRanges.find(([,start,end])=>index>=start&&index<end)![0];
    const special: Partial<Record<HypothesisCode,string>> = {
      LATERAL_TRIGGER_PRESSURE:"Action latérale sur la détente",
      TRIGGER_FINGER_TOO_LITTLE:"Placement de l’index à vérifier",
      TRIGGER_FINGER_TOO_DEEP:"Placement de l’index à vérifier",
      SHOT_ANTICIPATION:"Anticipation possible du départ du coup",
      WEAK_SUPPORT_HAND_PRESSURE:"Pression de la main faible possiblement insuffisante",
      UNBALANCED_HAND_PRESSURE:"Contribution des deux mains à vérifier",
      TWO_HAND_CONTRIBUTION:"Contribution des deux mains à vérifier",
      TRIGGER_FINGER_HAND_COACTIVATION:"Indépendance de l’index vis-à-vis des autres doigts à vérifier",
      INCONSISTENT_GRIP_PRESSURE:"Pression de prise variable d’un coup à l’autre",
      SIGHT_ALIGNMENT_VARIATION:"Reproductibilité de l’alignement à vérifier",
      EQUIPMENT_OR_SIGHT_ISSUE:"Point visé, réglage des organes ou matériel à vérifier",
    };
    const titleFr=special[code] ?? title(code);
    const patternNature = systematic.has(code) ? "systematic" : variable.has(code) ? "variable" : "mixed";
    return [code,{code,category,titleFr,cautiousStatementFr:`${titleFr} pourrait contribuer au résultat observé.`,
      patternNature,
      laterality:"any",weapon:"semi_automatic_pistol",sight:"open"}];
  })) as Record<HypothesisCode,HypothesisDefinition>;
