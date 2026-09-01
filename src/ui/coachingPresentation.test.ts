import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "../domain/confirmationTestCatalog";
import { technicalHypothesisCatalog } from "../domain/technicalHypothesisCatalog";
import { trainingDrillCatalog } from "../domain/trainingDrillCatalog";
import {
  presentCoachingOutcome,
  presentConfirmationTest,
  presentDrill,
  presentHypothesis,
  presentOutcome,
  presentTechnicalControlTitle,
} from "./coachingPresentation";
import { e1AnticipationTechnicalControl } from "../domain/pedagogical-v2/e1AnticipationPedagogicalChain";
import { sightAlignmentTechnicalControl } from "../domain/pedagogical-v2/sightAlignmentPedagogicalChain";
import { wristOrganizationTechnicalControl } from "../domain/pedagogical-v2/wristStabilityPedagogicalChain";
import { d2TriggerHandTechnicalControl } from "../domain/technicalObservationControl";

const test = confirmationTestCatalog.find((item) => item.code === "TEST_SIGHT_STABILITY_DRY")!;
const drill = trainingDrillCatalog.find((item) => item.code === "DRILL_DRY_CONTROLLED_RELEASES")!;

describe("hotfix UX — présentation du coaching", () => {
  it("traduit l’hypothèse sans modifier son identifiant interne", () => {
    expect(presentHypothesis("ABRUPT_TRIGGER_PRESS")).toEqual({
      title: "Action brusque sur la détente",
      explanation: "Une action trop brusque sur la détente peut provoquer un déplacement de l’arme au moment du départ.",
    });
    expect(technicalHypothesisCatalog.ABRUPT_TRIGGER_PRESS.code).toBe("ABRUPT_TRIGGER_PRESS");
  });

  it("présente le test métier existant et explique sa finalité", () => {
    expect(test.title).toBe("Stabilité du guidon à sec");
    expect(presentConfirmationTest(test).why).toBe(
      "Ce test permet de vérifier si l’action sur la détente provoque un mouvement visible de l’arme au moment du départ.",
    );
  });

  it("donne une procédure lisible et la question à observer", () => {
    const presentation = presentConfirmationTest(test);
    expect(presentation.instructions).toEqual([
      "Préparez l’arme pour un travail à sec dans les conditions de sécurité prévues.",
      "Prenez votre visée normalement.",
      "Effectuez 5 départs à sec, sans chercher la vitesse.",
      "Observez uniquement le guidon au moment du départ.",
    ]);
    expect(presentation.observationQuestion).toBe(
      "Le guidon reste-t-il stable ou se déplace-t-il au moment du départ ?",
    );
  });

  it("humanise le résultat renforcé sans produire de certitude", () => {
    expect(presentOutcome("supports_hypothesis")).toContain("peut provoquer un déplacement de l’arme");
    expect(presentOutcome("supports_hypothesis")).toContain("sans être confirmée définitivement");
  });

  it("traduit l’objectif interne du travail", () => {
    expect(drill.objective).toBe("horizontal_stability");
    expect(presentDrill(drill).objective).toBe(
      "Déclencher sans provoquer de déplacement visible des organes de visée.",
    );
  });

  it("présente l’exercice et son critère de réussite en langage utilisateur", () => {
    expect(presentDrill(drill).instructions).toEqual([
      "Effectuez 5 départs à sec en maintenant une action progressive et continue sur la détente.",
      "Cherchez à garder le guidon stable jusqu’au départ.",
    ]);
    expect(presentDrill(drill).successCriterion).toBe(
      "Réussite : le guidon reste stable pendant au moins 4 départs sur 5.",
    );
  });

  it("n’expose plus les vocabulaires internes dans l’écran", () => {
    const screen = readFileSync(
      resolve(process.cwd(), "app/sessions/[id]/series/[seriesId]/coaching.tsx"),
      "utf8",
    );
    expect(screen).not.toContain("abrupt trigger press");
    expect(screen).not.toContain("Objectif : {d.objective}");
    expect(screen).not.toContain("horizontal_stability");
  });

  it("conserve les identifiants et catalogues métier intacts", () => {
    expect(test.code).toBe("TEST_SIGHT_STABILITY_DRY");
    expect(drill.code).toBe("DRILL_DRY_CONTROLLED_RELEASES");
    expect(drill.objective).toBe("horizontal_stability");
  });

  it("projette le libellé du contrôle technique associé", () => {
    expect(presentTechnicalControlTitle(d2TriggerHandTechnicalControl)).toBe("Index indépendant");
    expect(presentTechnicalControlTitle(wristOrganizationTechnicalControl)).toBe("Reproduire l’organisation du poignet");
    expect(presentTechnicalControlTitle(sightAlignmentTechnicalControl)).toBe("Reconstruire le même alignement");
    expect(presentTechnicalControlTitle(e1AnticipationTechnicalControl)).toBe("Laisser partir sans anticiper");
  });

  it("utilise un fallback neutre si l’ancien cycle n’a pas de libellé", () => {
    expect(presentTechnicalControlTitle({ exerciseName: "", competenceName: "" })).toBe("Observation technique");
    expect(presentTechnicalControlTitle(undefined)).toBe("Observation technique");
  });

  it("ne déduit jamais un titre D2 du seul mode technique", () => {
    const screen = readFileSync(resolve(process.cwd(), "app/sessions/[id]/series/[seriesId]/coaching.tsx"), "utf8");
    expect(screen).not.toContain('<Text style={styles.section}>Index indépendant</Text>');
    expect(screen).toContain("presentTechnicalControlTitle(technicalControl)");
  });
  it("offre un résultat court pour l’écran de décision", () => {
    expect(presentCoachingOutcome("does_not_support_hypothesis")).toBe("Cette piste est peu probable.");
  });

  it("garde le détail du test hors du flux principal", () => {
    const screen = readFileSync(resolve(process.cwd(), "app/sessions/[id]/series/[seriesId]/coaching.tsx"), "utf8");
    expect(screen).toContain("À faire");
    expect(screen).toContain("instructions.slice(0,3)");
    expect(screen).toContain("Pourquoi ce test ?");
    expect(screen).toContain("presentCoachingOutcome");
  });
});
