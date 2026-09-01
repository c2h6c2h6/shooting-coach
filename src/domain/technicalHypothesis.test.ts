import {describe,expect,it} from "vitest";
import {generateTechnicalHypotheses} from "./technicalHypothesis";
import {ShootingObservation} from "./shootingObservation";
const observation=(code:ShootingObservation["observationCode"],laterality:"right"|"left"="right"):ShootingObservation=>({
 id:`o-${code}`,sessionId:"session-1",seriesId:"series-1",comparisonId:null,observationCode:code,
 category:code.startsWith("OFFSET")?"centering":"dispersion_shape",scope:"single_series",
 status:"confirmed_by_rules",magnitude:"medium",confidenceLevel:"low",rank:"primary",
 supportingMetrics:{laterality},limitingFactors:["Saisie manuelle des impacts."],
 algorithmVersion:"v",rulesetVersion:"v",thresholdsVersion:"v",sourceVersion:"v",generatedAt:"2026-01-01",
});
const run=(code:ShootingObservation["observationCode"],laterality:"right"|"left"="right",count=5,
 answers?:Record<string,"yes"|"no"|"uncertain"|"not_observed">)=>generateTechnicalHypotheses({
 observations:[observation(code,laterality)],laterality,impactCount:count,answers,generatedAt:"2026-01-01"});
describe("technical hypothesis engine",()=>{
 it.each(["OFFSET_LEFT","OFFSET_RIGHT","OFFSET_HIGH","OFFSET_LOW","OFFSET_HIGH_LEFT","OFFSET_HIGH_RIGHT",
  "OFFSET_LOW_LEFT","OFFSET_LOW_RIGHT","HORIZONTAL_SPREAD","TWO_AXIS_SPREAD"] as const)
  ("produit plusieurs causes prudentes pour %s",code=>{const out=run(code);expect(out.length).toBeGreaterThan(1);
   expect(out.every(x=>x.status!=="contradicted"&&x.confidenceLevel!=="high")).toBe(true);});
 it("conserve la seule piste active réellement restante pour VERTICAL_SPREAD",()=>
  expect(run("VERTICAL_SPREAD").map(item=>item.hypothesisCode)).toEqual(["WRIST_INSTABILITY"]));
 it("ne déduit plus la profondeur de l’index depuis la direction ou la latéralité",()=>{
  expect(run("OFFSET_LEFT","right").some(x=>x.hypothesisCode.startsWith("TRIGGER_FINGER_TOO_"))).toBe(false);
  expect(run("OFFSET_LEFT","left").some(x=>x.hypothesisCode.startsWith("TRIGGER_FINGER_TOO_"))).toBe(false);
  expect(run("OFFSET_LEFT","right")[0].sourceRules[0].startsWith("OFFSET_LEFT")).toBe(true);
 });
 it("inclut matériel pour un groupement compact décentré",()=>expect(run("COMPACT_BUT_OFFSET")
  .some(x=>x.hypothesisCode==="EQUIPMENT_OR_SIGHT_ISSUE")).toBe(true));
 it("favorise les biais constants pour un groupement resserré décentré",()=>{
  const out=generateTechnicalHypotheses({observations:[
    observation("COMPACT_BUT_OFFSET"),observation("OFFSET_RIGHT"),observation("COMPACT_GROUP"),
  ],laterality:"right",impactCount:5,generatedAt:"2026-01-01"});
  expect(out[0].hypothesisCode).toBe("EQUIPMENT_OR_SIGHT_ISSUE");
  expect(out.find(x=>x.hypothesisCode==="LATERAL_TRIGGER_PRESSURE")!.internalScore)
    .toBeGreaterThan(out.find(x=>x.hypothesisCode==="SIGHT_ALIGNMENT_VARIATION")?.internalScore??-99);
  expect(out.every(x=>x.hypothesisCode!=="INCONSISTENT_GRIP_PRESSURE")).toBe(true);
  expect(out[0].missingEvidence.some(x=>x.code==="repeat_same_conditions")).toBe(true);
 });
 it("écarte une cause variable du classement si le groupement est resserré",()=>{
  const out=generateTechnicalHypotheses({observations:[
    observation("COMPACT_BUT_OFFSET"),observation("TWO_AXIS_SPREAD"),
  ],laterality:"right",impactCount:5,generatedAt:"2026-01-01"});
  expect(out.some(x=>x.hypothesisCode==="INCONSISTENT_GRIP_PRESSURE")).toBe(false);
 });
 it("ne crée aucune cause négative pour centré et compact",()=>expect(run("CENTERED_AND_COMPACT")).toEqual([]));
 it("refuse de surinterpréter moins de cinq impacts",()=>expect(run("OFFSET_LEFT","right",4)).toEqual([]));
 it("limite à une principale et trois alternatives",()=>expect(run("OFFSET_LEFT").length).toBeLessThanOrEqual(4));
 it("assure une diversité de familles",()=>expect(new Set(run("OFFSET_LEFT").map(x=>x.category)).size).toBeGreaterThan(1));
 it("conserve score, règles, indices et informations manquantes",()=>{const h=run("OFFSET_LEFT")[0];
  expect(h.internalScore).toEqual(expect.any(Number));expect(h.sourceRules.length).toBeGreaterThan(0);
  expect(h.supportingEvidence.length).toBeGreaterThan(0);expect(h.missingEvidence.length).toBeGreaterThan(0);});
 it.each(["yes","no","uncertain"] as const)("le ressenti FELT_TENSION (%s) reste neutre pour E1",answer=>{
  const before=run("OFFSET_LOW").find(x=>x.hypothesisCode==="SHOT_ANTICIPATION")!;
  const after=run("OFFSET_LOW","right",5,{FELT_TENSION:answer}).find(x=>x.hypothesisCode==="SHOT_ANTICIPATION")!;
  expect(after.internalScore).toBe(before.internalScore);
  expect(after.status).toBe(before.status);
  expect(after.rank).toBe(before.rank);
  expect(after.supportingEvidence.some(x=>x.code==="ANSWER_FELT_TENSION")).toBe(false);
  expect(after.contradictingEvidence.some(x=>x.code==="ANSWER_FELT_TENSION")).toBe(false);
 });
 it("le ressenti FELT_TENSION ne modifie pas le classement E1 à lui seul",()=>{
  const before=run("OFFSET_LOW").map(x=>[x.hypothesisCode,x.rank,x.internalScore]);
  const after=run("OFFSET_LOW","right",5,{FELT_TENSION:"yes"}).map(x=>[x.hypothesisCode,x.rank,x.internalScore]);
  expect(after).toEqual(before);
 });
 it("n'expose ni pourcentage ni conseil ni exercice",()=>{const text=JSON.stringify(run("OFFSET_LEFT"));
  expect(text).not.toMatch(/%|corrigez|exercice recommandé|vous mettez/i);});
});
