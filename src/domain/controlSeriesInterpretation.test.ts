import { describe, expect, it } from "vitest";
import type { CoachingObjective } from "./coachingTypes";
import { interpretControlSeries } from "./controlSeriesInterpretation";
import { compareSeries, SeriesComparison } from "./seriesComparison";
import { calculateSeriesMetrics } from "./seriesMetrics";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "./targetCoordinateConversion";

const geometry = {version:UNVERIFIED_TARGET_GEOMETRY_VERSION,widthMm:null,heightMm:null,centerNormalizedX:.5,centerNormalizedY:.5};
const context=(id:string)=>({id,sessionId:"session",status:"completed" as const,weaponId:"weapon",distanceMm:7000,
 numberOfHands:2 as const,targetTypeId:"target",targetGeometryVersion:UNVERIFIED_TARGET_GEOMETRY_VERSION});
const metrics=(id:string,points:ReadonlyArray<readonly[number,number]>)=>calculateSeriesMetrics({
 impacts:points.map(([normalizedX,normalizedY],index)=>({id:`${id}-${index}`,normalizedX,normalizedY,isExcluded:false})),
 expectedShotCount:5,recordedShotCount:points.length,geometry,computedAt:"now"});
function run(sourcePoints:ReadonlyArray<readonly[number,number]>,controlPoints:ReadonlyArray<readonly[number,number]>,objective:CoachingObjective){
 const source=metrics("source",sourcePoints),control=metrics("control",controlPoints);
 const draft=compareSeries({baseline:context("source"),compared:context("control"),baselineMetrics:source,
  comparedMetrics:control,comparisonType:"manual"});
 const comparison={id:"comparison",computedAt:"now",...draft} as SeriesComparison;
 return {source,control,comparison,result:interpretControlSeries({objective,sourceMetrics:source,controlMetrics:control,comparison})};
}
const centered=[[.495,.495],[.505,.495],[.495,.505],[.505,.505],[.5,.5]] as const;
const outlier=[[.495,.495],[.505,.495],[.495,.505],[.505,.505],[.35,.65]] as const;
const offset=[[.645,.495],[.655,.495],[.645,.505],[.655,.505],[.65,.5]] as const;
const dispersed=[[.35,.35],[.65,.35],[.35,.65],[.65,.65],[.5,.5]] as const;

describe("interprétation contextuelle de la série de contrôle",()=>{
 it("fait primer l’amélioration lorsqu’un impact isolé ne se reproduit pas",()=>{
  const value=run(outlier,centered,"horizontal_stability");
  expect(value.source.potentiallyAtypicalImpactIds).toHaveLength(1);
  expect(value.control.potentiallyAtypicalImpactIds).toHaveLength(0);
  expect(value.result).toMatchObject({outcome:"objective_improved",evaluatedProblem:"punctual_perturbation",
   headline:"Le groupement est maintenant resserré et l’impact isolé observé sur la série de référence ne se reproduit pas."});
 });
 it("signale que le problème reste présent lorsque l’impact isolé se reproduit",()=>{
  const value=run(outlier,outlier,"horizontal_stability").result;
  expect(value.outcome).toBe("objective_stable");expect(value.interpretation).toContain("reste présent");
 });
 it("reste non concluant lorsque l’effectif du contrôle est insuffisant",()=>{
  const value=run(outlier,centered.slice(0,2),"horizontal_stability").result;
  expect(value.outcome).toBe("insufficient_data");expect(value.interpretation).toContain("ne permettent pas de conclure");
 });
 it("interprète le recentrage d’un vrai biais constant",()=>{
  const value=run(offset,centered,"centering").result;
  expect(value).toMatchObject({outcome:"objective_improved",evaluatedProblem:"centering"});
  expect(value.headline).toContain("se rapproche");
 });
 it("conserve l’absence d’amélioration lorsque le biais reste identique",()=>{
  const value=run(offset,offset,"centering").result;
  expect(value.outcome).toBe("objective_stable");expect(value.interpretation).toContain("ne suffit pas encore");
 });
 it("évalue une réduction de dispersion sur les mesures de dispersion",()=>{
  const value=run(dispersed,centered,"dispersion").result;
  expect(value).toMatchObject({outcome:"objective_improved",evaluatedProblem:"dispersion"});
  expect(value.headline).toContain("dispersion");
 });
});
