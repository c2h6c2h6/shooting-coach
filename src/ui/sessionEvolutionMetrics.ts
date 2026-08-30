import { Series } from "../domain/series";
import { SeriesMetrics } from "../domain/seriesMetrics";

export interface SessionEvolutionMetricsSource {
  getLatest(seriesId: string): Promise<SeriesMetrics | null>;
  calculate(seriesId: string): Promise<SeriesMetrics>;
}

export async function loadSessionEvolutionMetrics(
  series: readonly Series[],
  source: SessionEvolutionMetricsSource,
): Promise<Record<string, SeriesMetrics>> {
  const completed = series.filter((item) => item.status === "completed");
  const values = await Promise.all(completed.map(async (item) => {
    const persisted = await source.getLatest(item.id);
    return [item.id, persisted ?? await source.calculate(item.id)] as const;
  }));
  return Object.fromEntries(values);
}
