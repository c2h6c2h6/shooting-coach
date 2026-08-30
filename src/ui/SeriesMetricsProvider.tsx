import { randomUUID } from "expo-crypto";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { SeriesMetrics } from "../domain/seriesMetrics";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteSeriesMetricsRepository } from "../infrastructure/metrics/sqliteSeriesMetricsRepository";

interface MetricsService {
  calculate(seriesId: string): Promise<SeriesMetrics>;
  getLatest(seriesId: string): Promise<SeriesMetrics | null>;
  invalidate(seriesId: string): Promise<void>;
}
const Context = createContext<MetricsService | null>(null);

export function SeriesMetricsProvider({ children }: PropsWithChildren) {
  const repository = useMemo(
    () => getDatabase().then((db) => new SqliteSeriesMetricsRepository(db, randomUUID)), []);
  const value = useMemo<MetricsService>(() => ({
    async calculate(seriesId) { return (await repository).calculateAndSave(seriesId); },
    async getLatest(seriesId) { return (await repository).getLatest(seriesId); },
    async invalidate(seriesId) { return (await repository).invalidate(seriesId); },
  }), [repository]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSeriesMetrics() {
  const value = useContext(Context);
  if (!value) throw new Error("useSeriesMetrics doit être utilisé dans SeriesMetricsProvider.");
  return value;
}
