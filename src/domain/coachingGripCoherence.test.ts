import { describe, expect, it } from "vitest";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import { selectConfirmationTest } from "./confirmationTestEngine";
import { proposeCoaching } from "./coachingCycleEngine";
import type { SafetyContext } from "./coachingTypes";
import { safetyBlockers } from "./coachingSafetyRules";
import type { TechnicalHypothesis } from "./technicalHypothesis";
import { presentConfirmationTest, presentDrill } from "../ui/coachingPresentation";

const safety: SafetyContext = {
  inAuthorizedRange: true,
  rangeRulesAccepted: true,
  safeDirectionAvailable: true,
  weaponUnloadedVerified: true,
  magazineRemoved: true,
  chamberVisualPhysicalCheck: true,
  liveAmmunitionRemovedFromArea: true,
  eyeAndEarProtection: true,
  dummyRoundsAllowed: false,
  dummyRoundProcedureKnown: false,
  instructorPresent: false,
  canDryFire: true,
  canLiveFire: true,
};

const hypothesis: TechnicalHypothesis = {
  id: "hypothesis-grip-variable",
  sessionId: "session-1",
  seriesId: "series-reference",
  comparisonId: null,
  observationId: "observation-variable-execution",
  hypothesisCode: "INCONSISTENT_GRIP_PRESSURE",
  category: "grip",
  status: "requires_confirmation",
  plausibilityLevel: "medium",
  confidenceLevel: "low",
  rank: 1,
  internalScore: 4,
  supportingEvidence: [{
    code: "VARIABLE_CAUSE_COMPATIBILITY",
    labelFr: "La dispersion observée reste compatible avec une exécution variable.",
    source: "observation",
  }],
  contradictingEvidence: [],
  missingEvidence: [],
  applicableContext: { numberOfHands: 2 },
  sourceRules: ["TEST/FIXTURE"],
  rulesetVersion: "technical-hypothesis-rules-v1",
  generatedAt: "2026-08-26T00:00:00.000Z",
};

