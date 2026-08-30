import { DiagnosticAnswerValue } from "../domain/diagnosticQuestionCatalog";
import { TechnicalHypothesis } from "../domain/technicalHypothesis";
export interface TechnicalHypothesisRepository {
  generateForSeries(seriesId:string):Promise<TechnicalHypothesis[]>;
  answer(questionCode:string,seriesId:string,value:DiagnosticAnswerValue):Promise<void>;
  listAnswers(seriesId:string):Promise<Record<string,DiagnosticAnswerValue>>;
  invalidateForSeries(seriesId:string):Promise<void>;
}

