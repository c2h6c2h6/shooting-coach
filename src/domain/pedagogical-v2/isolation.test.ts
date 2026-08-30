import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const directory = dirname(fileURLToPath(import.meta.url));
const productionSources = ["contracts.ts", "schemas.ts", "catalogContracts.ts", "catalogLoader.ts", "decisionContracts.ts",
  "decisionSchemas.ts", "inputContracts.ts", "inputSchemas.ts", "index.ts"]
  .concat(["masteryContracts.ts", "masterySchemas.ts", "masteryState.ts", "pedagogicalVariableProgression.ts",
    "pedagogicalVariableProgressionSchemas.ts", "syntheticOrchestrator.ts"])
  .map((file) => readFileSync(resolve(directory, file), "utf8"));

describe("isolement fonctionnel du domaine pédagogique v2", () => {
  it("ne dépend ni de React Native, Expo, SQLite, interface, ni du moteur v1", () => {
    const imports = productionSources.flatMap((source) => [...source.matchAll(/from\s+["']([^"']+)["']/g)]
      .map((match) => match[1]));
    expect(imports.every((value) => value.startsWith("."))).toBe(true);
    expect(imports).not.toEqual(expect.arrayContaining([
      expect.stringContaining("react"), expect.stringContaining("expo"), expect.stringContaining("sqlite"),
    ]));
  });

  it("ne fait jamais de Recommendation une source de vérité des contrats v2", () => {
    expect(productionSources.join("\n")).not.toMatch(/Recommendation|recommendation/);
  });

  it("ne contient aucun catalogue, exercice ou graphe pédagogique réel A–J", () => {
    const source = productionSources.join("\n");
    expect(source).not.toMatch(/PLATFORM_|GRIP_|SIGHT_|TRIGGER_|FOLLOW_THROUGH_|PROTECTOR_/);
    expect(source).not.toMatch(/export\s+const\s+(catalogue|catalog)\s*=|prerequisiteGraph\s*=/i);
  });
});
