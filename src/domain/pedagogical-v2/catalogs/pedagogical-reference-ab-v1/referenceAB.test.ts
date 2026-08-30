import { describe, expect, it } from "vitest";
import { loadPedagogicalCatalog } from "../../catalogLoader";
import competencesFile from "./competences.json";
import toolsFile from "./tools.json";
import { loadPedagogicalReferenceABV1, pedagogicalReferenceABV1Files } from ".";

const expectedNames = {
  A1: "Construire une plateforme corporelle stable, naturelle et reproductible",
  A2: "Maintenir un équilibre corporel stable pendant l’ensemble du cycle de tir",
  A3: "Orienter naturellement la plateforme vers la zone de travail",
  A4: "Construire une stabilité corporelle sans rigidité excessive",
  A5: "Conserver l’organisation de la plateforme pendant l’ensemble du cycle",
  A6: "Reconstruire spontanément une plateforme fonctionnelle et reproductible après l’avoir quittée",
  B3: "Construire une prise fonctionnelle à deux mains",
  B4: "Construire une répartition stable des pressions entre main forte et main support",
  B5: "Maintenir une pression constante de la main forte pendant l’action de l’index",
  B6: "Organiser et stabiliser les poignets",
  B7: "Conserver une prise cohérente pendant tout le cycle",
  B8: "Reconstruire spontanément une prise identique après l’avoir quittée",
} as const;

const expectedPrerequisites: Record<keyof typeof expectedNames, readonly string[]> = {
  A1: [], A2: ["A1"], A3: ["A1", "A2"], A4: ["A1", "A2", "A3"],
  A5: ["A1", "A2", "A3", "A4"], A6: ["A1", "A2", "A3", "A4"],
  B3: [], B4: ["B3"], B5: ["B3", "B4"],
  B6: ["B3", "B4"], B7: ["B3", "B4", "B5", "B6"],
  B8: ["B3", "B4", "B5", "B6"],
};

const expectedDependents: Record<keyof typeof expectedNames, readonly string[]> = {
  A1: ["A2", "A3", "A4", "A5", "A6"], A2: ["A3", "A4", "A5", "A6"],
  A3: ["A4", "A5", "A6"], A4: ["A5", "A6"], A5: [], A6: [],
  B3: ["B4", "B5", "B6", "B7", "B8"], B4: ["B5", "B6", "B7", "B8"],
  B5: ["B7", "B8"], B6: ["B7", "B8"], B7: [], B8: [],
};

