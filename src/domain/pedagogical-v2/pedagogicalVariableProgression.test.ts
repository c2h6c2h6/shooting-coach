import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { pedagogicalVariableKeys, type PedagogicalVariables } from "./contracts";
import {
  comparePedagogicalVariables,
  validateL1PlusProgression,
  type PedagogicalVariablesComparisonInput,
} from "./pedagogicalVariableProgression";
import {
  l1PlusValidationResultSchema,
  pedagogicalVariableChangeAnalysisSchema,
} from "./pedagogicalVariableProgressionSchemas";

const baseVariables: PedagogicalVariables = {
  distance: null,
  numberOfHands: null,
  time: null,
  cadence: null,
  zoneSize: null,
  targetType: null,
  sightSystem: null,
  shotCount: null,
  movement: null,
  attentionalLoad: null,
  complexity: null,
  supervision: null,
};

function snapshot(
  values: Partial<PedagogicalVariables> = {},
  metadata: Partial<Pick<PedagogicalVariablesComparisonInput, "snapshotSchemaVersion" | "variablesSchemaVersion">> = {},
): PedagogicalVariablesComparisonInput {
  return {
    snapshotSchemaVersion: metadata.snapshotSchemaVersion ?? "effective-pedagogical-variables-snapshot-v1",
    variablesSchemaVersion: metadata.variablesSchemaVersion ?? "pedagogical-v2-contracts-v1",
    values: { ...baseVariables, ...values },
  };
}

describe("comparaison pure des variables pédagogiques", () => {
  it("ne détecte aucun changement entre deux snapshots identiques", () => {
    const analysis = comparePedagogicalVariables(snapshot(), snapshot());
    expect(analysis).toEqual({ comparisonStatus: "comparable", changedVariableCount: 0, changes: [],
      nonComparableVariableKeys: [], metadataChanges: [] });
  });

  it("détecte exactement une propriété simple modifiée", () => {
    const analysis = comparePedagogicalVariables(snapshot({ cadence: "fixture-a" }), snapshot({ cadence: "fixture-b" }));
    expect(analysis.changedVariableCount).toBe(1);
    expect(analysis.changes).toEqual([{ key: "cadence", previousValue: "fixture-a", nextValue: "fixture-b",
      kind: "modified", interpretable: true }]);
  });

  it("détecte deux changements simultanés sans les déclarer universellement invalides", () => {
    const result = validateL1PlusProgression(snapshot(), snapshot({ shotCount: 2, targetType: "fixture" }));
    expect(result.status).toBe("multiple_changes");
    expect(result.analysis.changedVariableCount).toBe(2);
    expect(result.compatibleWithNormalL1Plus).toBe(false);
    expect(result.configurationValidity).toBe("not_assessed");
  });

  it("retourne trois changements dans l'ordre structurel déterministe", () => {
    const analysis = comparePedagogicalVariables(snapshot(), snapshot({ time: { value: 5, unit: "fixture" },
      movement: "fixture", supervision: "fixture" }));
    expect(analysis.changedVariableCount).toBe(3);
    expect(analysis.changes.map((change) => change.key)).toEqual(["time", "movement", "supervision"]);
  });

  it("compte undefined vers une valeur comme un ajout", () => {
    const analysis = comparePedagogicalVariables(snapshot({ distance: undefined }),
      snapshot({ distance: { value: 1, unit: "fixture" } }));
    expect(analysis.changes).toEqual([{ key: "distance", previousValue: undefined,
      nextValue: { value: 1, unit: "fixture" }, kind: "added", interpretable: true }]);
  });

  it("compte une valeur vers undefined comme une suppression", () => {
    const analysis = comparePedagogicalVariables(snapshot({ shotCount: 1 }), snapshot({ shotCount: undefined }));
    expect(analysis.changes[0]).toMatchObject({ key: "shotCount", previousValue: 1, nextValue: undefined,
      kind: "removed" });
  });

  it("ignore undefined vers undefined", () => {
    expect(comparePedagogicalVariables(snapshot({ complexity: undefined }),
      snapshot({ complexity: undefined })).changedVariableCount).toBe(0);
  });

  it("compare les objets par valeur malgré de nouvelles références et un ordre de propriétés différent", () => {
    const previousZone = { width: { value: 4, unit: "fixture" }, height: null, label: "fixture" };
    const nextZone = Object.fromEntries([
      ["label", "fixture"], ["height", null], ["width", { unit: "fixture", value: 4 }],
    ]) as unknown as PedagogicalVariables["zoneSize"];
    expect(comparePedagogicalVariables(snapshot({ zoneSize: previousZone }),
      snapshot({ zoneSize: nextZone })).changedVariableCount).toBe(0);
  });

  it("sépare un changement de version des changements pédagogiques", () => {
    const analysis = comparePedagogicalVariables(snapshot(), snapshot({}, { variablesSchemaVersion: "fixture-v2" }));
    expect(analysis.changedVariableCount).toBe(0);
    expect(analysis.metadataChanges).toEqual([{ key: "variablesSchemaVersion",
      previousValue: "pedagogical-v2-contracts-v1", nextValue: "fixture-v2" }]);
  });

  it("conserve séparément métadonnées et changement effectif", () => {
    const analysis = comparePedagogicalVariables(snapshot(),
      snapshot({ attentionalLoad: "fixture" }, { snapshotSchemaVersion: "fixture-snapshot-v2" }));
    expect(analysis.changedVariableCount).toBe(1);
    expect(analysis.changes.map((change) => change.key)).toEqual(["attentionalLoad"]);
    expect(analysis.metadataChanges.map((change) => change.key)).toEqual(["snapshotSchemaVersion"]);
  });

  it("ne mute aucun objet d'entrée", () => {
    const previous = snapshot({ distance: { value: 2, unit: "fixture" } });
    const next = snapshot({ distance: { value: 3, unit: "fixture" } });
    const beforePrevious = JSON.stringify(previous);
    const beforeNext = JSON.stringify(next);
    comparePedagogicalVariables(previous, next);
    expect(JSON.stringify(previous)).toBe(beforePrevious);
    expect(JSON.stringify(next)).toBe(beforeNext);
  });

  it("utilise strictement numberOfHands et les douze clés existantes", () => {
    expect(pedagogicalVariableKeys).toEqual(["distance", "numberOfHands", "time", "cadence", "zoneSize",
      "targetType", "sightSystem", "shotCount", "movement", "attentionalLoad", "complexity", "supervision"]);
    expect(comparePedagogicalVariables(snapshot({ numberOfHands: 1 }), snapshot({ numberOfHands: 2 })).changes[0])
      .toMatchObject({ key: "numberOfHands", kind: "modified" });
  });

  it("rend explicite une valeur non comparable sans inventer un décompte", () => {
    const invalid = snapshot({ cadence: (() => "fixture") as unknown as string });
    const analysis = comparePedagogicalVariables(snapshot(), invalid);
    const result = validateL1PlusProgression(snapshot(), invalid);
    expect(analysis).toMatchObject({ comparisonStatus: "not_comparable", changedVariableCount: null,
      nonComparableVariableKeys: ["cadence"] });
    expect(result).toMatchObject({ status: "not_comparable", compatibleWithNormalL1Plus: null,
      representsVariableProgression: null, configurationValidity: "not_assessed" });
  });
});

