import { describe, expect, it } from "vitest";
import { loadPedagogicalCatalog } from "../../catalogLoader";
import competencesFile from "./competences.json";
import { loadPedagogicalReferenceCV1, pedagogicalReferenceCV1Files } from ".";

const expectedNames = {
  C1: "Construire l’alignement des organes de visée",
  C2: "Construire une image de visée",
  C3: "Porter son attention sur le bon repère visuel",
  C4: "Observer sa zone de stabilité",
  C5: "Comprendre la précision réellement nécessaire",
  C6: "Maintenir une information de visée exploitable pendant l’action sur la détente",
  C7: "Assurer le suivi visuel du départ du coup",
  C8: "Réacquérir une image de visée exploitable après le départ du coup",
} as const;

const expectedPrerequisites: Record<keyof typeof expectedNames, readonly string[]> = {
  C1: [],
  C2: ["C1"],
  C3: ["C1", "C2"],
  C4: ["C3"],
  C5: ["C1", "C2", "C3"],
  C6: ["C1", "C3", "C4", "C5"],
  C7: ["C3", "C6"],
  C8: ["C7"],
};

const expectedDependents: Record<keyof typeof expectedNames, readonly string[]> = {
  C1: ["C2", "C3", "C5", "C6"],
  C2: ["C3", "C5"],
  C3: ["C4", "C5", "C6", "C7"],
  C4: ["C6"],
  C5: ["C6"],
  C6: ["C7"],
  C7: ["C8"],
  C8: [],
};

const byCode = () => new Map(loadPedagogicalReferenceCV1().competences.map((item) => [item.code, item]));