describe("référentiel réel A/B v1", () => {
  it("charge exactement les 12 compétences A/B après consolidation B1/B2/B3", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.competences).toHaveLength(12);
    expect(Object.fromEntries(catalog.competences.map((item) => [item.code, item.name]))).toEqual(expectedNames);
  });

  it("ne contient aucune compétence C–J ni aucun autre code", () => {
    const codes = loadPedagogicalReferenceABV1().competences.map((item) => item.code);
    expect(codes).toEqual(Object.keys(expectedNames));
    expect(codes.some((code) => /^[C-J]/.test(code))).toBe(false);
  });

  it("garantit l'unicité globale des codes et identifiants", () => {
    const catalog = loadPedagogicalReferenceABV1();
    const items = [...catalog.competences, ...catalog.tools];
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.code)).size).toBe(items.length);
  });

  it("charge le lot sans référence cassée ni cycle", () => {
    const result = loadPedagogicalCatalog(pedagogicalReferenceABV1Files);
    expect(result).toMatchObject({ success: true, diagnostics: [] });
  });

  it("encode exactement les prérequis autorisés", () => {
    const actual = Object.fromEntries(loadPedagogicalReferenceABV1().competences.map((item) => [
      item.code, item.prerequisiteIds.map((id) => id.replace("competence:", "")),
    ]));
    expect(actual).toEqual(expectedPrerequisites);
  });

  it("dérive correctement les dépendances sans seconde source de vérité", () => {
    expect(competencesFile.items.every((item) => !("dependentCompetenceIds" in item))).toBe(true);
    const actual = Object.fromEntries(loadPedagogicalReferenceABV1().competences.map((item) => [
      item.code, item.dependentCompetenceIds.map((id) => id.replace("competence:", "")),
    ]));
    expect(actual).toEqual(expectedDependents);
  });

  it("conserve une validation humaine pour les 12 compétences", () => {
    expect(loadPedagogicalReferenceABV1().competences.every((item) => item.validationMode === "instructor")).toBe(true);
    expect(loadPedagogicalReferenceABV1().competences.some((item) => item.validationMode === "automatic")).toBe(false);
  });

  it("préserve la séparation de B5 et B6 ainsi que les composantes internes de B6", () => {
    const catalog = loadPedagogicalReferenceABV1();
    const b5 = catalog.competences.find((item) => item.code === "B5")!;
    const b6 = catalog.competences.find((item) => item.code === "B6")!;
    expect(b5.id).not.toBe(b6.id);
    expect(b5.name).toBe(expectedNames.B5);
    expect(b6.name).toBe(expectedNames.B6);
    expect(b6.internalComponents).toEqual([
      { code: "B6.1", description: "construire la géométrie fonctionnelle des poignets" },
      { code: "B6.2", description: "conserver cette géométrie pendant le cycle" },
    ]);
    expect(catalog.competences.some((item) => item.code === "B6.1" || item.code === "B6.2")).toBe(false);
  });

  it("conserve les anciennes étapes B1/B2 comme composantes internes de B3", () => {
    expect(loadPedagogicalReferenceABV1().competences.find((item) => item.code === "B3")?.internalComponents)
      .toEqual([
        { code: "B3.1", description: "installer la main forte" },
        { code: "B3.2", description: "installer la main support" },
        { code: "B3.3", description: "assembler les deux mains en une unité fonctionnelle" },
      ]);
  });

  it("préserve conserver et reconstruire comme compétences distinctes pour B7/B8", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.competences.find((item) => item.code === "B7")?.name).toBe(expectedNames.B7);
    expect(catalog.competences.find((item) => item.code === "B8")?.name).toBe(expectedNames.B8);
    expect(expectedPrerequisites.B8).not.toContain("B7");
  });

  it("préserve conserver et reconstruire comme compétences distinctes pour A5/A6", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.competences.find((item) => item.code === "A5")?.name).toBe(expectedNames.A5);
    expect(catalog.competences.find((item) => item.code === "A6")?.name).toBe(expectedNames.A6);
    expect(expectedPrerequisites.A6).not.toContain("A5");
  });

  it("mutualise exactement les sept outils pédagogiques autorisés", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.tools.map((item) => item.code).sort()).toEqual([
      "BANANA_APPLE_ANALOGY", "FLOOR_POSITION_REFERENCES", "INSTRUCTOR_TACTILE_FEEDBACK",
      "MARKER_HAND_REFERENCES", "MIRROR_FEEDBACK", "OBSERVATION_VIDEO", "REFERENCE_PHOTO",
    ]);
    expect(new Set(catalog.tools.map((item) => item.code)).size).toBe(7);
  });

  it("résout tous les outils associés aux compétences", () => {
    const catalog = loadPedagogicalReferenceABV1();
    const toolIds = new Set(catalog.tools.map((item) => item.id));
    expect(catalog.competences.flatMap((item) => item.pedagogicalToolIds ?? [])
      .every((id) => toolIds.has(id))).toBe(true);
  });

  it("refuse un outil de compétence inexistant", () => {
    const brokenCompetences = {
      ...competencesFile,
      items: competencesFile.items.map((item) => item.code === "A1"
        ? { ...item, pedagogicalToolIds: ["pedagogical-tool:TEST-MISSING"] } : item),
    };
    const result = loadPedagogicalCatalog([brokenCompetences, toolsFile]);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "BROKEN_REFERENCE", itemId: "competence:A1" }),
    ]));
  });

  it("ajoute les chaînes B4, B6 et B7 sans domaine ni compétence supplémentaires", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-B4-01", "TECH-B6-01", "TECH-B7-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-B4-01", "EX-B6-01", "EX-B6-02", "EX-B7-01"]);
    expect(catalog.competences).toHaveLength(12);
    expect(new Set(catalog.competences.map((item) => item.domain))).toEqual(new Set(["A", "B"]));
  });

  it("fige les versions du premier lot réel", () => {
    const catalog = loadPedagogicalReferenceABV1();
    expect(catalog.catalogVersion).toBe("pedagogical-reference-ab-v1");
    expect([...catalog.competences, ...catalog.tools].every((item) =>
      item.itemVersion === "1.0.0" && item.schemaVersion === "pedagogical-v2-contracts-v1" &&
      item.catalogVersion === "pedagogical-reference-ab-v1")).toBe(true);
  });
});
