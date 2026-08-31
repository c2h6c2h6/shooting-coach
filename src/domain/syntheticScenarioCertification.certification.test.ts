import {describe,expect,it} from "vitest";
import {proposeCoaching} from "./coachingCycleEngine";
import {evaluateCoachingOutcome} from "./coachingOutcomeEvaluator";
import {SafetyContext} from "./coachingTypes";
import {selectConfirmationTest} from "./confirmationTestEngine";
import {compareSeries,SeriesComparison} from "./seriesComparison";
import {calculateSeriesMetrics} from "./seriesMetrics";
import {syntheticScenarioCatalog} from "./syntheticScenarioCatalog";
import {runSyntheticScenario} from "./syntheticScenarioRunner";
import {observeSeries,repeatedSessionObservations} from "./shootingObservation";

const geometry={version:"synthetic-target-v1",widthMm:null,heightMm:null,centerNormalizedX:.5,centerNormalizedY:.5};
const safe:SafetyContext={inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,weaponUnloadedVerified:true,
 magazineRemoved:true,chamberVisualPhysicalCheck:true,liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,
 dummyRoundsAllowed:false,dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};
const historical={
 A:{shape:"compact",observations:["CENTERED_AND_COMPACT","CENTERED","COMPACT_GROUP","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:[]},
 B:{shape:"compact",observations:["COMPACT_BUT_OFFSET","OFFSET_LEFT","COMPACT_GROUP","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["EQUIPMENT_OR_SIGHT_ISSUE","LATERAL_TRIGGER_PRESSURE","TWO_HAND_CONTRIBUTION","SIGHT_ALIGNMENT_VARIATION"]},
 C:{shape:"vertical",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","VERTICAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 D:{shape:"horizontal",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","HORIZONTAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 E:{shape:"both_axes",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 F:{shape:"both_axes",observations:["OUTLIER_TO_VERIFY","CENTERED_AND_COMPACT","CENTERED","COMPACT_GROUP","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["SHOT_ANTICIPATION"]},
 G:{shape:"horizontal",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","HORIZONTAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 H:{shape:"vertical",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","VERTICAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 I:{shape:"horizontal",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","HORIZONTAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 J:{shape:"horizontal",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","HORIZONTAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 K:{shape:"horizontal",observations:["CENTERED_BUT_DISPERSED","CENTERED","WIDE_GROUP","HORIZONTAL_SPREAD","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"]},
 L:{shape:"compact",observations:["CENTERED_AND_COMPACT","CENTERED","COMPACT_GROUP","MANUAL_INPUT_LIMITATION","TARGET_GEOMETRY_UNVERIFIED"],hypotheses:[]},
} as const;

function metrics(code:string,points:{x:number;y:number}[]){return calculateSeriesMetrics({
 impacts:points.map((point,index)=>({id:`${code}-${index}`,normalizedX:point.x,normalizedY:point.y,isExcluded:false})),
 expectedShotCount:points.length,recordedShotCount:points.length,geometry,computedAt:"2026-01-01T00:00:00.000Z"});}

function certification(code:string){
 const scenario=syntheticScenarioCatalog.find(item=>item.code===code)!;
 const source=runSyntheticScenario(scenario);const primary=source.hypotheses[0]??null;
 const selection=primary?selectConfirmationTest({hypothesis:primary,alternatives:source.hypotheses.slice(1),sessionMode:"coaching_free",
  safety:safe,userCanPerform:true,contextKnown:true}):null;
 const outcome=scenario.expectation.expectedTestOutcome;
 const proposal=primary&&outcome?proposeCoaching({hypothesis:primary,testRunId:`${code}-test`,outcome,sessionId:`demo-${code}`,
  level:scenario.profile.level,safety:safe,now:"2026-01-01T00:00:00.000Z"}):null;
 let controlOutcome=null;
 if(scenario.controlImpacts){
  const sourceMetrics=metrics(`${code}-source`,scenario.sourceImpacts);const controlMetrics=metrics(`${code}-control`,scenario.controlImpacts);
  const context=(id:string)=>({id,sessionId:`demo-${code}`,status:"completed" as const,weaponId:scenario.weaponId,
   distanceMm:scenario.distanceMm,numberOfHands:2 as const,targetTypeId:scenario.targetTypeId,targetGeometryVersion:geometry.version});
  const comparison={...compareSeries({baseline:context("source"),compared:context("control"),baselineMetrics:sourceMetrics,
   comparedMetrics:controlMetrics,comparisonType:"manual"}),id:`${code}-comparison`,computedAt:"2026-01-01T00:00:00.000Z"} as SeriesComparison;
  controlOutcome=evaluateCoachingOutcome(comparison,proposal?.recommendation.objective??"dispersion");
 }
 return{scenario,source,selection,proposal,controlOutcome,
  missingDeclaredObservations:scenario.expectation.observationCodes.filter(item=>!source.observationCodes.includes(item)),
  presentAllowedHypotheses:scenario.expectation.allowedHypotheses.filter(item=>source.hypotheses.some(h=>h.hypothesisCode===item)),
 };
}

describe("certification historique end-to-end des scénarios A à L",()=>{
 it("conserve exactement douze scénarios v1",()=>expect(syntheticScenarioCatalog.map(s=>[s.code,s.version])).toEqual(
  "ABCDEFGHIJKL".split("").map(code=>[code,"synthetic-scenarios-v1"])));

 it.each(Object.entries(historical))("verrouille le résultat historique du scénario %s",(code,expected)=>{const result=runSyntheticScenario(
  syntheticScenarioCatalog.find(item=>item.code===code)!);expect({shape:result.metrics.shapeClassification,observations:result.observationCodes,
   hypotheses:result.hypotheses.map(h=>h.hypothesisCode)}).toEqual(expected);expect(result.warnings).toEqual([]);});

 const observationAudit={A:[],B:[],C:[],D:[],E:["TWO_AXIS_SPREAD"],F:[],G:[],H:["COMPARISON_LIMITED"],I:[],J:[],K:[],L:[]} as const;
 it.each(Object.entries(observationAudit))("exécute l’audit des observations déclarées du scénario %s",(code,missing)=>
  expect(certification(code).missingDeclaredObservations).toEqual(missing));

 const allowedPresent={A:[],B:["EQUIPMENT_OR_SIGHT_ISSUE","LATERAL_TRIGGER_PRESSURE"],C:[],
  D:["INCONSISTENT_GRIP_PRESSURE","SIGHT_ALIGNMENT_VARIATION"],E:["INCONSISTENT_GRIP_PRESSURE"],F:[],G:[],H:[],I:[],J:[],K:[],L:[]} as const;
 it.each(Object.entries(allowedPresent))("inventorie sans les rendre obligatoires les hypothèses autorisées présentes pour %s",(code,present)=>
  expect(certification(code).presentAllowedHypotheses).toEqual(present));

 it("exécute le test réellement proposé pour I et constate l’écart historique",()=>{const result=certification("I");
  expect(result.selection?.primary?.code).toBe("TEST_GRIP_CONSTANCY");expect(result.scenario.expectation.expectedTestCode).toBe("TEST_SIGHT_STABILITY_DRY");
  expect(result.selection?.primary?.possibleOutcomes).toContain(result.scenario.expectation.expectedTestOutcome);expect(result.proposal).toBeNull();});
 it("exécute test, recommandation et contrôle pour J sans masquer les écarts",()=>{const result=certification("J");
  expect(result.selection?.primary?.code).toBe("TEST_GRIP_CONSTANCY");expect(result.scenario.expectation.expectedTestCode).toBe("TEST_SIGHT_STABILITY_DRY");
  expect(result.proposal?.recommendation.recommendationCode).toBe("REC_GRIP_CONSTANCY");expect(result.scenario.expectation.expectedRecommendationCode).toBe("REC_TRIGGER_AXIS");
  expect(result.controlOutcome).toBe("objective_improved");});
 it("exécute la répétition de G sur deux occurrences de ses données historiques",()=>{const scenario=syntheticScenarioCatalog.find(item=>item.code==="G")!;
  const seriesMetrics=metrics("G-repeat",scenario.sourceImpacts);const first=observeSeries({sessionId:"demo-G",seriesId:"G-1",metrics:seriesMetrics});
  const second=observeSeries({sessionId:"demo-G",seriesId:"G-2",metrics:seriesMetrics});
  expect(repeatedSessionObservations({sessionId:"demo-G",bySeries:[{seriesId:"G-1",sequenceNumber:1,observations:first},
   {seriesId:"G-2",sequenceNumber:2,observations:second}]}).map(item=>item.observationCode)).toContain("HORIZONTAL_SPREAD");});
 it("exécute le contrôle amélioré de K",()=>expect(certification("K").controlOutcome).toBe("objective_improved"));
 it("exécute le contrôle dégradé de L",()=>expect(certification("L").controlOutcome).toBe("objective_worsened"));
});
