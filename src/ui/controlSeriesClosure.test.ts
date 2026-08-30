import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("clôture contextuelle d’une série de contrôle", () => {
  it("affiche le résultat du travail avant l’analyse générale", () => {
    const screen = readFileSync(
      resolve(process.cwd(), "app/sessions/[id]/series/[seriesId].tsx"),
      "utf8",
    );
    expect(screen).toContain("Résultat du travail");
    expect(screen.indexOf("<ControlSeriesResultSection")).toBeLessThan(screen.indexOf("<ObservationSection"));
    expect(screen).toContain("Voir l’analyse générale de cette série");
    expect(screen).toContain("Objectif du cycle");
    expect(screen).toContain("allowBiasConfirmation={!hasContextualResult}");
  });
});
