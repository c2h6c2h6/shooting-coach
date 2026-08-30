import { describe, expect, it } from "vitest";
import { PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION } from "./contracts";
import { PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION } from "./inputContracts";
import { loadPedagogicalCatalog, parsePedagogicalCatalog } from "./catalogLoader";
import type { PedagogicalCatalogFile } from "./catalogContracts";

const FIXTURE_CATALOG_VERSION = "TEST-FIXTURE-CATALOG-1";
const versions = {
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "TEST-FIXTURE-ITEM-1",
  catalogVersion: FIXTURE_CATALOG_VERSION,
};

const emptyVariables = {
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

const fixtureCompetenceRoot = {
  ...versions,
  id: "TEST-FIXTURE-COMPETENCE-ROOT",
  code: "TEST_FIXTURE_COMPETENCE_ROOT",
  domain: "TEST_FIXTURE_DOMAIN",
  name: "TEST/FIXTURE compétence racine",
  definition: "TEST/FIXTURE sans contenu pédagogique réel",
  pedagogicalObjective: "TEST/FIXTURE objectif structurel",
  prerequisiteIds: [],
  observableIndicators: [],
  indirectIndicators: [],
  interpretationLimits: [],
  validationMode: "automatic" as const,
};

const fixtureCompetenceChild = {
  ...fixtureCompetenceRoot,
  id: "TEST-FIXTURE-COMPETENCE-CHILD",
  code: "TEST_FIXTURE_COMPETENCE_CHILD",
  name: "TEST/FIXTURE compétence dépendante",
  prerequisiteIds: [fixtureCompetenceRoot.id],
};

const fixtureTool = {
  ...versions,
  id: "TEST-FIXTURE-TOOL",
  code: "TEST_FIXTURE_TOOL",
  kind: "pedagogical_tool" as const,
  name: "TEST/FIXTURE outil",
  description: "TEST/FIXTURE sans outil pédagogique réel",
};

const fixtureTechnique = {
  ...versions,
  id: "TEST-FIXTURE-TECHNIQUE",
  code: "TEST_FIXTURE_TECHNIQUE",
  name: "TEST/FIXTURE technique",
  principle: "TEST/FIXTURE sans principe pédagogique réel",
  compatibleCompetenceIds: [fixtureCompetenceChild.id],
  indications: [],
  contraindications: [],
  instructorRequired: false,
  compatiblePedagogicalToolIds: [fixtureTool.id],
};

const fixtureExercise = {
  ...versions,
  id: "TEST-FIXTURE-EXERCISE",
  code: "TEST_FIXTURE_EXERCISE",
  name: "TEST/FIXTURE exercice",
  primaryCompetenceId: fixtureCompetenceChild.id,
  secondaryCompetenceIds: [],
  pedagogicalTechniqueIds: [fixtureTechnique.id],
  learningPhase: null,
  pedagogicalObjective: "TEST/FIXTURE objectif unique",
  rationale: "TEST/FIXTURE validation du chargeur",
  prerequisiteCompetenceIds: [fixtureCompetenceRoot.id],
  modeCodes: [],
  instructorRequired: false,
  technicalEquipmentCodes: [],
  protocol: [],
  instructions: [],
  desiredSensations: [],
  frequentErrors: [],
  successCriteria: ["TEST/FIXTURE succès"],
  stopCriteria: ["TEST/FIXTURE arrêt"],
  doNotUseWhen: [],
  pedagogicalToolIds: [fixtureTool.id],
  defaultVariables: emptyVariables,
  modifiableVariableKeys: ["distance"] as const,
};

const fixtureDiagnosticTest = {
  id: "TEST-FIXTURE-DIAGNOSTIC-TEST",
  code: "TEST_FIXTURE_DIAGNOSTIC_TEST",
  name: "TEST/FIXTURE test diagnostique",
  objective: "TEST/FIXTURE réduire une incertitude structurelle",
  discriminatedHypothesisIds: [],
  discriminatedUncertaintyCodes: ["TEST_FIXTURE_UNCERTAINTY"],
  observedCompetenceId: fixtureCompetenceChild.id,
  prerequisiteReferenceIds: [fixtureCompetenceRoot.id],
  conditionsOfUse: ["TEST/FIXTURE condition"],
  interpretationLimits: ["TEST/FIXTURE limite"],
  stopCriteria: ["TEST/FIXTURE arrêt"],
  validationMode: "instructor" as const,
  supervisionRequirements: ["TEST/FIXTURE supervision"],
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  itemVersion: "TEST-FIXTURE-ITEM-1",
  catalogVersion: FIXTURE_CATALOG_VERSION,
};

function file(kind: PedagogicalCatalogFile["kind"], items: readonly unknown[]): Record<string, unknown> {
  const schemaVersion = kind === "diagnostic_tests"
    ? PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION
    : PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION;
  return { kind, schemaVersion, catalogVersion: FIXTURE_CATALOG_VERSION, items };
}

function validFiles(): Record<string, unknown>[] {
  return [
    file("competences", [fixtureCompetenceRoot, fixtureCompetenceChild]),
    file("tools", [fixtureTool]),
    file("techniques", [fixtureTechnique]),
    file("exercises", [fixtureExercise]),
    file("diagnostic_tests", [fixtureDiagnosticTest]),
  ];
}

function replaceItem(files: Record<string, unknown>[], kind: string, transform: (item: Record<string, unknown>) => unknown) {
  return files.map((catalogFile) => catalogFile.kind !== kind ? catalogFile : {
    ...catalogFile,
    items: (catalogFile.items as Record<string, unknown>[]).map(transform),
  });
}

function diagnosticCodes(files: readonly unknown[]) {
  const result = loadPedagogicalCatalog(files);
  expect(result.success).toBe(false);
  return result.success ? [] : result.diagnostics.map((item) => item.code);
}

describe("chargeur de référentiels pédagogiques v2", () => {
  it("charge un catalogue TEST/FIXTURE valide", () => {
    const result = loadPedagogicalCatalog(validFiles());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.catalog.catalogVersion).toBe(FIXTURE_CATALOG_VERSION);
      expect(result.catalog.competences).toHaveLength(2);
      expect(result.catalog.exercises).toHaveLength(1);
      expect(result.catalog.diagnosticTests).toHaveLength(1);
    }
  });

  it("refuse une version de schéma incompatible", () => {
    const files = validFiles();
    files[0] = { ...files[0], schemaVersion: "TEST-FIXTURE-INCOMPATIBLE" };
    expect(diagnosticCodes(files)).toContain("INCOMPATIBLE_SCHEMA_VERSION");
  });

  it("refuse une version de catalogue absente", () => {
    const files = validFiles();
    files[0] = { ...files[0], catalogVersion: "" };
    expect(diagnosticCodes(files)).toContain("MISSING_CATALOG_VERSION");
  });

  it("refuse une version individuelle absente", () => {
    const files = replaceItem(validFiles(), "tools", (item) => ({ ...item, itemVersion: "" }));
    expect(diagnosticCodes(files)).toContain("INVALID_ITEM");
  });

  it("refuse une version de schéma individuelle incompatible", () => {
    const files = replaceItem(validFiles(), "tools", (item) => ({
      ...item, schemaVersion: "TEST-FIXTURE-INCOMPATIBLE",
    }));
    expect(diagnosticCodes(files)).toContain("ITEM_SCHEMA_VERSION_MISMATCH");
  });

  it("refuse une version de catalogue individuelle incohérente", () => {
    const files = replaceItem(validFiles(), "tools", (item) => ({
      ...item, catalogVersion: "TEST-FIXTURE-OTHER-CATALOG",
    }));
    expect(diagnosticCodes(files)).toContain("ITEM_CATALOG_VERSION_MISMATCH");
  });

  it("refuse un doublon d'identifiant, même entre types de fiches", () => {
    const files = replaceItem(validFiles(), "tools", (item) => ({ ...item, id: fixtureCompetenceRoot.id }));
    expect(diagnosticCodes(files)).toContain("DUPLICATE_ID");
  });

  it("refuse un doublon de code, même entre types de fiches", () => {
    const files = replaceItem(validFiles(), "tools", (item) => ({ ...item, code: fixtureCompetenceRoot.code }));
    expect(diagnosticCodes(files)).toContain("DUPLICATE_CODE");
  });

  it("refuse un prérequis inexistant", () => {
    const files = replaceItem(validFiles(), "competences", (item) => item.id === fixtureCompetenceChild.id
      ? { ...item, prerequisiteIds: ["TEST-FIXTURE-MISSING-COMPETENCE"] } : item);
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("refuse un cycle direct de prérequis", () => {
    const files = replaceItem(validFiles(), "competences", (item) => item.id === fixtureCompetenceRoot.id
      ? { ...item, prerequisiteIds: [fixtureCompetenceRoot.id] } : item);
    expect(diagnosticCodes(files)).toContain("PREREQUISITE_CYCLE");
  });

  it("refuse un cycle indirect de prérequis", () => {
    const third = {
      ...fixtureCompetenceRoot,
      id: "TEST-FIXTURE-COMPETENCE-THIRD",
      code: "TEST_FIXTURE_COMPETENCE_THIRD",
      prerequisiteIds: [fixtureCompetenceChild.id],
    };
    let files = replaceItem(validFiles(), "competences", (item) => item.id === fixtureCompetenceRoot.id
      ? { ...item, prerequisiteIds: [third.id] } : item);
    files = files.map((catalogFile) => catalogFile.kind === "competences"
      ? { ...catalogFile, items: [...catalogFile.items as unknown[], third] } : catalogFile);
    expect(diagnosticCodes(files)).toContain("PREREQUISITE_CYCLE");
  });

  it("refuse une technique inexistante", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, pedagogicalTechniqueIds: ["TEST-FIXTURE-MISSING-TECHNIQUE"],
    }));
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("refuse un outil pédagogique inexistant", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, pedagogicalToolIds: ["TEST-FIXTURE-MISSING-TOOL"],
    }));
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("refuse une compétence secondaire inexistante", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, secondaryCompetenceIds: ["TEST-FIXTURE-MISSING-SECONDARY"],
    }));
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("refuse une compétence principale également secondaire", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, secondaryCompetenceIds: [fixtureExercise.primaryCompetenceId],
    }));
    expect(diagnosticCodes(files)).toContain("INVALID_ITEM");
  });

  it("refuse une variable par défaut non autorisée par le contrat", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item,
      defaultVariables: { ...emptyVariables, TEST_FIXTURE_UNAUTHORIZED_VARIABLE: "TEST/FIXTURE" },
    }));
    expect(diagnosticCodes(files)).toContain("INVALID_ITEM");
  });

  it("refuse une variable modifiable inconnue", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, modifiableVariableKeys: ["TEST_FIXTURE_UNKNOWN_VARIABLE"],
    }));
    expect(diagnosticCodes(files)).toContain("INVALID_ITEM");
  });

  it("dérive les compétences dépendantes uniquement depuis les prérequis", () => {
    const catalog = parsePedagogicalCatalog(validFiles());
    const root = catalog.competences.find((item) => item.id === fixtureCompetenceRoot.id);
    const child = catalog.competences.find((item) => item.id === fixtureCompetenceChild.id);
    expect(root?.dependentCompetenceIds).toEqual([fixtureCompetenceChild.id]);
    expect(child?.dependentCompetenceIds).toEqual([]);
  });

  it("refuse dependentCompetenceIds dans un fichier source", () => {
    const files = replaceItem(validFiles(), "competences", (item) => ({ ...item, dependentCompetenceIds: [] }));
    expect(diagnosticCodes(files)).toContain("INVALID_ITEM");
  });

  it("produit le même catalogue quel que soit l'ordre des fichiers et éléments", () => {
    const forward = parsePedagogicalCatalog(validFiles());
    const reversedFiles = validFiles().reverse().map((catalogFile) => ({
      ...catalogFile,
      items: [...catalogFile.items as unknown[]].reverse(),
    }));
    expect(parsePedagogicalCatalog(reversedFiles)).toEqual(forward);
  });

  it("reconnaît diagnostic_tests avec son schemaVersion spécifique", () => {
    const result = loadPedagogicalCatalog(validFiles());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.catalog.diagnosticTests).toEqual([fixtureDiagnosticTest]);
    }
  });

  it("refuse le schéma historique pour un fichier diagnostic_tests", () => {
    const files = validFiles().map((catalogFile) => catalogFile.kind === "diagnostic_tests"
      ? { ...catalogFile, schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION } : catalogFile);
    expect(diagnosticCodes(files)).toContain("INCOMPATIBLE_SCHEMA_VERSION");
  });

  it("refuse un schéma individuel incorrect pour un DiagnosticTestDefinition", () => {
    const files = replaceItem(validFiles(), "diagnostic_tests", (item) => ({
      ...item, schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    }));
    expect(diagnosticCodes(files)).toContain("ITEM_SCHEMA_VERSION_MISMATCH");
  });

  it("refuse un doublon d'identifiant porté par un diagnostic test", () => {
    const duplicate = { ...fixtureDiagnosticTest, code: "TEST_FIXTURE_DIAGNOSTIC_DUPLICATE" };
    const files = validFiles().map((catalogFile) => catalogFile.kind === "diagnostic_tests"
      ? { ...catalogFile, items: [fixtureDiagnosticTest, duplicate] } : catalogFile);
    expect(diagnosticCodes(files)).toContain("DUPLICATE_ID");
  });

  it("refuse un doublon de code porté par un diagnostic test", () => {
    const duplicate = { ...fixtureDiagnosticTest, id: "TEST-FIXTURE-DIAGNOSTIC-DUPLICATE" };
    const files = validFiles().map((catalogFile) => catalogFile.kind === "diagnostic_tests"
      ? { ...catalogFile, items: [fixtureDiagnosticTest, duplicate] } : catalogFile);
    expect(diagnosticCodes(files)).toContain("DUPLICATE_CODE");
  });

  it("résout la compétence observée et refuse une référence cassée", () => {
    expect(loadPedagogicalCatalog(validFiles()).success).toBe(true);
    const files = replaceItem(validFiles(), "diagnostic_tests", (item) => ({
      ...item, observedCompetenceId: "TEST-FIXTURE-MISSING-COMPETENCE",
    }));
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("résout les prérequis génériques et refuse une référence cassée", () => {
    expect(loadPedagogicalCatalog(validFiles()).success).toBe(true);
    const files = replaceItem(validFiles(), "diagnostic_tests", (item) => ({
      ...item, prerequisiteReferenceIds: ["TEST-FIXTURE-MISSING-REFERENCE"],
    }));
    expect(diagnosticCodes(files)).toContain("BROKEN_REFERENCE");
  });

  it("produit un diagnostic lisible et une erreur agrégée", () => {
    const files = replaceItem(validFiles(), "exercises", (item) => ({
      ...item, pedagogicalTechniqueIds: ["TEST-FIXTURE-MISSING-TECHNIQUE"],
    }));
    expect(() => parsePedagogicalCatalog(files)).toThrow(/BROKEN_REFERENCE.*technique pédagogique introuvable/s);
  });
});
