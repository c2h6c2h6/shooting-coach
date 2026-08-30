import { describe, expect, it } from "vitest";
import {
  competenceSchema,
  evidenceEffectSchema,
  exerciseDefinitionSchema,
  masteryLevelSchema,
  pedagogicalDecisionTypeSchema,
  pedagogicalEvidenceSchema,
  pedagogicalToolSchema,
  pedagogicalVariablesSchema,
  validationModeSchema,
} from "./schemas";

const versions = {
  id: "test.stable-id",
  schemaVersion: "test-schema-1",
  itemVersion: "1.0.0",
  catalogVersion: "test-catalog-1",
};

const variables = {
  distance: null, numberOfHands: null, time: null, cadence: null, zoneSize: null, targetType: null,
  sightSystem: null, shotCount: null, movement: null, attentionalLoad: null, complexity: null, supervision: null,
};

const competence = {
  ...versions,
  code: "TEST_COMPETENCE",
  domain: "test-domain",
  name: "Compétence synthétique",
  definition: "Fixture de contrat sans contenu métier",
  pedagogicalObjective: "Valider la structure",
  prerequisiteIds: [],
  dependentCompetenceIds: [],
  observableIndicators: [],
  indirectIndicators: [],
  interpretationLimits: [],
  validationMode: "automatic",
};

const exercise = {
  ...versions,
  id: "test.exercise",
  code: "TEST_EXERCISE",
  name: "Exercice synthétique",
  primaryCompetenceId: "test.primary",
  secondaryCompetenceIds: ["test.secondary"],
  pedagogicalTechniqueIds: [],
  learningPhase: null,
  pedagogicalObjective: "Objectif synthétique unique",
  rationale: "Valider la structure",
  prerequisiteCompetenceIds: [],
  modeCodes: [],
  instructorRequired: false,
  technicalEquipmentCodes: [],
  protocol: [],
  instructions: [],
  desiredSensations: [],
  frequentErrors: [],
  successCriteria: ["Succès synthétique"],
  stopCriteria: ["Arrêt synthétique"],
  doNotUseWhen: [],
  pedagogicalToolIds: [],
  defaultVariables: variables,
  modifiableVariableKeys: ["distance"],
};

describe("schémas pédagogiques v2", () => {
  it("valide une compétence versionnée et refuse un identifiant ou une version absents", () => {
    expect(competenceSchema.safeParse(competence).success).toBe(true);
    expect(competenceSchema.safeParse({ ...competence, id: "" }).success).toBe(false);
    expect(competenceSchema.safeParse({ ...competence, itemVersion: "" }).success).toBe(false);
    expect(competenceSchema.safeParse({ ...competence, catalogVersion: "" }).success).toBe(false);
  });

  it("valide un exercice avec une compétence principale scalaire unique", () => {
    expect(exerciseDefinitionSchema.safeParse(exercise).success).toBe(true);
    expect(exerciseDefinitionSchema.safeParse({ ...exercise, primaryCompetenceId: "" }).success).toBe(false);
    expect(exerciseDefinitionSchema.safeParse({ ...exercise, primaryCompetenceId: ["test.primary"] }).success).toBe(false);
  });

  it("refuse de répéter la compétence principale parmi les secondaires", () => {
    const result = exerciseDefinitionSchema.safeParse({
      ...exercise, secondaryCompetenceIds: [exercise.primaryCompetenceId],
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((item) => item.path === "secondaryCompetenceIds")).toBe(true);
  });

  it("refuse les niveaux, décisions, modes et effets hors énumération", () => {
    expect(masteryLevelSchema.safeParse("expert").success).toBe(false);
    expect(pedagogicalDecisionTypeSchema.safeParse("REPEAT_FOREVER").success).toBe(false);
    expect(validationModeSchema.safeParse("video").success).toBe(false);
    expect(evidenceEffectSchema.safeParse("proves").success).toBe(false);
  });

  it("refuse une variable inconnue et exige les douze variables séparées", () => {
    expect(pedagogicalVariablesSchema.safeParse(variables).success).toBe(true);
    expect(pedagogicalVariablesSchema.safeParse({ ...variables, unknownDifficulty: 1 }).success).toBe(false);
    const { supervision: _omitted, ...incomplete } = variables;
    expect(pedagogicalVariablesSchema.safeParse(incomplete).success).toBe(false);
  });

  it("distingue un outil pédagogique du matériel technique", () => {
    const tool = { ...versions, kind: "pedagogical_tool", code: "TEST_TOOL", name: "Outil synthétique", description: "Fixture" };
    expect(pedagogicalToolSchema.safeParse(tool).success).toBe(true);
    expect(pedagogicalToolSchema.safeParse({ ...tool, kind: "technical_equipment" }).success).toBe(false);
    expect(exerciseDefinitionSchema.safeParse({ ...exercise, technicalEquipmentCodes: ["test.equipment"] }).success).toBe(true);
  });

  it("valide une evidence structurée et borne force et fiabilité", () => {
    const evidence = {
      ...versions, subjectType: "hypothesis", subjectId: "test.subject", sourceType: "test_result",
      sourceReferenceId: null, value: { result: "synthetic" }, effect: "strengthens", strength: 0.6, reliability: 0.8,
    };
    expect(pedagogicalEvidenceSchema.safeParse(evidence).success).toBe(true);
    expect(pedagogicalEvidenceSchema.safeParse({ ...evidence, strength: 1.1 }).success).toBe(false);
    expect(pedagogicalEvidenceSchema.safeParse({ ...evidence, reliability: -0.1 }).success).toBe(false);
  });

  it("exige des critères de réussite et d'arrêt pour chaque exercice", () => {
    expect(exerciseDefinitionSchema.safeParse({ ...exercise, successCriteria: [] }).success).toBe(false);
    expect(exerciseDefinitionSchema.safeParse({ ...exercise, stopCriteria: [] }).success).toBe(false);
  });
});

