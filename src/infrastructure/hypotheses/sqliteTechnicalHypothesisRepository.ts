import { TechnicalHypothesisRepository } from "../../application/technicalHypothesisRepository";
import { DiagnosticAnswerValue } from "../../domain/diagnosticQuestionCatalog";
import { generateTechnicalHypotheses, TechnicalHypothesis } from "../../domain/technicalHypothesis";
import { ShootingObservation } from "../../domain/shootingObservation";
import { Database } from "../database/types";
import { hypothesisStatusAfterHistoricalOutcome } from "../../domain/confirmationOutcomeTransition";
import type { ConfirmationOutcome } from "../../domain/coachingTypes";
import { isHistoricalTriggerFingerHypothesis,normalizeHistoricalTriggerFingerHypothesis } from "../../domain/d2TriggerFingerCompatibility";
import { isHistoricalTwoHandContributionHypothesis,normalizeTwoHandContributionHypothesis } from "../../domain/twoHandContributionCompatibility";
import { isHistoricalE1Manifestation,normalizeHistoricalE1Hypothesis } from "../../domain/e1AnticipationCompatibility";
interface SeriesRow{session_id:string;recorded_shot_count:number;shooter_laterality_snapshot:"right"|"left";number_of_hands:1|2|null}
export class SqliteTechnicalHypothesisRepository implements TechnicalHypothesisRepository{
 constructor(private database:Database,private createId:()=>string,private now=()=>new Date().toISOString()){}
 async listAnswers(seriesId:string){
  const rows=await this.database.getAllAsync<{question_code:string;answer_value:DiagnosticAnswerValue}>(
   "SELECT question_code, answer_value FROM diagnostic_answers WHERE series_id = ?",seriesId);
  return Object.fromEntries(rows.map(r=>[r.question_code,r.answer_value]));
 }
 async answer(questionCode:string,seriesId:string,value:DiagnosticAnswerValue){
  const series=await this.database.getFirstAsync<{session_id:string}>("SELECT session_id FROM series WHERE id = ?",seriesId);
  if(!series)throw new Error("Série introuvable.");
  await this.database.runAsync(`INSERT INTO diagnostic_answers
   (id,session_id,series_id,question_code,answer_value,answered_at) VALUES(?,?,?,?,?,?)
   ON CONFLICT(series_id,question_code) DO UPDATE SET answer_value=excluded.answer_value, answered_at=excluded.answered_at`,
   this.createId(),series.session_id,seriesId,questionCode,value,this.now());
 }
 async generateForSeries(seriesId:string){
  const series=await this.database.getFirstAsync<SeriesRow>(`SELECT s.session_id,s.recorded_shot_count,
   se.shooter_laterality_snapshot,se.number_of_hands FROM series s JOIN sessions se ON se.id=s.session_id
   WHERE s.id=? AND s.status='completed'`,seriesId);
  if(!series)throw new Error("Les hypothèses nécessitent une série terminée.");
  const existing=await this.database.getAllAsync<{result_json:string;latest_outcome:ConfirmationOutcome|null}>(
   `SELECT th.result_json,
    (SELECT ctr.outcome FROM confirmation_test_runs ctr WHERE ctr.hypothesis_id=th.id
     AND ctr.status='completed' ORDER BY ctr.completed_at DESC LIMIT 1) AS latest_outcome
    FROM technical_hypotheses th WHERE th.series_id=? ORDER BY th.rank`,seriesId);
  const parsedExisting=existing.map(row=>({hypothesis:JSON.parse(row.result_json) as TechnicalHypothesis,
   latestOutcome:row.latest_outcome}));
  if(parsedExisting.some(row=>row.latestOutcome!==null||isHistoricalTriggerFingerHypothesis(row.hypothesis.hypothesisCode)||isHistoricalE1Manifestation(row.hypothesis.hypothesisCode)
    ||isHistoricalTwoHandContributionHypothesis(row.hypothesis)))
   return parsedExisting.map(row=>hypothesisStatusAfterHistoricalOutcome(
    normalizeTwoHandContributionHypothesis(normalizeHistoricalE1Hypothesis(normalizeHistoricalTriggerFingerHypothesis(row.hypothesis)),true),row.latestOutcome));
  const rows=await this.database.getAllAsync<{result_json:string}>(
   "SELECT result_json FROM shooting_observations WHERE series_id=? AND scope='single_series'",seriesId);
  const observations=rows.map(r=>JSON.parse(r.result_json) as ShootingObservation);
  const drafts=generateTechnicalHypotheses({observations,laterality:series.shooter_laterality_snapshot,
   impactCount:series.recorded_shot_count,numberOfHands:series.number_of_hands,
   answers:await this.listAnswers(seriesId),generatedAt:this.now()});
  await this.database.runAsync("DELETE FROM technical_hypotheses WHERE series_id=?",seriesId);
  const saved:TechnicalHypothesis[]=[];
  for(const draft of drafts){const h={id:this.createId(),...draft};saved.push(h);
   await this.database.runAsync(`INSERT INTO technical_hypotheses
    (id,session_id,series_id,comparison_id,observation_id,hypothesis_code,category,status,
    plausibility_level,confidence_level,rank,internal_score,supporting_evidence_json,
    contradicting_evidence_json,missing_evidence_json,applicable_context_json,source_rules_json,
    ruleset_version,generated_at,result_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    h.id,h.sessionId,h.seriesId,h.comparisonId,h.observationId,h.hypothesisCode,h.category,h.status,
    h.plausibilityLevel,h.confidenceLevel,h.rank,h.internalScore,JSON.stringify(h.supportingEvidence),
    JSON.stringify(h.contradictingEvidence),JSON.stringify(h.missingEvidence),JSON.stringify(h.applicableContext),
    JSON.stringify(h.sourceRules),h.rulesetVersion,h.generatedAt,JSON.stringify(h));}
  return saved;
 }
 async invalidateForSeries(seriesId:string){await this.database.runAsync("DELETE FROM technical_hypotheses WHERE series_id=?",seriesId);}
}
