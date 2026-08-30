import { ComparisonType, SeriesComparison } from "../domain/seriesComparison";

export interface ComparisonOption {
  type: Exclude<ComparisonType, "manual">;
  baselineSeriesId: string;
  baselineSequenceNumber: number;
}
export interface SeriesComparisonRepository {
  getOptions(comparedSeriesId: string): Promise<ComparisonOption[]>;
  compareAndSave(baselineSeriesId: string, comparedSeriesId: string, type: ComparisonType): Promise<SeriesComparison>;
  getById(id: string): Promise<SeriesComparison | null>;
  listBySession(sessionId: string): Promise<SeriesComparison[]>;
  invalidateForSeries(seriesId: string): Promise<void>;
}