describe("règle structurelle L1+", () => {
  it("accepte structurellement zéro changement sans le qualifier de progression", () => {
    expect(validateL1PlusProgression(snapshot(), snapshot())).toMatchObject({ status: "no_variable_change",
      compatibleWithNormalL1Plus: true, representsVariableProgression: false });
  });

  it("qualifie exactement un changement comme compatible avec L1+", () => {
    expect(validateL1PlusProgression(snapshot(), snapshot({ supervision: "fixture" }))).toMatchObject({
      status: "compatible_single_change", compatibleWithNormalL1Plus: true, representsVariableProgression: true,
    });
  });

  it("ne déduit aucune difficulté et ne dépend pas de l'identité d'un exercice", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, "pedagogicalVariableProgression.ts"), "utf8");
    expect(source).not.toMatch(/ExerciseDefinition|MasteryLevel/);
    expect(source).not.toMatch(/difficultyScore|difficultyDirection|isHarder|isEasier/);
    expect(validateL1PlusProgression(snapshot({ distance: { value: 2, unit: "fixture" } }),
      snapshot({ distance: { value: 1, unit: "fixture" } })).configurationValidity).toBe("not_assessed");
  });
});

describe("schémas de résultat 4D", () => {
  it("valide les résultats produits par les fonctions pures", () => {
    const analysis = comparePedagogicalVariables(snapshot(), snapshot({ targetType: "fixture" }));
    const result = validateL1PlusProgression(snapshot(), snapshot({ targetType: "fixture" }));
    expect(pedagogicalVariableChangeAnalysisSchema.safeParse(analysis).success).toBe(true);
    expect(l1PlusValidationResultSchema.safeParse(result).success).toBe(true);
  });

  it("refuse un résultat L1+ incohérent avec son décompte", () => {
    const result = validateL1PlusProgression(snapshot(), snapshot({ targetType: "fixture" }));
    expect(l1PlusValidationResultSchema.safeParse({ ...result, status: "multiple_changes" }).success).toBe(false);
  });
});
