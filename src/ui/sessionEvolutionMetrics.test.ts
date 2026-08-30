import { describe, expect, it, vi } from "vitest";
import { Series } from "../domain/series";
import { SeriesMetrics } from "../domain/seriesMetrics";
import { loadSessionEvolutionMetrics } from "./sessionEvolutionMetrics";

const series: Series = {
  id: "series-1", sessionId: "session-1", sequenceNumber: 1, type: "reference",
  status: "completed", expectedShotCount: 5, recordedShotCount: 5,
  instruction: null, pedagogicalObjective: null, selectedSkillId: null,
  durationSeconds: null, cadenceType: null, notes: null,
  startedAt: "2026-08-25T08:00:00.000Z", completedAt: "2026-08-25T08:01:00.000Z",
  createdAt: "2026-08-25T08:00:00.000Z", updatedAt: "2026-08-25T08:01:00.000Z",
};
const metrics = {
  includedImpactCount: 5,
} as SeriesMetrics;

describe("chargement des métriques de l’écran séance", () => {
  it("relit les métriques persistées sans recalculer une série terminée", async () => {
    const calculate = vi.fn();
    const result = await loadSessionEvolutionMetrics([series], {
      getLatest: vi.fn().mockResolvedValue(metrics), calculate,
    });
    expect(result).toEqual({ "series-1": metrics });
    expect(calculate).not.toHaveBeenCalled();
  });

  it("calcule uniquement lorsqu’aucune métrique persistée n’existe", async () => {
    const calculate = vi.fn().mockResolvedValue(metrics);
    const result = await loadSessionEvolutionMetrics([series], {
      getLatest: vi.fn().mockResolvedValue(null), calculate,
    });
    expect(result["series-1"]).toBe(metrics);
    expect(calculate).toHaveBeenCalledOnce();
  });

  it("propage une erreur SQLite au lieu de la masquer", async () => {
    const failure = new Error("FOREIGN KEY constraint failed");
    await expect(loadSessionEvolutionMetrics([series], {
      getLatest: vi.fn().mockRejectedValue(failure), calculate: vi.fn(),
    })).rejects.toBe(failure);
  });
});
