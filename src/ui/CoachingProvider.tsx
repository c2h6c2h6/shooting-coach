import { randomUUID } from "expo-crypto";
import { createContext,PropsWithChildren,useContext,useMemo } from "react";
import { CoachingCycle,CoachingOutcome,ConfirmationOutcome,ConfirmationTestRun,SafetyContext,SessionSafetyContext,ShooterLevel } from "../domain/coachingTypes";
import { proposeCoaching } from "../domain/coachingCycleEngine";
import { COACHING_RULESET_VERSION } from "../domain/coachingTypes";
import { TechnicalHypothesis } from "../domain/technicalHypothesis";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteCoachingRepository } from "../infrastructure/coaching/sqliteCoachingRepository";
import { MvpValidationRepository } from "../application/mvpValidationRepository";
import { createReasoningTrace } from "../domain/reasoningJournal";
import { SqliteSeriesRepository } from "../infrastructure/series/sqliteSeriesRepository";
import { SqliteSeriesComparisonRepository } from "../infrastructure/comparisons/sqliteSeriesComparisonRepository";
import { SqliteSeriesMetricsRepository } from "../infrastructure/metrics/sqliteSeriesMetricsRepository";
import { isPedagogicallySignificantAtypicalImpact } from "../domain/shootingObservation";
import type { Series } from "../domain/series";
import { confirmationTestCatalog } from "../domain/confirmationTestCatalog";
import { outcomeForTestObservation } from "../domain/confirmationTestObservation";
import { EMPTY_SAFETY_CONTEXT, specificSafetyKeys } from "../domain/sessionSafetyContext";
import { ControlSeriesInterpretation,interpretControlSeries } from "../domain/controlSeriesInterpretation";
import { trainingDrillCatalog } from "../domain/trainingDrillCatalog";
import { safetyBlockers } from "../domain/coachingSafetyRules";
import { applyConfirmationOutcomeToHypothesis,completionTransitionForOutcome } from "../domain/confirmationOutcomeTransition";
import {completeTechnicalObservationControl,controlModeForCycle,prepareTechnicalObservationControl} from "../domain/technicalObservationControl";
import {triggerHandIndependenceInterventionForOutcome} from "../domain/pedagogical-v2/triggerHandIndependencePedagogicalChain";
import {wristInterventionForOutcome} from "../domain/pedagogical-v2/wristStabilityPedagogicalChain";
import {sightAlignmentInterventionForOutcome} from "../domain/pedagogical-v2/sightAlignmentPedagogicalChain";
import {e1AnticipationInterventionForOutcome} from "../domain/pedagogical-v2/e1AnticipationPedagogicalChain";
import {
 CONTROLLED_BIAS_CONFIRMATION_TEST_CODE,
 confirmationOutcomeFor,
 deriveDiagnosticConfirmationResult,
 type DiagnosticConfirmationResult,
} from "./diagnosticConfirmationFlow";
interface Service{
 start(h:TechnicalHypothesis,testCode:string,safety:SafetyContext):Promise<{cycle:CoachingCycle;test:ConfirmationTestRun}>;
 complete(cycle:CoachingCycle,test:ConfirmationTestRun,observation:string,level:ShooterLevel,safety:SafetyContext):Promise<{cycle:CoachingCycle;test:ConfirmationTestRun;outcome:ConfirmationOutcome;hasWork:boolean}>;
 cancel(cycle:CoachingCycle,test:ConfirmationTestRun):Promise<void>;
 createControl(cycle:CoachingCycle,instruction:string,objective:string,safety:SafetyContext):Promise<string>;
 completeTechnicalControl(cycle:CoachingCycle,observationCode:string):Promise<{cycle:CoachingCycle;outcome:CoachingOutcome}>;
 active(sessionId:string):ReturnType<SqliteCoachingRepository["getActiveCycle"]>;
 sessionSafety(sessionId:string):Promise<SessionSafetyContext|null>;
 validateSessionSafety(sessionId:string,conditions:SafetyContext):Promise<SessionSafetyContext>;
 createBiasConfirmation(h:TechnicalHypothesis,instruction:string,objective:string):Promise<Series>;
 findBiasConfirmation(h:TechnicalHypothesis):Promise<Series|null>;
 resolveBiasConfirmation(seriesId:string):Promise<DiagnosticConfirmationResult|null>;
 resolveControlSeries(seriesId:string):Promise<(ControlSeriesInterpretation&{cycle:CoachingCycle})|null>;
}
const Context=createContext<Service|null>(null);
export function CoachingProvider({children}:PropsWithChildren){
 const value=useMemo<Service>(()=>({
  async start(h,testCode,safety){const db=await getDatabase(),repo=new SqliteCoachingRepository(db),now=new Date().toISOString();
   const definition=confirmationTestCatalog.find(item=>item.code===testCode);
   if(!definition)throw new Error("Test de confirmation inconnu.");
   const confirmedSafetyKeys=specificSafetyKeys(definition,EMPTY_SAFETY_CONTEXT).filter(key=>safety[key]);
   const test:ConfirmationTestRun={id:randomUUID(),sessionId:h.sessionId,sourceSeriesId:h.seriesId!,hypothesisId:h.id,testCode,status:"in_progress",
    startedAt:now,completedAt:null,outcome:null,observations:[],userAnswers:{confirmedSpecificSafety:JSON.stringify(confirmedSafetyKeys)},confidenceBefore:h.confidenceLevel,
    confidenceAfter:null,hypothesisStatusBefore:h.status,hypothesisStatusAfter:null,generatedSeriesId:null,rulesetVersion:COACHING_RULESET_VERSION};
   const cycle:CoachingCycle={id:randomUUID(),sessionId:h.sessionId,sourceSeriesId:h.seriesId!,hypothesisId:h.id,
    confirmationTestRunId:test.id,recommendationId:null,drillCode:null,controlSeriesId:null,status:"test_pending",outcome:null,
    objective:null,startedAt:now,completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:COACHING_RULESET_VERSION};
   await repo.createCycle(cycle,test);
   await new MvpValidationRepository(db).saveTrace(createReasoningTrace({id:randomUUID(),cycleId:cycle.id,sessionId:h.sessionId,
    sourceSeriesId:h.seriesId!,createdAt:now,sourceSnapshot:{observationId:h.observationId,hypothesisId:h.id},
    retainedObservationCodes:[String(h.applicableContext.observationCode??h.observationId)],rejectedObservations:[],hypotheses:[h],
    rankingReason:`Hypothèse de rang ${h.rank}, score interne déterministe conservé pour audit.`,
    testChoiceReason:`Test ${testCode} choisi pour départager l’hypothèse principale.`,recommendationChoiceReason:null,objective:null}));
   return{cycle,test};},
  async complete(cycle,test,observation,level,safety){const db=await getDatabase(),repo=new SqliteCoachingRepository(db),now=new Date().toISOString();
   const hrow=await db.getFirstAsync<{result_json:string}>("SELECT result_json FROM technical_hypotheses WHERE id=?",cycle.hypothesisId);
   if(!hrow)throw new Error("Hypothèse source introuvable.");const h=JSON.parse(hrow.result_json) as TechnicalHypothesis;
   const session=await db.getFirstAsync<{number_of_hands:1|2|null}>("SELECT number_of_hands FROM sessions WHERE id=?",cycle.sessionId);
   if(!session)throw new Error("Séance source introuvable.");
   const outcome=outcomeForTestObservation(test.testCode,h.hypothesisCode,observation);
   const transition=completionTransitionForOutcome(outcome);
   const updatedHypothesis=applyConfirmationOutcomeToHypothesis(h,outcome);
   const nextTest={...test,status:"completed" as const,completedAt:now,outcome,observations:[...test.observations,observation],confidenceAfter:h.confidenceLevel,
    hypothesisStatusAfter:transition.hypothesisStatus};
   const d2TechnicalIntervention=transition.shouldProposeDrill&&h.hypothesisCode==="TRIGGER_FINGER_HAND_COACTIVATION"
    ?triggerHandIndependenceInterventionForOutcome(outcome):null;
   const wristTechnicalIntervention=transition.shouldProposeDrill?wristInterventionForOutcome(h.hypothesisCode,outcome):null;
   const alignmentTechnicalIntervention=transition.shouldProposeDrill&&h.hypothesisCode==="SIGHT_ALIGNMENT_VARIATION"
    ?sightAlignmentInterventionForOutcome(outcome):null;
   const e1TechnicalIntervention=transition.shouldProposeDrill&&h.hypothesisCode==="SHOT_ANTICIPATION"
    ?e1AnticipationInterventionForOutcome(outcome):null;
   const proposal=transition.shouldProposeDrill&&!d2TechnicalIntervention?proposeCoaching({hypothesis:h,testRunId:test.id,outcome,sessionId:cycle.sessionId,level,
    numberOfHands:session.number_of_hands,safety,now}):null;
   const technicalIntervention=d2TechnicalIntervention??(proposal?(wristTechnicalIntervention??alignmentTechnicalIntervention??e1TechnicalIntervention):null);
   const baseNext={...cycle,status:(proposal?"drill_pending":transition.cycleStatus) as CoachingCycle["status"],
    recommendationId:proposal?randomUUID():null,drillCode:proposal?.drill.code??null,objective:proposal?.recommendation.objective??null,
    completedAt:transition.cycleStatus==="completed"?now:cycle.completedAt,
    controlMode:proposal?"series_comparison" as const:cycle.controlMode};
   const next=technicalIntervention?prepareTechnicalObservationControl(baseNext,technicalIntervention.control):baseNext;
   await db.runAsync("UPDATE technical_hypotheses SET status=?, result_json=? WHERE id=?",
    updatedHypothesis.status,JSON.stringify(updatedHypothesis),updatedHypothesis.id);
   await repo.saveTest(nextTest);if(proposal&&next.recommendationId)await repo.saveRecommendation({id:next.recommendationId,...proposal.recommendation});
   await repo.saveCycle(next);return{cycle:next,test:nextTest,outcome,hasWork:Boolean(proposal||technicalIntervention)};},
  async cancel(cycle,test){const repo=new SqliteCoachingRepository(await getDatabase());const now=new Date().toISOString();
   await repo.saveTest({...test,status:"cancelled",completedAt:now});await repo.saveCycle({...cycle,status:"cancelled",completedAt:now});},
  async createControl(cycle,instruction,objective,safety){const db=await getDatabase(),seriesRepo=new SqliteSeriesRepository(db,randomUUID),repo=new SqliteCoachingRepository(db);
   if(controlModeForCycle(cycle)==="technical_observation")throw new Error("Ce contrôle ne nécessite pas de série corrective.");
   const drill=trainingDrillCatalog.find(item=>item.code===cycle.drillCode);if(!drill)throw new Error("Exercice introuvable.");
   const blockers=safetyBlockers(drill,safety);if(blockers.length)throw new Error(blockers.join(" "));
   const series=await seriesRepo.create({sessionId:cycle.sessionId,type:"corrective",expectedShotCount:5,instruction,pedagogicalObjective:objective,cadenceType:"free"});
   await repo.saveCycle({...cycle,controlSeriesId:series.id,status:"control_series_pending"});return series.id;},
  async completeTechnicalControl(cycle,observationCode){
   if(!cycle.technicalControl)throw new Error("Définition du contrôle technique introuvable.");
   const completed=completeTechnicalObservationControl({cycle,definition:cycle.technicalControl,observationCode,
    evaluationId:randomUUID(),evidenceId:randomUUID(),evaluatedAt:new Date().toISOString()});
   await new SqliteCoachingRepository(await getDatabase()).saveCycle(completed);
   return{cycle:completed,outcome:completed.outcome!};
  },
  async active(sessionId){return new SqliteCoachingRepository(await getDatabase()).getActiveCycle(sessionId);},
  async sessionSafety(sessionId){return new SqliteCoachingRepository(await getDatabase()).getSessionSafety(sessionId);},
  async validateSessionSafety(sessionId,conditions){const context={sessionId,conditions,validatedAt:new Date().toISOString()};
   await new SqliteCoachingRepository(await getDatabase()).saveSessionSafety(context);return context;},
  async createBiasConfirmation(h,instruction,objective){
   const db=await getDatabase(),repo=new SqliteCoachingRepository(db),seriesRepo=new SqliteSeriesRepository(db,randomUUID);
   const existing=await repo.findTestRun(h.seriesId!,h.id,CONTROLLED_BIAS_CONFIRMATION_TEST_CODE);
   if(existing?.generatedSeriesId){const existingSeries=await seriesRepo.getById(existing.generatedSeriesId);if(existingSeries)
    return existingSeries.status==="planned"?seriesRepo.start(existingSeries.id):existingSeries;}
   if(await repo.getActiveCycle(h.sessionId))throw new Error("Un autre cycle de coaching est déjà actif pour cette séance.");
   const created=await seriesRepo.create({sessionId:h.sessionId,type:"diagnostic",expectedShotCount:5,
    instruction,pedagogicalObjective:objective,durationSeconds:null,cadenceType:"free",
    notes:`Question diagnostique : ${objective}`});
   const now=new Date().toISOString();
   const test:ConfirmationTestRun={id:randomUUID(),sessionId:h.sessionId,sourceSeriesId:h.seriesId!,hypothesisId:h.id,
    testCode:CONTROLLED_BIAS_CONFIRMATION_TEST_CODE,status:"in_progress",startedAt:now,completedAt:null,outcome:null,
    observations:[],userAnswers:{},confidenceBefore:h.confidenceLevel,confidenceAfter:null,
    hypothesisStatusBefore:h.status,hypothesisStatusAfter:null,generatedSeriesId:created.id,rulesetVersion:COACHING_RULESET_VERSION};
   const cycle:CoachingCycle={id:randomUUID(),sessionId:h.sessionId,sourceSeriesId:h.seriesId!,hypothesisId:h.id,
    confirmationTestRunId:test.id,recommendationId:null,drillCode:null,controlSeriesId:null,status:"test_pending",outcome:null,
    objective:null,startedAt:now,completedAt:null,invalidatedAt:null,invalidationReason:null,rulesetVersion:COACHING_RULESET_VERSION};
   await repo.createCycle(cycle,test);
   return seriesRepo.start(created.id);
  },
  async findBiasConfirmation(h){
   const db=await getDatabase(),repo=new SqliteCoachingRepository(db),seriesRepo=new SqliteSeriesRepository(db,randomUUID);
   const run=await repo.findTestRun(h.seriesId!,h.id,CONTROLLED_BIAS_CONFIRMATION_TEST_CODE);
   return run?.generatedSeriesId?seriesRepo.getById(run.generatedSeriesId):null;
  },
  async resolveBiasConfirmation(seriesId){
   const db=await getDatabase(),repo=new SqliteCoachingRepository(db),seriesRepo=new SqliteSeriesRepository(db,randomUUID);
   const run=await repo.getTestRunByGeneratedSeriesId(seriesId);if(!run)return null;
   const [sourceSeries,diagnosticSeries,cycle]=await Promise.all([
    seriesRepo.getById(run.sourceSeriesId),seriesRepo.getById(seriesId),repo.getCycleByTestRunId(run.id),
   ]);
   if(!sourceSeries||!diagnosticSeries||diagnosticSeries.status!=="completed")return null;
   const comparison=await new SqliteSeriesComparisonRepository(db,randomUUID)
    .compareAndSave(sourceSeries.id,diagnosticSeries.id,"manual");
   const metricsRepo=new SqliteSeriesMetricsRepository(db,randomUUID);
   const [sourceMetrics,diagnosticMetrics]=await Promise.all([
    metricsRepo.getLatest(sourceSeries.id).then(value=>value??metricsRepo.calculateAndSave(sourceSeries.id)),
    metricsRepo.getLatest(diagnosticSeries.id).then(value=>value??metricsRepo.calculateAndSave(diagnosticSeries.id)),
   ]);
   const result=deriveDiagnosticConfirmationResult({comparison,sourceSeries,diagnosticSeries,
    sourceHasSignificantAtypicalImpact:isPedagogicallySignificantAtypicalImpact(sourceMetrics),
    diagnosticHasSignificantAtypicalImpact:isPedagogicallySignificantAtypicalImpact(diagnosticMetrics)});
   const now=new Date().toISOString();
   if(run.status!=="completed")await repo.saveTest({...run,status:"completed",completedAt:now,
    outcome:confirmationOutcomeFor(result),observations:[result.headline,result.interpretation],confidenceAfter:run.confidenceBefore,
    hypothesisStatusAfter:result.conclusion==="strengthened"?"strengthened":result.conclusion==="weakened"?"weakened":"requires_confirmation"});
   if(cycle&&cycle.status!=="completed"&&cycle.status!=="cancelled")await repo.saveCycle({...cycle,status:"completed",completedAt:now});
   return result;
  },
  async resolveControlSeries(seriesId){
   const db=await getDatabase(),repo=new SqliteCoachingRepository(db),seriesRepo=new SqliteSeriesRepository(db,randomUUID);
   const cycle=await repo.getCycleByControlSeriesId(seriesId);if(!cycle)return null;
   const [sourceSeries,controlSeries]=await Promise.all([
    seriesRepo.getById(cycle.sourceSeriesId),seriesRepo.getById(seriesId),
   ]);
   if(!sourceSeries||!controlSeries||controlSeries.status!=="completed")return null;
   const metricsRepo=new SqliteSeriesMetricsRepository(db,randomUUID);
   const [sourceMetrics,controlMetrics]=await Promise.all([
    metricsRepo.getLatest(sourceSeries.id).then(value=>value??metricsRepo.calculateAndSave(sourceSeries.id)),
    metricsRepo.getLatest(controlSeries.id).then(value=>value??metricsRepo.calculateAndSave(controlSeries.id)),
   ]);
   const comparison=await new SqliteSeriesComparisonRepository(db,randomUUID)
    .compareAndSave(sourceSeries.id,controlSeries.id,"manual");
   const interpretation=interpretControlSeries({objective:cycle.objective,sourceMetrics,controlMetrics,comparison});
   if(cycle.status!=="completed"&&cycle.status!=="cancelled"){
    await repo.saveCycle({...cycle,status:"completed",outcome:interpretation.outcome,
     completedAt:new Date().toISOString()});
   }
   return{...interpretation,cycle};
  },
 }),[]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCoaching(){const v=useContext(Context);if(!v)throw new Error("CoachingProvider absent.");return v;}
