import { describe, expect, it } from "vitest";
import {
  evidenceEffects,
  exerciseIdentity,
  isCurrentlyAutomaticValidation,
  masteryLevels,
  pedagogicalDecisionTypes,
  pedagogicalVariableKeys,
  validationModes,
  type ExerciseDefinition,
  type PedagogicalVariables,
} from "./contracts";

const variables: PedagogicalVariables = {
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

const exercise: ExerciseDefinition = {
  id: "exercise.test.identity",
  code: "TEST_EXERCISE",
  schemaVersion: "test-schema-1",
  itemVersion: "1.0.0",
  catalogVersion: "test-catalog-1",
  name: "Exercice synthétique",
  primaryCompetenceId: "competence.test.primary",
  secondaryCompetenceIds: [],
  pedagogicalTechniqueIds: [],
  learningPhase: null,
  pedagogicalObjective: "Objectif synthétique de validation",
  rationale: "Fixture technique sans contenu de référentiel",
  prerequisiteCompetenceIds: [],
  modeCodes: [],
  instructorRequired: false,
  technicalEquipmentCodes: [],
  protocol: [],
  instructions: [],
  desiredSensations: [],
  frequentErrors: [],
  successCriteria: ["Critère synthétique"],
  stopCriteria: ["Arrêt synthétique"],
  doNotUseWhen: [],
  pedagogicalToolIds: [],
  defaultVariables: variables,
  modifiableVariableKeys: [],
};

describe("contrats pédagogiques v2", () => {
  it("fige strictement les modes de validation", () => {
    expect(validationModes).toEqual(["automatic", "semi_automatic", "instructor", "future_video"]);
  });

  it("fige strictement les niveaux de maîtrise", () => {
    expect(masteryLevels).toEqual([
      "not_evaluated", "discovery", "acquisition", "stabilization", "transfer", "robustness",
    ]);
  });

  it("fige strictement les décisions pédagogiques", () => {
    expect(pedagogicalDecisionTypes).toEqual([
      "PROGRESS", "MAINTAIN", "SIMPLIFY", "RETURN_TO_PREREQUISITE", "TEST_ANOTHER_HYPOTHESIS",
      "INSUFFICIENT_INFORMATION", "STOP",
    ]);
  });

  it("fige strictement les effets d'evidence", () => {
    expect(evidenceEffects).toEqual(["strengthens", "weakens", "contradicts", "neutral"]);
  });

  it("ne traite jamais future_video comme une validation automatique actuelle", () => {
    expect(isCurrentlyAutomaticValidation("automatic")).toBe(true);
    expect(isCurrentlyAutomaticValidation("semi_automatic")).toBe(false);
    expect(isCurrentlyAutomaticValidation("instructor")).toBe(false);
    expect(isCurrentlyAutomaticValidation("future_video")).toBe(false);
  });

  it("sépare les variables de l'identité versionnée de l'exercice", () => {
    const changed = { ...exercise, defaultVariables: { ...variables, shotCount: 7 } };
    expect(exerciseIdentity(changed)).toEqual(exerciseIdentity(exercise));
    expect(changed.defaultVariables).not.toEqual(exercise.defaultVariables);
  });

  it("déclare exactement les douze variables pédagogiques validées", () => {
    expect(pedagogicalVariableKeys).toEqual([
      "distance", "numberOfHands", "time", "cadence", "zoneSize", "targetType", "sightSystem", "shotCount",
      "movement", "attentionalLoad", "complexity", "supervision",
    ]);
  });
});

