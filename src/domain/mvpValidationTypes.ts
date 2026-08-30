import { CoachingOutcome, ConfirmationOutcome } from "./coachingTypes";
import { HypothesisCode } from "./technicalHypothesisCatalog";

export const MVP_VALIDATION_SCHEMA_VERSION = "mvp-validation-v1";
export const REASONING_TRACE_VERSION = "reasoning-trace-v1";
export type DataPartition = "real" | "demo" | "automated_test";
export type FeedbackAnswer = "yes"|"rather_yes"|"rather_no"|"no"|"uncertain";
export type Severity = "low"|"medium"|"high"|"critical";
export type HumanHypothesisVerdict = "coherent"|"possible_unverified"|"unlikely"|"incorrect"|"impossible_to_evaluate";
export type IssueCategory = "incorrect_observation"|"inconsistent_metric"|"unsuitable_hypothesis"|
  "unclear_question"|"impossible_test"|"dangerous_instruction"|"useless_drill"|
  "navigation_block"|"data_loss"|"other";

export interface ReasoningRuleTrace {
  ruleCode:string; ruleVersion:string; triggered:boolean; reason:string;
  thresholds:Record<string,number|string|boolean|null>; sourceIds:string[];
}
export interface ReasoningTrace {
  id:string; cycleId:string; sessionId:string; sourceSeriesId:string; createdAt:string;
  dataPartition:DataPartition; algorithmVersions:Record<string,string>; sourceSnapshot:unknown;
  rules:ReasoningRuleTrace[]; retainedObservationCodes:string[]; rejectedObservations:{code:string;reason:string}[];
  candidates:{hypothesisCode:HypothesisCode;score:number;strengtheners:string[];weakeners:string[];contradictions:string[]}[];
  rankingReason:string; testChoiceReason:string|null; recommendationChoiceReason:string|null;
  evaluationMetricKeys:string[]; limitations:string[]; traceVersion:string;
}
export interface ShooterFeedback {
  id:string;cycleId:string;sessionId:string;clarity:FeedbackAnswer;testFeasibility:FeedbackAnswer;
  drillFit:FeedbackAnswer;feltDifference:FeedbackAnswer;shotCountFit:FeedbackAnswer;
  nextChoice:"stop"|"restart"|"free_training";comment:string|null;createdAt:string;
}
export interface InstructorFeedback {
  id:string;cycleId:string;sessionId:string;observationRelevant:FeedbackAnswer;hypothesisRelevant:FeedbackAnswer;
  missingHypothesis:string|null;rankingAssessment:"appropriate"|"poorly_ranked"|"uncertain";
  testAssessment:"appropriate"|"inappropriate"|"uncertain";recommendationAssessment:"appropriate"|"inappropriate"|"dangerous"|"uncertain";
  resultCoherent:FeedbackAnswer;comment:string|null;createdAt:string;
}
export interface HumanHypothesisReview {
  id:string;cycleId:string;hypothesisId:string;engineSnapshot:unknown;verdict:HumanHypothesisVerdict;
  evaluatorRole:string;comment:string|null;createdAt:string;
}
export interface LocalIssueReport {
  id:string;sessionId:string|null;seriesId:string|null;cycleId:string|null;screen:string;
  rulesetVersions:Record<string,string>;category:IssueCategory;description:string;severity:Severity;
  dataPartition:DataPartition;createdAt:string;
}
export interface SyntheticScenarioExpectation {
  metricRanges:Record<string,{min:number;max:number}>; observationCodes:string[];
  allowedHypotheses:HypothesisCode[];forbiddenHypotheses:HypothesisCode[];
  expectedTestCode:string|null;expectedRecommendationCode:string|null;controlOutcome:CoachingOutcome|null;
  expectedTestOutcome:ConfirmationOutcome|null;
}
export interface SyntheticScenario {
  code:string;version:string;title:string;profile:{displayName:string;laterality:"right"|"left";level:"beginner"|"intermediate"|"advanced"};
  weaponId:"glock-19"|"glock-48"|"glock-43x";distanceMm:number;targetTypeId:"generic-centered"|"fftir"|"other-paper";
  sourceImpacts:{x:number;y:number}[];controlImpacts:{x:number;y:number}[]|null;
  expectation:SyntheticScenarioExpectation;notes:string[];
}
export interface StructuredSessionReport {
  schemaVersion:string;generatedAt:string;partition:DataPartition;session:unknown;series:unknown[];
  impacts:unknown[];metrics:unknown[];comparisons:unknown[];observations:unknown[];hypotheses:unknown[];
  diagnosticAnswers:unknown[];confirmationTests:unknown[];recommendations:unknown[];cycles:unknown[];
  reasoningTraces:ReasoningTrace[];shooterFeedback:ShooterFeedback[];instructorFeedback:InstructorFeedback[];
  humanReviews:HumanHypothesisReview[];issues:LocalIssueReport[];
  sections:{measuredFacts:string[];observations:string[];hypotheses:string[];actions:string[];results:string[]};
  limitations:string[];versions:Record<string,string>;
}
export interface FullLocalBackup {
  schemaVersion:string;appVersion:string;exportedAt:string;tables:Record<string,unknown[]>;
  checksum:string;partitionCounts:Record<DataPartition,number>;
  databaseVersion?:number;checksumAlgorithm?:"SHA-256";
}
