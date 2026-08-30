import { Impact, ImpactDraft } from "../domain/impact";

export interface ImpactRepository {
  add(draft: Omit<ImpactDraft, "sequenceNumber" | "source"> & { sequenceNumber?: number }): Promise<Impact>;
  getById(id: string): Promise<Impact | null>;
  listBySeries(seriesId: string): Promise<Impact[]>;
  getNextSequenceNumber(seriesId: string): Promise<number>;
  countBySeries(seriesId: string): Promise<number>;
  move(id: string, normalizedX: number, normalizedY: number): Promise<Impact>;
  remove(id: string): Promise<void>;
  setExcluded(id: string, isExcluded: boolean, reason?: string | null): Promise<Impact>;
  replaceForEditableSeries(seriesId: string, impacts: Impact[]): Promise<void>;
}