describe("référentiel réel C v1", () => {
  it("charge exactement les huit compétences C autorisées", () => {
    const catalog = loadPedagogicalReferenceCV1();
    expect(catalog.competences).toHaveLength(8);
    expect(Object.fromEntries(catalog.competences.map((item) => [item.code, item.name]))).toEqual(expectedNames);
  });

  it("contient uniquement C1 à C8, sans C9 ni domaine D–J", () => {
    const catalog = loadPedagogicalReferenceCV1();
    expect(catalog.competences.map((item) => item.code)).toEqual(Object.keys(expectedNames));
    expect(catalog.competences.some((item) => item.code === "C9" || /^[D-J]/.test(item.code))).toBe(false);
    expect(new Set(catalog.competences.map((item) => item.domain))).toEqual(new Set(["C"]));
  });

  it("garantit l’unicité globale des codes et identifiants", () => {
    const catalog = loadPedagogicalReferenceCV1();
    const items = [...catalog.competences, ...catalog.tools];
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
    expect(new Set(items.map((item) => item.code)).size).toBe(items.length);
  });

  it("charge le lot sans référence cassée ni cycle", () => {
    expect(loadPedagogicalCatalog(pedagogicalReferenceCV1Files)).toMatchObject({ success: true, diagnostics: [] });
  });

  it("encode exactement les prérequis internes déclarés", () => {
    const actual = Object.fromEntries(loadPedagogicalReferenceCV1().competences.map((item) => [
      item.code,
      item.prerequisiteIds.map((id) => id.replace("competence:", "")),
    ]));
    expect(actual).toEqual(expectedPrerequisites);
    expect(actual.C6).not.toContain("C2");
    expect(actual.C8).toEqual(["C7"]);
  });

  it("dérive correctement toutes les compétences dépendantes", () => {
    expect(competencesFile.items.every((item) => !("dependentCompetenceIds" in item))).toBe(true);
    const actual = Object.fromEntries(loadPedagogicalReferenceCV1().competences.map((item) => [
      item.code,
      item.dependentCompetenceIds.map((id) => id.replace("competence:", "")),
    ]));
    expect(actual).toEqual(expectedDependents);
  });

  it("conserve le mode instructor pour les huit compétences", () => {
    const competences = loadPedagogicalReferenceCV1().competences;
    expect(competences.every((item) => item.validationMode === "instructor")).toBe(true);
    expect(competences.some((item) => item.validationMode === "automatic")).toBe(false);
  });

  it("préserve C1, C2 et C3 comme compétences distinctes", () => {
    const competences = byCode();
    expect(competences.get("C1")?.definition).toContain("relation géométrique");
    expect(competences.get("C2")?.definition).toContain("image globale");
    expect(competences.get("C3")?.definition).toContain("repère visuel pertinent");
    expect(new Set([competences.get("C1")?.id, competences.get("C2")?.id, competences.get("C3")?.id]).size).toBe(3);
  });

  it("préserve C4 et C5 sans encoder la future décision du domaine H", () => {
    const competences = byCode();
    expect(competences.get("C4")?.name).toBe(expectedNames.C4);
    expect(competences.get("C5")?.name).toBe(expectedNames.C5);
    expect(competences.get("C5")?.interpretationLimits).toContain("aucune règle opérationnelle d’engagement ne doit être dérivée de C5");
    expect(loadPedagogicalReferenceCV1().competences.some((item) => item.domain === "H")).toBe(false);
  });

  it("préserve C6, C7 et C8 comme trois objets distincts, sans compétence D", () => {
    const competences = byCode();
    expect(competences.get("C6")?.name).toBe(expectedNames.C6);
    expect(competences.get("C7")?.name).toBe(expectedNames.C7);
    expect(competences.get("C8")?.name).toBe(expectedNames.C8);
    expect(new Set([competences.get("C6")?.id, competences.get("C7")?.id, competences.get("C8")?.id]).size).toBe(3);
    expect(loadPedagogicalReferenceCV1().competences.some((item) => item.domain === "D")).toBe(false);
  });

  it("réutilise uniquement les trois outils mutualisés autorisés, sans doublon", () => {
    const tools = loadPedagogicalReferenceCV1().tools;
    expect(tools.map((item) => item.code).sort()).toEqual(["MIRROR_FEEDBACK", "OBSERVATION_VIDEO", "REFERENCE_PHOTO"]);
    expect(new Set(tools.map((item) => item.id)).size).toBe(3);
  });

  it("résout tous les outils associés aux compétences", () => {
    const catalog = loadPedagogicalReferenceCV1();
    const toolIds = new Set(catalog.tools.map((item) => item.id));
    expect(catalog.competences.flatMap((item) => item.pedagogicalToolIds ?? []).every((id) => toolIds.has(id))).toBe(true);
  });

  it("encode uniquement la chaîne d’alignement C1 sans hypothèse ni décision dans les compétences", () => {
    const catalog = loadPedagogicalReferenceCV1();
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-C1-01"]);
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-C1-01"]);
    expect(catalog.diagnosticTests.map((item) => item.code)).toEqual(["TEST-C1-ALIGNMENT-01"]);
    const forbiddenKeys = new Set(["exercises", "diagnosticTests", "hypotheses", "observations", "pedagogicalDecisions", "recommendations"]);
    expect(competencesFile.items.every((item) => Object.keys(item).every((key) => !forbiddenKeys.has(key)))).toBe(true);
  });

  it("conserve l’horloge comme simple note et non comme ExerciseDefinition", () => {
    const c5 = byCode().get("C5")!;
    expect(c5.pedagogicalSupportNotes?.join(" ")).toContain("l’horloge");
    expect(loadPedagogicalReferenceCV1().exercises.some((item) => /horloge/i.test(item.name))).toBe(false);
  });

  it("fige les versions du domaine C", () => {
    const catalog = loadPedagogicalReferenceCV1();
    expect(catalog.catalogVersion).toBe("pedagogical-reference-c-v1");
    expect([...catalog.competences, ...catalog.tools, ...catalog.techniques, ...catalog.exercises].every((item) =>
      item.itemVersion === "1.0.0" && item.schemaVersion === "pedagogical-v2-contracts-v1" &&
      item.catalogVersion === "pedagogical-reference-c-v1")).toBe(true);
  });
});
