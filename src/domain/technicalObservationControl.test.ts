import {readFileSync} from "node:fs";
import {resolve} from "node:path";
import {describe,expect,it,vi} from "vitest";
import type {CoachingCycle} from "./coachingTypes";
import {
 buildTechnicalCompetenceEvaluation,completeTechnicalObservationControl,controlModeForCycle,
 d2TriggerHandTechnicalControl,prepareTechnicalObservationControl,
 type TechnicalObservationControlDefinition,
} from "./technicalObservationControl";
import {triggerHandIndependencePedagogicalChain} from "./pedagogical-v2/triggerHandIndependencePedagogicalChain";
import {SqliteCoachingRepository} from "../infrastructure/coaching/sqliteCoachingRepository";
import {competenceEvaluationSchema} from "./pedagogical-v2/inputSchemas";

const cycle=():CoachingCycle=>({id:"cycle",sessionId:"session",sourceSeriesId:"source",hypothesisId:"hypothesis",
 confirmationTestRunId:"test",recommendationId:null,drillCode:null,controlSeriesId:null,status:"drill_pending",
 outcome:null,objective:null,startedAt:"start",completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:"v"});

describe("contrôle pédagogique technique observable",()=>{
 it("déclare deux modes sans modifier le mode historique implicite",()=>{
  expect(controlModeForCycle(cycle())).toBe("series_comparison");
  expect(d2TriggerHandTechnicalControl.mode).toBe("technical_observation");
 });

 it("prépare D2.2 en evaluation_pending sans série de contrôle",()=>{
  const prepared=prepareTechnicalObservationControl(cycle(),d2TriggerHandTechnicalControl);
  expect(prepared).toMatchObject({status:"evaluation_pending",controlSeriesId:null,
   controlMode:"technical_observation",technicalControl:{definitionCode:"CONTROL-D2-INDEPENDENCE-01"}});
 });

 it("expose les quatre observations factuelles D2.2",()=>expect(d2TriggerHandTechnicalControl.observationCriteria
  .map(item=>item.label)).toEqual(["Autres doigts désormais sensiblement stables",
   "Co-activation encore présente mais diminuée","Co-activation comparable à avant",
   "Résultat variable ou non interprétable"]));

 it.each([
  ["fingers_stable","objective_improved","strengthens"],
  ["coactivation_reduced","mixed_result","strengthens"],
  ["coactivation_comparable","objective_stable","neutral"],
  ["variable_or_inconclusive","insufficient_data","neutral"],
 ] as const)("mappe %s vers %s et %s",(observationCode,outcome,effect)=>{
  const evaluation=buildTechnicalCompetenceEvaluation({definition:d2TriggerHandTechnicalControl,observationCode,
   evaluationId:"evaluation",evidenceId:"evidence",evaluatedAt:"2026-08-28T00:00:00.000Z",cycleId:"cycle"});
  expect(evaluation.structuredResult).toMatchObject({observationCode,outcome});
  expect(evaluation.evidenceSnapshots[0]?.effect).toBe(effect);
 });

 it("clôture le cycle sans controlSeriesId et sans décision ni maîtrise",()=>{
  const prepared=prepareTechnicalObservationControl(cycle(),d2TriggerHandTechnicalControl);
  const result=completeTechnicalObservationControl({cycle:prepared,definition:d2TriggerHandTechnicalControl,
   observationCode:"fingers_stable",evaluationId:"evaluation",evidenceId:"evidence",evaluatedAt:"2026-08-28T00:00:00.000Z"});
  expect(result).toMatchObject({status:"completed",outcome:"objective_improved",controlSeriesId:null,
   pedagogicalDecision:null,masteryEvent:null});
  expect(result.competenceEvaluation?.structuredResult).toMatchObject({observationCode:"fingers_stable"});
  expect(competenceEvaluationSchema.safeParse(result.competenceEvaluation).success).toBe(true);
 });

 it("préserve explicitement la branche historique à cinq impacts",()=>{
  const source=readFileSync(resolve(process.cwd(),"src/ui/CoachingProvider.tsx"),"utf8");
  expect(source).toMatch(/createControl[\s\S]*?type:"corrective",expectedShotCount:5/);
  expect(source).toMatch(/resolveControlSeries[\s\S]*?SqliteSeriesMetricsRepository[\s\S]*?compareAndSave[\s\S]*?interpretControlSeries/);
 });

 it("la définition est générique pour une future fixture poignet sans catalogue B6",()=>{
  const wrist={...d2TriggerHandTechnicalControl,definitionCode:"FIXTURE-WRIST",competenceId:"fixture:wrist",
   exerciseDefinitionId:"fixture:wrist-exercise",observationCriteria:[
    {code:"stable",label:"Poignet stable",outcome:"objective_improved",evidenceEffect:"strengthens",evidenceStrength:1},
   ]} satisfies TechnicalObservationControlDefinition;
  expect(prepareTechnicalObservationControl(cycle(),wrist).technicalControl?.definitionCode).toBe("FIXTURE-WRIST");
 });

 it("le binding D2.2 transporte le contrôle technique",()=>expect(triggerHandIndependencePedagogicalChain.control)
  .toMatchObject({mode:"technical_observation",definitionCode:"CONTROL-D2-INDEPENDENCE-01"}));

 it("persiste et relit l’évaluation depuis coaching_cycles.result_json",async()=>{
  let stored="";const db={runAsync:vi.fn(async(_sql:string,...params:unknown[])=>{stored=String(params.at(-1));}),
   getFirstAsync:vi.fn(async()=>({result_json:stored})),getAllAsync:vi.fn(),withTransactionAsync:vi.fn()} as never;
  const repo=new SqliteCoachingRepository(db),prepared=prepareTechnicalObservationControl(cycle(),d2TriggerHandTechnicalControl);
  const completed=completeTechnicalObservationControl({cycle:prepared,definition:d2TriggerHandTechnicalControl,
   observationCode:"coactivation_reduced",evaluationId:"evaluation",evidenceId:"evidence",
   evaluatedAt:"2026-08-28T00:00:00.000Z"});
  await repo.saveCycle(completed);
  expect(await repo.getCycle(completed.id)).toEqual(completed);
 });

 it("la branche technique n’appelle aucun moteur géométrique",()=>{
  const source=readFileSync(resolve(process.cwd(),"src/domain/technicalObservationControl.ts"),"utf8");
  expect(source).not.toMatch(/compareSeries|SeriesMetrics|interpretControlSeries|expectedShotCount/);
 });

 it("l’UI ne propose pas la création d’une série pour le mode technique",()=>{
  const source=readFileSync(resolve(process.cwd(),"app/sessions/[id]/series/[seriesId]/coaching.tsx"),"utf8");
  expect(source).toContain("Vérifier le résultat du travail");
  expect(source).toMatch(/controlMode.*technical_observation/);
 });
});
