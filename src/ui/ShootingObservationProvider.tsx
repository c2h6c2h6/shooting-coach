import { randomUUID } from "expo-crypto";
import { createContext, PropsWithChildren, useContext, useMemo } from "react";
import { ObservationResult, ShootingObservation } from "../domain/shootingObservation";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteShootingObservationRepository } from "../infrastructure/observations/sqliteShootingObservationRepository";

interface Service {
  forSeries(seriesId: string): Promise<ObservationResult>;
  listBySeries(seriesId: string): Promise<ShootingObservation[]>;
  forComparison(comparisonId: string): Promise<ObservationResult>;
  repeated(sessionId: string): Promise<ShootingObservation[]>;
}
const Context = createContext<Service | null>(null);
export function ShootingObservationProvider({ children }: PropsWithChildren) {
  const repository = useMemo(() => getDatabase().then((database) =>
    new SqliteShootingObservationRepository(database, randomUUID)), []);
  const value = useMemo<Service>(() => ({
    async forSeries(id) { return (await repository).generateForSeries(id); },
    async listBySeries(id) { return (await repository).listBySeries(id); },
    async forComparison(id) { return (await repository).generateForComparison(id); },
    async repeated(id) { return (await repository).listRepeatedForSession(id); },
  }), [repository]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useShootingObservations() {
  const value = useContext(Context);
  if (!value) throw new Error("useShootingObservations doit être utilisé dans ShootingObservationProvider.");
  return value;
}
