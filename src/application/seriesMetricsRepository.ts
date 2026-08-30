import { SeriesMetrics } from "../domain/seriesMetrics";

export interface SeriesMetricsRepository {
  calculateAndSave(seriesId: string): Promise<SeriesMetrics>;
  getLatest(seriesId: string): Promise<SeriesMetrics | null>;
  invalidate(seriesId: string): Promise<void>;
}

