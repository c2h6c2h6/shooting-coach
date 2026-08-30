import { CoachingCycle, CoachingRecommendation, ConfirmationTestRun, SessionSafetyContext } from "../domain/coachingTypes";
export interface CoachingRepository{
 createCycle(cycle:CoachingCycle,test:ConfirmationTestRun):Promise<void>;
 getActiveCycle(sessionId:string):Promise<{cycle:CoachingCycle;test:ConfirmationTestRun;recommendation:CoachingRecommendation|null}|null>;
 getCycle(id:string):Promise<CoachingCycle|null>;
 getCycleByTestRunId(testRunId:string):Promise<CoachingCycle|null>;
 getCycleByControlSeriesId(seriesId:string):Promise<CoachingCycle|null>;
 getTestRunByGeneratedSeriesId(seriesId:string):Promise<ConfirmationTestRun|null>;
 findTestRun(sourceSeriesId:string,hypothesisId:string,testCode:string):Promise<ConfirmationTestRun|null>;
 saveTest(run:ConfirmationTestRun):Promise<void>;
 saveRecommendation(recommendation:CoachingRecommendation):Promise<void>;
 saveCycle(cycle:CoachingCycle):Promise<void>;
 getSessionSafety(sessionId:string):Promise<SessionSafetyContext|null>;
 saveSessionSafety(context:SessionSafetyContext):Promise<void>;
}
