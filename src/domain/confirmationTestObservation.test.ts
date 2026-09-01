import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import type { ConfirmationOutcome } from "./coachingTypes";

describe("observation factuelle du test de stabilité du guidon", () => {
  it.each([
    ["Guidon stable", "does_not_support_hypothesis"],
    ["Mouvement latéral répétitif", "supports_hypothesis"],
    ["Mouvement vertical", "weakly_supports_hypothesis"],
    ["Mouvement variable", "weakly_supports_hypothesis"],
    ["Résultat non observable", "not_observed"],
  ] as const)("traduit %s pour l’hypothèse latérale", (observation, expected) => {
    expect(outcomeForTestObservation("TEST_SIGHT_STABILITY_DRY", "LATERAL_TRIGGER_PRESSURE", observation))
      .toBe(expected);
  });
});

describe("vérification de configuration", () => {
  it.each([
    ["Configuration cohérente", "does_not_support_hypothesis"],
    ["Écart entre saisie et conditions réelles", "supports_hypothesis"],
    ["Point visé différent de celui supposé", "supports_hypothesis"],
    ["Doute sur le réglage ou le matériel", "weakly_supports_hypothesis"],
    ["Vérification qualifiée nécessaire", "inconclusive"],
    ["Résultat non concluant", "inconclusive"],
  ] as const)("traduit %s sans interprétation probabiliste de l’utilisateur", (observation, expected) => {
    expect(outcomeForTestObservation(
      "TEST_EQUIPMENT_CONTEXT_CHECK",
      "EQUIPMENT_OR_SIGHT_ISSUE",
      observation,
    )).toBe(expected);
  });
});

describe("couverture explicite du catalogue actif", () => {
  it("traduit chaque observation de chaque test vers un statut autorisé", () => {
    for (const test of confirmationTestCatalog) {
      for (const observation of test.observationCriteria) {
        const outcome = outcomeForTestObservation(test.code, test.hypothesisCodes[0], observation);
        expect(test.possibleOutcomes, `${test.code} / ${observation}`).toContain(outcome);
      }
    }
  });

  it("déclare exactement les statuts produits par les 16 protocoles", () => {
    const expected: Record<string, readonly ConfirmationOutcome[]> = {
      TEST_TRIGGER_FINGER_PLACEMENT: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_SIGHT_STABILITY_DRY: ["supports_hypothesis", "weakly_supports_hypothesis", "does_not_support_hypothesis", "not_observed"],
      TEST_ANTICIPATION_DRY: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_GRIP_CONSTANCY: ["supports_hypothesis", "does_not_support_hypothesis"],
      TEST_TWO_HAND_CONTRIBUTION: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive"],
      TEST_TRIGGER_HAND_INDEPENDENCE: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_WRIST_STABILITY: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_RETURN_TO_LINE: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_VISUAL_FOCUS: ["supports_hypothesis", "does_not_support_hypothesis", "not_observed"],
      TEST_SIGHT_ALIGNMENT_REPRODUCIBILITY: ["supports_hypothesis", "does_not_support_hypothesis", "inconclusive", "not_observed"],
      TEST_AIMING_DURATION: ["supports_hypothesis", "does_not_support_hypothesis"],
      TEST_NATURAL_POINT: ["supports_hypothesis", "does_not_support_hypothesis"],
      TEST_SLOW_CONTROLLED_SERIES: ["supports_hypothesis", "does_not_support_hypothesis"],
      TEST_REGULAR_CADENCE: ["supports_hypothesis", "does_not_support_hypothesis"],
      TEST_DUMMY_ROUND_SUPERVISED: ["supports_hypothesis", "does_not_support_hypothesis", "not_observed"],
      TEST_EQUIPMENT_CONTEXT_CHECK: ["supports_hypothesis", "weakly_supports_hypothesis", "does_not_support_hypothesis", "inconclusive"],
    };
    expect(Object.keys(expected)).toHaveLength(16);
    for (const test of confirmationTestCatalog) {
      expect(test.possibleOutcomes).toEqual(expected[test.code]);
      expect(test.possibleOutcomes).not.toContain("contradicts_hypothesis");
      const produced = [...new Set(test.observationCriteria.map((observation) =>
        outcomeForTestObservation(test.code, test.hypothesisCodes[0], observation)))];
      expect(produced.sort()).toEqual([...expected[test.code]].sort());
    }
  });

  it("conserve contradicts_hypothesis comme statut global historique", () => {
    const historicalOutcome: ConfirmationOutcome = "contradicts_hypothesis";
    expect(historicalOutcome).toBe("contradicts_hypothesis");
  });

  it("rejette une observation étrangère au protocole", () => {
    expect(() => outcomeForTestObservation(
      "TEST_SIGHT_STABILITY_DRY",
      "LATERAL_TRIGGER_PRESSURE",
      "Cela renforce l’hypothèse",
    )).toThrow("Observation non prévue");
  });
});
