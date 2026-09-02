import { HypothesisCode, HypothesisCategory } from "./technicalHypothesisCatalog";
import { NumericMetricKey } from "./seriesComparison";
import type {CompetenceEvaluation} from "./pedagogical-v2/inputContracts";

export const COACHING_RULESET_VERSION = "coaching-rules-v1";
export type SessionMode = "coaching_free" | "training";
export type ShooterLevel = "beginner" | "intermediate" | "advanced";
export type TestCategory = HypothesisCategory;
export type ConfirmationTestStatus = "proposed"|"accepted"|"in_progress"|"completed"|"cancelled"|"not_applicable"|"unsafe_in_current_context";
export type ConfirmationOutcome = "supports_hypothesis"|"weakly_supports_hypothesis"|"does_not_support_hypothesis"|"contradicts_hypothesis"|"inconclusive"|"not_observed";
export type InconclusiveReason = "OUTLIER_CONTAMINATION"|"AMBIGUOUS_OBSERVATION"|"NOT_OBSERVABLE"|"PROTOCOL_INTERRUPTED"|"UNKNOWN";
export type NextDiagnosticAction = "CHANGE_ONE_VARIABLE"|"CHANGE_OBSERVATION_MODALITY"|"RETRY_SAME_PROTOCOL"|"TEST_ANOTHER_HYPOTHESIS"|"COLLECT_MORE_INFORMATION"|"NONE";
export type RecommendationStatus = "proposed"|"accepted"|"in_progress"|"completed"|"skipped"|"cancelled";
export type RecommendationType = "advice"|"drill";
export type CoachingCycleStatus = "proposed"|"test_pending"|"test_completed"|"drill_pending"|"drill_in_progress"|"control_series_pending"|"evaluation_pending"|"completed"|"cancelled";
export type CoachingOutcome = "objective_improved"|"objective_stable"|"objective_worsened"|"mixed_result"|"insufficient_data";
export type CoachingObjective = "dispersion"|"centering"|"horizontal_stability"|"vertical_stability"|"consistency";
export type ControlMode="series_comparison"|"technical_observation";
export type TransferStatus="not_required"|"pending"|"ready"|"completed";
export interface TechnicalObservationCriterion {
  readonly code:string;readonly label:string;readonly outcome:CoachingOutcome;
  readonly evidenceEffect:"strengthens"|"weakens"|"contradicts"|"neutral";readonly evidenceStrength:number;
}
export interface TechnicalObservationControlSnapshot {
 readonly mode:"technical_observation";readonly definitionCode:string;readonly competenceId:string;
 readonly competenceCode:string;readonly competenceName:string;readonly exerciseDefinitionId:string;
 readonly exerciseCode:string;readonly exerciseName:string;readonly catalogVersion:string;
 readonly exerciseInstructions:readonly string[];readonly protocol:readonly string[];
  readonly observationCriteria:readonly TechnicalObservationCriterion[];readonly knownLimitations:readonly string[];
  readonly requiresLiveFire?:boolean;readonly requiresDryFire?:boolean;readonly requiresDummyRounds?:boolean;readonly requiresInstructor?:boolean;
}
export interface TransferState {
 readonly acquisitionControlCompleted:boolean;readonly acquisitionOutcome:CoachingOutcome|null;
 readonly acquisitionEvaluation?:CompetenceEvaluation|null;readonly transferRequired:boolean;
 readonly transferDrillCode:string;readonly transferControlCode:string;readonly transferStatus:TransferStatus;
 readonly transferOutcome:CoachingOutcome|null;
}

export interface SafetyContext {
  inAuthorizedRange: boolean;
  rangeRulesAccepted: boolean;
  safeDirectionAvailable: boolean;
  weaponUnloadedVerified: boolean;
  magazineRemoved: boolean;
  chamberVisualPhysicalCheck: boolean;
  liveAmmunitionRemovedFromArea: boolean;
  eyeAndEarProtection: boolean;
  dummyRoundsAllowed: boolean;
  dummyRoundProcedureKnown: boolean;
  instructorPresent: boolean;
  canDryFire: boolean;
  canLiveFire: boolean;
}

export interface SessionSafetyContext {
  sessionId: string;
  validatedAt: string;
  conditions: SafetyContext;
}

export interface ConfirmationTestDefinition {
  code:string; hypothesisCodes:HypothesisCode[]; category:TestCategory; title:string; objective:string;
  prerequisites:string[]; safetyRequirements:string[]; instructions:string[]; observationCriteria:string[];
  possibleOutcomes:ConfirmationOutcome[]; minimumDuration:number; maximumDuration:number;
  requiresLiveFire:boolean; requiresDryFire:boolean; requiresDummyRounds:boolean; requiresInstructor:boolean;
  supportedWeaponTypes:["semi_automatic_pistol"]; supportedSessionModes:SessionMode[]; discriminatesAgainst:HypothesisCode[];
  rulesetVersion:string;
}
export interface ConfirmationTestRun {
  id:string;sessionId:string;sourceSeriesId:string;hypothesisId:string;testCode:string;status:ConfirmationTestStatus;
  startedAt:string|null;completedAt:string|null;outcome:ConfirmationOutcome|null;observations:string[];
  userAnswers:Record<string,string>;confidenceBefore:string;confidenceAfter:string|null;
  hypothesisStatusBefore:string;hypothesisStatusAfter:string|null;generatedSeriesId:string|null;rulesetVersion:string;
}
export interface CoachingRecommendation {
  id:string;sessionId:string;hypothesisId:string;confirmationTestRunId:string|null;recommendationCode:string;
  recommendationType:RecommendationType;title:string;rationale:string;objective:CoachingObjective;instructions:string[];
  safetyNotes:string[];expectedObservation:string;stopConditions:string[];priority:number;status:RecommendationStatus;
  rulesetVersion:string;generatedAt:string;
}
export interface TrainingDrill {
  code:string;linkedHypothesisCodes:HypothesisCode[];linkedRecommendationCodes:string[];title:string;objective:CoachingObjective;
  preparation:string[];executionSteps:string[];numberOfRepetitions:number;numberOfShots:number;pace:string;rest:string;
  successCriteria:string[];failureCriteria:string[];stopConditions:string[];safetyRequirements:string[];
  requiresLiveFire:boolean;requiresDryFire:boolean;requiresDummyRounds:boolean;requiresInstructor:boolean;
  allowedModes:SessionMode[];difficultyLevel:ShooterLevel[];rulesetVersion:string;
}
export interface CoachingCycle {
  id:string;sessionId:string;sourceSeriesId:string;hypothesisId:string;confirmationTestRunId:string|null;
  recommendationId:string|null;drillCode:string|null;controlSeriesId:string|null;status:CoachingCycleStatus;
  outcome:CoachingOutcome|null;objective:CoachingObjective|null;startedAt:string;completedAt:string|null;
  invalidatedAt:string|null;invalidationReason:string|null;rulesetVersion:string;
  controlMode?:ControlMode;technicalControl?:TechnicalObservationControlSnapshot|null;
  competenceEvaluation?:CompetenceEvaluation|null;pedagogicalDecision?:null;masteryEvent?:null;
  transferState?:TransferState;
}
export interface ObjectiveMetricRule { objective:CoachingObjective; metrics:NumericMetricKey[]; lowerIsBetter:boolean }