describe("cohérence test / exercice pour une prise variable", () => {
  it("vérifie la variation puis travaille directement la constance de prise", () => {
    const selection = selectConfirmationTest({
      hypothesis,
      alternatives: [],
      sessionMode: "coaching_free",
      safety,
      userCanPerform: true,
      contextKnown: true,
      numberOfHands: 2,
    });
    expect(selection.primary?.code).toBe("TEST_GRIP_CONSTANCY");
    expect(selection.primary?.title).toBe("Constance de prise");
    expect(presentConfirmationTest(selection.primary!)).toEqual({
      why: "Vérifier si la prise change entre les répétitions.",
      instructions: [
        "Prenez l’arme normalement.",
        "Effectuez plusieurs répétitions sans chercher à corriger volontairement la prise.",
        "Observez uniquement si la sensation ou le placement de la prise change d’une répétition à l’autre.",
      ],
      observationQuestion: "La prise reste-t-elle réellement constante entre les répétitions ?",
    });

    const outcome = outcomeForTestObservation(
      "TEST_GRIP_CONSTANCY",
      hypothesis.hypothesisCode,
      "Pression variable",
    );
    expect(outcome).toBe("supports_hypothesis");

    const proposal = proposeCoaching({
      hypothesis,
      testRunId: "test-run-1",
      outcome,
      sessionId: hypothesis.sessionId,
      level: "beginner",
      numberOfHands: 2,
      safety,
      now: "2026-08-26T00:01:00.000Z",
    });
    expect(proposal?.drill.code).toBe("DRILL_CONSTANT_GRIP");
    expect(proposal?.drill.title).not.toBe("Maintien après le départ");
    expect(proposal?.drill.numberOfShots).toBe(5);
    expect(proposal?.drill.requiresLiveFire).toBe(true);
    expect(presentDrill(proposal!.drill)).toEqual({
      title: "Reproduire la même prise",
      objective: "Retrouver une pression et un placement de prise comparables d’une répétition à l’autre.",
      instructions: [
        "Prenez l’arme avec votre prise habituelle.",
        "Réalisez une série de 5 coups en cherchant à retrouver, avant chaque départ, un placement et une sensation de pression comparables, sans augmenter progressivement la force.",
      ],
      successCriterion: "Réussite : la prise est ressentie comparable sur au moins 4 répétitions sur 5.",
    });
  });

  it("une prise constante ne déclenche aucun exercice correctif", () => {
    const outcome = outcomeForTestObservation(
      "TEST_GRIP_CONSTANCY",
      hypothesis.hypothesisCode,
      "Prise ressentie constante",
    );
    expect(outcome).toBe("does_not_support_hypothesis");
    expect(proposeCoaching({
      hypothesis,
      testRunId: "test-run-2",
      outcome,
      sessionId: hypothesis.sessionId,
      level: "beginner",
      numberOfHands: 2,
      safety,
    })).toBeNull();
  });

  it("le test et le drill existants restent deux objets distincts", () => {
    expect(confirmationTestCatalog.find(item => item.code === "TEST_GRIP_CONSTANCY"))
      .not.toHaveProperty("successCriteria");
  });

  it.each([1, 2] as const)("reste applicable à %i main(s) sans dupliquer le drill", numberOfHands => {
    expect(proposeCoaching({
      hypothesis: { ...hypothesis, applicableContext: { numberOfHands } },
      testRunId: `test-run-${numberOfHands}`,
      outcome: "supports_hypothesis",
      sessionId: hypothesis.sessionId,
      level: "beginner",
      numberOfHands,
      safety,
    })?.drill.code).toBe("DRILL_CONSTANT_GRIP");
  });

  it("conserve une vraie série de contrôle de cinq coups", () => {
    const drill = proposeCoaching({
      hypothesis,
      testRunId: "test-run-control",
      outcome: "supports_hypothesis",
      sessionId: hypothesis.sessionId,
      level: "beginner",
      numberOfHands: 2,
      safety,
    })!.drill;
    expect(drill).toMatchObject({numberOfShots: 5, requiresLiveFire: true, requiresDryFire: false});
    expect(drill.executionSteps).toEqual(["Reproduire la même prise à chaque coup."]);
  });

  it("ne propose plus de chaîne corrective à une manifestation comparative réservée", () => {
    expect(proposeCoaching({
      hypothesis:{...hypothesis,hypothesisCode:"GRIP_CHANGES_BETWEEN_SHOTS"},
      testRunId:"test-run-grip-placement",outcome:"supports_hypothesis",sessionId:hypothesis.sessionId,
      level:"beginner",numberOfHands:2,safety,
    })).toBeNull();
  });

  it("ne change pas le parcours Action brusque sur la détente", () => {
    expect(proposeCoaching({
      hypothesis: {...hypothesis,hypothesisCode:"ABRUPT_TRIGGER_PRESS",category:"trigger"},
      testRunId:"test-run-trigger",outcome:"supports_hypothesis",sessionId:hypothesis.sessionId,
      level:"beginner",numberOfHands:2,safety,
    })?.drill.code).toBe("DRILL_DRY_CONTROLLED_RELEASES");
  });

  it("ne change pas le parcours Vérification de configuration", () => {
    expect(proposeCoaching({
      hypothesis:{...hypothesis,hypothesisCode:"EQUIPMENT_OR_SIGHT_ISSUE",category:"context_equipment"},
      testRunId:"test-run-config",outcome:"supports_hypothesis",sessionId:hypothesis.sessionId,
      level:"beginner",numberOfHands:2,safety:{...safety,instructorPresent:true},
    })?.drill.code).toBe("DRILL_EQUIPMENT_CONTROL");
  });

  it("ne modifie pas les blockers de sécurité du test à sec", () => {
    const dryTest=confirmationTestCatalog.find(item=>item.code==="TEST_GRIP_CONSTANCY")!;
    expect(safetyBlockers(dryTest,{...safety,chamberVisualPhysicalCheck:false}))
      .toContain("Prérequis complets du travail à sec non confirmés.");
  });
});
