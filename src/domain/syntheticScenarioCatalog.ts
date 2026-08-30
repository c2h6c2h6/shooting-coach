import { SyntheticScenario } from "./mvpValidationTypes";

const compact=[[-.035,.01],[-.015,-.025],[0,0],[.02,.02],[.035,-.01]].map(([x,y])=>({x:.5+x,y:.5+y}));
const shifted=compact.map(p=>({x:p.x-.16,y:p.y+.02}));
const vertical=[[-.01,-.18],[.01,-.09],[0,0],[-.015,.1],[.015,.19]].map(([x,y])=>({x:.5+x,y:.5+y}));
const horizontal=[[-.19,-.01],[-.1,.01],[0,0],[.1,-.015],[.19,.015]].map(([x,y])=>({x:.5+x,y:.5+y}));
const twoAxes=[[-.16,-.15],[.14,-.1],[-.12,.13],[.17,.16],[0,0]].map(([x,y])=>({x:.5+x,y:.5+y}));
const base=(code:string,title:string,sourceImpacts:SyntheticScenario["sourceImpacts"],
 observationCodes:string[],allowedHypotheses:SyntheticScenario["expectation"]["allowedHypotheses"],
 extra:Partial<SyntheticScenario["expectation"]>={}):SyntheticScenario=>({
 code,version:"synthetic-scenarios-v1",title,profile:{displayName:`Démo ${code}`,laterality:"right",level:"intermediate"},
 weaponId:"glock-19",distanceMm:10000,targetTypeId:"generic-centered",sourceImpacts,controlImpacts:null,notes:["Données simulées, jamais issues d'un tir réel."],
 expectation:{metricRanges:{includedImpactCount:{min:5,max:5}},observationCodes,allowedHypotheses,forbiddenHypotheses:[],
  expectedTestCode:null,expectedRecommendationCode:null,controlOutcome:null,expectedTestOutcome:null,...extra}
});
export const syntheticScenarioCatalog:SyntheticScenario[]=[
 base("A","Série centrée et compacte",compact,["CENTERED_AND_COMPACT"],[],{forbiddenHypotheses:["LATERAL_TRIGGER_PRESSURE","SHOT_ANTICIPATION"]}),
 base("B","Groupement compact régulièrement décalé",shifted,["COMPACT_BUT_OFFSET"],["EQUIPMENT_OR_SIGHT_ISSUE","LATERAL_TRIGGER_PRESSURE"]),
 base("C","Dispersion principalement verticale",vertical,["VERTICAL_SPREAD"],["ABRUPT_TRIGGER_PRESS","EXCESSIVE_AIMING_TIME"],{forbiddenHypotheses:["SHOT_ANTICIPATION"]}),
 base("D","Dispersion principalement horizontale",horizontal,["HORIZONTAL_SPREAD"],["LATERAL_TRIGGER_PRESSURE","INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]),
 base("E","Dispersion sur deux axes",twoAxes,["TWO_AXIS_SPREAD"],["INCONSISTENT_GRIP_PRESSURE","INCONSISTENT_TRIGGER_PRESS"]),
 base("F","Un impact éloigné",[...compact.slice(0,4),{x:.86,y:.18}],["OUTLIER_TO_VERIFY"],[]),
 base("G","Observation répétée",horizontal,["HORIZONTAL_SPREAD"],["LATERAL_TRIGGER_PRESSURE"]),
 base("H","Séries contradictoires",vertical,["COMPARISON_LIMITED"],[]),
 base("I","Test non concluant",horizontal,["HORIZONTAL_SPREAD"],["LATERAL_TRIGGER_PRESSURE"],{expectedTestCode:"TEST_SIGHT_STABILITY_DRY",expectedTestOutcome:"inconclusive"}),
 {...base("J","Test soutenant l’hypothèse",horizontal,["HORIZONTAL_SPREAD"],["LATERAL_TRIGGER_PRESSURE"],{expectedTestCode:"TEST_SIGHT_STABILITY_DRY",expectedTestOutcome:"supports_hypothesis",expectedRecommendationCode:"REC_TRIGGER_AXIS",controlOutcome:"objective_improved"}),controlImpacts:compact},
 {...base("K","Série de contrôle améliorée",horizontal,["HORIZONTAL_SPREAD"],["LATERAL_TRIGGER_PRESSURE"],{controlOutcome:"objective_improved"}),controlImpacts:compact},
 {...base("L","Série de contrôle dégradée",compact,["CENTERED_AND_COMPACT"],[],{controlOutcome:"objective_worsened"}),controlImpacts:twoAxes},
];
export function getSyntheticScenario(code:string){return syntheticScenarioCatalog.find(s=>s.code===code)??null}
