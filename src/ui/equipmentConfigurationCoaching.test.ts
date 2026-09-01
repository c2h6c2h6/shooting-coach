import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "../domain/confirmationTestCatalog";
import { trainingDrillCatalog } from "../domain/trainingDrillCatalog";
import { presentConfirmationTest, presentDrill, presentOutcome } from "./coachingPresentation";

const configurationTest = confirmationTestCatalog.find(
  (item) => item.code === "TEST_EQUIPMENT_CONTEXT_CHECK",
)!;
const controlDrill = trainingDrillCatalog.find((item) => item.code === "DRILL_EQUIPMENT_CONTROL")!;

describe("hotfix protocole — vérification de configuration", () => {
  it("ne recycle plus le protocole générique de cinq départs à sec", () => {
    expect(configurationTest.instructions.join(" ")).not.toMatch(/préparer la zone à sec|cinq départs|départs à sec/i);
    expect(configurationTest.requiresDryFire).toBe(false);
    expect(configurationTest.minimumDuration).toBe(.5);
    expect(configurationTest.maximumDuration).toBe(1);
  });

  it("ne redemande pas les données de séance déjà connues", () => {
    const instructions = presentConfirmationTest(configurationTest).instructions.join(" ");
    expect(instructions).toContain("point prévu");
    expect(instructions).toContain("organes de visée");
    expect(instructions).toContain("changé d’arme, de réglage ou de configuration depuis la série");
    expect(instructions).not.toMatch(/distance|type de cible|arme sélectionnée/i);
  });

  it("prévoit une vérification qualifiée sans réglage automatique", () => {
    const instructions = presentConfirmationTest(configurationTest).instructions.join(" ");
    expect(configurationTest.observationCriteria).toContain("Je préfère faire vérifier l’arme ou les organes de visée");
    expect(instructions).not.toMatch(/déplacez|réglez|corrigez la hausse|corrigez le guidon/i);
  });

  it("présente des observations propres à la configuration", () => {
    expect(configurationTest.observationCriteria).toEqual([
      "Tout correspond à ce que j’ai réellement fait",
      "Les informations de la séance ne correspondent pas à la réalité",
      "Je ne visais pas le point prévu",
      "J’ai un doute sur le réglage ou le matériel",
      "Je préfère faire vérifier l’arme ou les organes de visée",
      "Je ne peux pas conclure",
    ]);
  });

  it("restitue prudemment une configuration cohérente", () => {
    expect(presentOutcome("does_not_support_hypothesis", configurationTest.code)).toBe(
      "Aucun écart évident de configuration n’a été identifié. La piste matérielle est moins soutenue et une cause technique peut être examinée davantage.",
    );
  });

  it("restitue un écart identifié sans le transformer en cause certaine", () => {
    const text = presentOutcome("supports_hypothesis", configurationTest.code);
    expect(text).toBe("Un écart de configuration a été identifié. Il peut contribuer au décalage observé.");
    expect(text).not.toMatch(/cause confirmée|matériel défectueux|arme mal réglée/i);
  });

  it("oriente un doute matériel vers une vérification qualifiée sans réglage automatique", () => {
    const text = presentOutcome("inconclusive", configurationTest.code);
    expect(text).toBe("Le résultat ne permet pas de conclure sans vérification qualifiée du matériel ou du réglage.");
    expect(text).not.toMatch(/déplacez|réglez|modifiez/i);
  });

  it("présente une série de contrôle visant seulement la persistance du décalage", () => {
    const presentation = presentDrill(controlDrill);
    expect(controlDrill.title).toBe("Série de contrôle après vérification");
    expect(presentation.objective).toBe("Vérifier si le décalage se reproduit après avoir confirmé la configuration.");
    expect(presentation.instructions).toEqual([
      "Sans modifier volontairement votre technique, réalisez une nouvelle série de 5 coups dans les mêmes conditions après la vérification de configuration.",
    ]);
    expect(presentation.successCriterion).toBe("Le résultat permet de voir si le décalage persiste ou non.");
    expect(JSON.stringify(presentation)).not.toContain("Rapprocher durablement");
  });
});
