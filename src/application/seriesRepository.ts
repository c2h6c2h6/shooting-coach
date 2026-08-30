import { Series, SeriesDraft } from "../domain/series";

export interface SeriesRepository {
  create(draft: Omit<SeriesDraft, "sequenceNumber"> & { sequenceNumber?: number }): Promise<Series>;
  listBySession(sessionId: string): Promise<Series[]>;
  getById(id: string): Promise<Series | null>;
  getNextSequenceNumber(sessionId: string): Promise<number>;
  hasActiveSeries(sessionId: string): Promise<boolean>;
  start(id: string): Promise<Series>;
  updateRecordedShotCount(id: string, recordedShotCount: number): Promise<Series>;
  complete(id: string, recordedShotCount: number): Promise<Series>;
  cancel(id: string): Promise<Series>;
  ensureReferenceSeries(sessionId: string): Promise<Series>;
}
