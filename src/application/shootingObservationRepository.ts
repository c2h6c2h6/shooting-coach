import { ObservationResult, ShootingObservation } from "../domain/shootingObservation";

export interface ShootingObservationRepository {
  generateForSeries(seriesId: string): Promise<ObservationResult>;
  generateForComparison(comparisonId: string): Promise<ObservationResult>;
  listRepeatedForSession(sessionId: string): Promise<ShootingObservation[]>;
  listBySeries(seriesId: string): Promise<ShootingObservation[]>;
  invalidateForSeries(seriesId: string): Promise<void>;
}
