import { randomUUID } from "expo-crypto";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { SeriesRepository } from "../application/seriesRepository";
import { Series, SeriesDraft } from "../domain/series";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteSeriesRepository } from "../infrastructure/series/sqliteSeriesRepository";

interface SeriesService {
  listBySession(sessionId: string): Promise<Series[]>;
  getById(id: string): Promise<Series | null>;
  getNextSequenceNumber(sessionId: string): Promise<number>;
  create(draft: Omit<SeriesDraft, "sequenceNumber">): Promise<Series>;
  start(id: string): Promise<Series>;
  updateRecordedShotCount(id: string, recordedShotCount: number): Promise<Series>;
  complete(id: string, recordedShotCount: number): Promise<Series>;
  cancel(id: string): Promise<Series>;
}

const SeriesContext = createContext<SeriesService | null>(null);

export function SeriesProvider({ children }: PropsWithChildren) {
  const repository = useMemo<Promise<SeriesRepository>>(
    () => getDatabase().then((db) => new SqliteSeriesRepository(db, randomUUID)),
    [],
  );
  const value = useMemo<SeriesService>(
    () => ({
      async listBySession(sessionId) {
        return (await repository).listBySession(sessionId);
      },
      async getById(id) {
        return (await repository).getById(id);
      },
      async getNextSequenceNumber(sessionId) {
        return (await repository).getNextSequenceNumber(sessionId);
      },
      async create(draft) {
        return (await repository).create(draft);
      },
      async start(id) {
        return (await repository).start(id);
      },
      async updateRecordedShotCount(id, count) {
        return (await repository).updateRecordedShotCount(id, count);
      },
      async complete(id, recordedShotCount) {
        return (await repository).complete(id, recordedShotCount);
      },
      async cancel(id) {
        return (await repository).cancel(id);
      },
    }),
    [repository],
  );
  return <SeriesContext.Provider value={value}>{children}</SeriesContext.Provider>;
}

export function useSeries(): SeriesService {
  const value = useContext(SeriesContext);
  if (!value) throw new Error("useSeries doit être utilisé dans SeriesProvider.");
  return value;
}
