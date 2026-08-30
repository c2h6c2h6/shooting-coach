import type { Impact } from "../domain/impact";
import type { Series } from "../domain/series";

export function requiresRecordedShotCountConfirmation(
  series: Series,
  impacts: readonly Impact[],
): boolean {
  return impacts.length !== series.expectedShotCount || impacts.some((impact) => impact.isExcluded);
}

export function suggestedRecordedShotCount(series: Series, impacts: readonly Impact[]): number {
  if (!requiresRecordedShotCountConfirmation(series, impacts)) return series.expectedShotCount;
  return series.recordedShotCount > 0 ? series.recordedShotCount : impacts.length;
}

export async function analyzeSeries(
  input: { readonly series: Series; readonly impacts: readonly Impact[]; readonly recordedShotCount: number },
  dependencies: {
    saveImpacts(seriesId: string, impacts: Impact[]): Promise<void>;
    invalidateMetrics(seriesId: string): Promise<void>;
    completeSeries(seriesId: string, recordedShotCount: number): Promise<Series>;
    calculateMetrics(seriesId: string): Promise<unknown>;
    generateObservations(seriesId: string): Promise<unknown>;
    generateHypotheses(seriesId: string): Promise<unknown>;
  },
): Promise<Series> {
  const impacts = input.impacts.map((impact) => ({ ...impact }));
  await dependencies.saveImpacts(input.series.id, impacts);
  await dependencies.invalidateMetrics(input.series.id);
  const completed = await dependencies.completeSeries(input.series.id, input.recordedShotCount);
  await dependencies.calculateMetrics(input.series.id);
  await dependencies.generateObservations(input.series.id);
  await dependencies.generateHypotheses(input.series.id);
  return completed;
}
