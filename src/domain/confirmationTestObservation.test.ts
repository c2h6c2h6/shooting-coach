import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { outcomeForTestObservation } from "./confirmationTestObservation";

describe("observation factuelle du test de stabilité du guidon", () => {
  it.each([
    ["Guidon stable", "does_not_support_hypothesis"],
    ["Mouvement latéral répétitif", "supports_hypothesis"],
    ["Mouvement vertical", "supports_hypothesis"],
    ["Mouvement variable", "weakly_supports_hypothesis"],
    ["Résultat non observable", "not_observed"],
  ] as const)("traduit %s pour l’hypothèse d’action brusque", (observation, expected) => {
    expect(outcomeForTestObservation("TEST_SIGHT_STABILITY_DRY", "ABRUPT_TRIGGER_PRESS", observation))
      .toBe(expected);
  });

  it("donne au mouvement variable son sens propre pour une action inconstante", () => {
    expect(outcomeForTestObservation(
      "TEST_SIGHT_STABILITY_DRY",
      "INCONSISTENT_TRIGGER_PRESS",
      "Mouvement variable",
    )).toBe("supports_hypothesis");
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

  it("rejette une observation étrangère au protocole", () => {
    expect(() => outcomeForTestObservation(
      "TEST_SIGHT_STABILITY_DRY",
      "ABRUPT_TRIGGER_PRESS",
      "Cela renforce l’hypothèse",
    )).toThrow("Observation non prévue");
  });
});
