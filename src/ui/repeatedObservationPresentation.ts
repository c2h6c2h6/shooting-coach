import { ObservationCode } from "../domain/observationCatalog";
import { ShootingObservation } from "../domain/shootingObservation";

export interface RepeatedObservationRow {
  observationCode: ObservationCode;
  seriesCount: number;
}

interface SupportingSeries {
  seriesId?: unknown;
}

export function repeatedObservationRows(
  observations: readonly ShootingObservation[],
): RepeatedObservationRow[] {
  const byCode = new Map<ObservationCode, { seriesIds: Set<string>; fallbackCount: number }>();

  for (const observation of observations) {
    const current = byCode.get(observation.observationCode) ?? {
      seriesIds: new Set<string>(),
      fallbackCount: 0,
    };
    const supportingSeries = Array.isArray(observation.supportingMetrics.series)
      ? observation.supportingMetrics.series as SupportingSeries[]
      : [];

    for (const item of supportingSeries) {
      if (typeof item?.seriesId === "string") current.seriesIds.add(item.seriesId);
    }

    const occurrences = observation.supportingMetrics.occurrences;
    if (typeof occurrences === "number" && Number.isFinite(occurrences)) {
      current.fallbackCount = Math.max(current.fallbackCount, occurrences);
    }
    byCode.set(observation.observationCode, current);
  }

  return [...byCode.entries()].map(([observationCode, value]) => ({
    observationCode,
    seriesCount: value.seriesIds.size || value.fallbackCount,
  }));
}
