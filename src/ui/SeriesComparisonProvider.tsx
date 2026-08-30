import { randomUUID } from "expo-crypto";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { ComparisonOption } from "../application/seriesComparisonRepository";
import { ComparisonType, SeriesComparison } from "../domain/seriesComparison";
import { SqliteSeriesComparisonRepository } from "../infrastructure/comparisons/sqliteSeriesComparisonRepository";
import { getDatabase } from "../infrastructure/database/sqlite";

interface Service {
  options(seriesId: string): Promise<ComparisonOption[]>;
  compare(baselineId: string, comparedId: string, type: ComparisonType): Promise<SeriesComparison>;
  getById(id: string): Promise<SeriesComparison | null>;
  listBySession(sessionId: string): Promise<SeriesComparison[]>;
}
const Context = createContext<Service | null>(null);
export function SeriesComparisonProvider({ children }: PropsWithChildren) {
  const repository = useMemo(
    () => getDatabase().then((db) => new SqliteSeriesComparisonRepository(db, randomUUID)), [],
  );
  const value = useMemo<Service>(() => ({
    async options(id) { return (await repository).getOptions(id); },
    async compare(a, b, type) { return (await repository).compareAndSave(a, b, type); },
    async getById(id) { return (await repository).getById(id); },
    async listBySession(id) { return (await repository).listBySession(id); },
  }), [repository]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useSeriesComparisons() {
  const value = useContext(Context);
  if (!value) throw new Error("useSeriesComparisons doit être utilisé dans SeriesComparisonProvider.");
  return value;
}
