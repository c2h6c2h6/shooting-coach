import { randomUUID } from "expo-crypto";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { ImpactRepository } from "../application/impactRepository";
import { Impact } from "../domain/impact";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteImpactRepository } from "../infrastructure/impacts/sqliteImpactRepository";

interface ImpactService {
  listBySeries(seriesId: string): Promise<Impact[]>;
  countBySeries(seriesId: string): Promise<number>;
  replaceForEditableSeries(seriesId: string, impacts: Impact[]): Promise<void>;
}
const ImpactContext = createContext<ImpactService | null>(null);

export function ImpactProvider({ children }: PropsWithChildren) {
  const repository = useMemo<Promise<ImpactRepository>>(
    () => getDatabase().then((db) => new SqliteImpactRepository(db, randomUUID)), []);
  const value = useMemo<ImpactService>(() => ({
    async listBySeries(id) { return (await repository).listBySeries(id); },
    async countBySeries(id) { return (await repository).countBySeries(id); },
    async replaceForEditableSeries(id, impacts) { return (await repository).replaceForEditableSeries(id, impacts); },
  }), [repository]);
  return <ImpactContext.Provider value={value}>{children}</ImpactContext.Provider>;
}
export function useImpacts() {
  const value = useContext(ImpactContext);
  if (!value) throw new Error("useImpacts doit être utilisé dans ImpactProvider.");
  return value;
}
