import { calculateSeriesMetrics, SeriesMetrics } from "./seriesMetrics";
import { observeSeries } from "./shootingObservation";
import { generateTechnicalHypotheses, TechnicalHypothesis } from "./technicalHypothesis";
import { SyntheticScenario } from "./mvpValidationTypes";
const geometry={version:"synthetic-target-v1",widthMm:null,heightMm:null,centerNormalizedX:.5,centerNormalizedY:.5};
export interface SyntheticRunResult{
 scenarioCode:string;partition:"demo";metrics:SeriesMetrics;observationCodes:string[];
 hypotheses:TechnicalHypothesis[];warnings:string[];
}
export function runSyntheticScenario(s:SyntheticScenario):SyntheticRunResult{
 const impacts=s.sourceImpacts.map((p,i)=>({id:`${s.code}-impact-${i+1}`,normalizedX:p.x,normalizedY:p.y,isExcluded:false}));
 const metrics=calculateSeriesMetrics({impacts,expectedShotCount:impacts.length,recordedShotCount:impacts.length,geometry,computedAt:"2026-01-01T00:00:00.000Z"});
 const observations=observeSeries({sessionId:`demo-${s.code}`,seriesId:`demo-${s.code}-source`,metrics,generatedAt:"2026-01-01T00:00:00.000Z"});
 const all=[observations.primary,...observations.secondary,...observations.limitations].filter(Boolean);
 const hypotheses=generateTechnicalHypotheses({observations:all.map((o,i)=>({...o!,id:`demo-observation-${i}`})),laterality:s.profile.laterality,impactCount:impacts.length,
  generatedAt:"2026-01-01T00:00:00.000Z"}).map((h,i)=>({...h,id:`demo-hypothesis-${i}`}));
 const warnings:string[]=[];
 if(s.expectation.forbiddenHypotheses.some(code=>hypotheses.some(h=>h.hypothesisCode===code)))warnings.push("Une hypothèse interdite par le scénario a été générée.");
 if(s.code==="F"&&metrics.potentiallyAtypicalImpactIds.length===0)warnings.push("L’impact éloigné n’a pas été signalé.");
 return{scenarioCode:s.code,partition:"demo",metrics,observationCodes:all.map(o=>o!.observationCode),hypotheses,warnings};
}
