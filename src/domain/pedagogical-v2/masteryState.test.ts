import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type MasteryLevel,
  type PedagogicalEvidence,
  type PedagogicalVariables,
} from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
} from "./decisionContracts";
import { pedagogicalDecisionSchema } from "./decisionSchemas";
import { PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION } from "./inputContracts";
import {
  type MasteryEvent,
  PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
  type MasteryStateTarget,
} from "./masteryContracts";
import {
  currentMasteryStateSchema,
  masteryEventSchema,
  masteryTransitionResultSchema,
} from "./masterySchemas";
import {
  applyMasteryEvent,
  createNotEvaluatedMasteryState,
  deriveCurrentMasteryState,
  validateMasteryTransition,
} from "./masteryState";

const competenceSnapshot = (id = "fixture.competence"): PedagogicalReferenceSnapshot => ({
  referenceType: "competence",
  origin: "catalog_item",
  id,
  code: "TEST_FIXTURE_COMPETENCE",
  displayName: "Compétence synthétique TEST/FIXTURE",
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
});

const contextSnapshot: PedagogicalReferenceSnapshot = {
  referenceType: "pedagogical_context",
  origin: "catalog_item",
  id: "fixture.context",
  code: "TEST_FIXTURE_CONTEXT",
  displayName: "Contexte synthétique TEST/FIXTURE",
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
};

const entitySnapshot = (
  referenceType: "pedagogical_decision" | "evaluation",
): PedagogicalReferenceSnapshot => ({
  referenceType,
  origin: "versioned_entity",
  id: `fixture.${referenceType}`,
  code: null,
  displayName: `TEST/FIXTURE ${referenceType}`,
  itemVersion: null,
  catalogVersion: null,
  schemaVersion: referenceType === "pedagogical_decision"
    ? PEDAGOGICAL_DECISION_SCHEMA_VERSION : PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
});

const variables: PedagogicalVariables = {
  distance: null,
  numberOfHands: 2,
  time: null,
  cadence: "TEST_FIXTURE_CADENCE",
  zoneSize: null,
  targetType: null,
  sightSystem: null,
  shotCount: 3,
  movement: null,
  attentionalLoad: null,
  complexity: null,
  supervision: "TEST_FIXTURE_SUPERVISION",
};

const effectiveVariables = {
  snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  values: variables,
} as const;

const evidence: PedagogicalEvidence = {
  id: "fixture.mastery-evidence",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "test-fixture-catalog-v1",
  subjectType: "TEST_FIXTURE_SUBJECT",
  subjectId: "fixture.subject",
  sourceType: "TEST_FIXTURE_SOURCE",
  sourceReferenceId: "fixture.source",
  value: { fixtureInformation: true },
  effect: "neutral",
  strength: 0.5,
  reliability: 0.5,
};

const target: MasteryStateTarget = {
  shooterId: "fixture.shooter",
  competenceSnapshot: competenceSnapshot(),
};

function event(
  id: string,
  expectedPreviousLevel: MasteryLevel,
  resultingLevel: MasteryLevel,
  minute: number,
  overrides: Partial<MasteryEvent> = {},
): MasteryEvent {
  return {
    id,
    schemaVersion: PEDAGOGICAL_MASTERY_SCHEMA_VERSION,
    recordVersion: "1.0.0-test",
    shooterId: target.shooterId,
    competenceSnapshot: target.competenceSnapshot,
    expectedPreviousLevel,
    resultingLevel,
    eventType: "TEST_FIXTURE_EVENT",
    sourceType: "TEST_FIXTURE_SOURCE",
    pedagogicalDecisionSnapshot: null,
    competenceEvaluationSnapshot: null,
    evidenceSnapshots: [],
    contextSnapshot: null,
    effectiveVariablesSnapshot: null,
    humanValidation: null,
    rationale: "Rationale synthétique TEST/FIXTURE.",
    occurredAt: `2026-01-01T00:${String(minute).padStart(2, "0")}:00.000Z`,
    transitionRuleVersion: "test-fixture-transition-rules-v1",
    ...overrides,
  };
}

const validSequence = [
  event("fixture.event-1", "not_evaluated", "discovery", 1),
  event("fixture.event-2", "discovery", "acquisition", 2),
  event("fixture.event-3", "acquisition", "stabilization", 3),
  event("fixture.event-4", "stabilization", "transfer", 4),
  event("fixture.event-5", "transfer", "robustness", 5),
] as const;

describe("historique pur de maîtrise v2", () => {
  it("dérive not_evaluated sans inventer d'événement lorsque l'historique est vide", () => {
    const state = deriveCurrentMasteryState(target, []);
    expect(state.currentLevel).toBe("not_evaluated");
    expect(state.lastAppliedEventId).toBeNull();
    expect(state.appliedEventCount).toBe(0);
    expect(currentMasteryStateSchema.safeParse(state).success).toBe(true);
  });

  it("dérive toute la séquence structurelle jusqu'à robustness", () => {
    const state = deriveCurrentMasteryState(target, validSequence);
    expect(state.currentLevel).toBe("robustness");
    expect(state.lastAppliedEventId).toBe("fixture.event-5");
    expect(state.appliedEventCount).toBe(5);
    expect(state.anomalies).toEqual([]);
  });

  it("refuse explicitement acquisition vers transfer", () => {
    const transition = validateMasteryTransition("acquisition", "transfer");
    expect(transition).toEqual(expect.objectContaining({
      accepted: false, kind: "rejected", reasonCode: "ACQUISITION_TO_TRANSFER_FORBIDDEN",
    }));
    expect(masteryTransitionResultSchema.safeParse(transition).success).toBe(true);
  });

  it("refuse toute progression sautant un niveau intermédiaire", () => {
    expect(validateMasteryTransition("discovery", "transfer")).toEqual(expect.objectContaining({
      accepted: false, reasonCode: "SKIPPED_PROGRESSION_LEVEL",
    }));
  });

  it("autorise le maintien explicite au même niveau", () => {
    const transition = validateMasteryTransition("acquisition", "acquisition");
    expect(transition).toEqual(expect.objectContaining({ accepted: true, kind: "maintain" }));
    const initial = deriveCurrentMasteryState(target, validSequence.slice(0, 2));
    const result = applyMasteryEvent(initial, event("fixture.maintain", "acquisition", "acquisition", 3));
    expect(result.applied).toBe(true);
    expect(result.state.currentLevel).toBe("acquisition");
    expect(result.state.lastChangedAt).toBe("2026-01-01T00:02:00.000Z");
  });

  it("autorise une régression contrôlée lorsqu'elle est explicitement motivée", () => {
    const initial = deriveCurrentMasteryState(target, validSequence.slice(0, 4));
    const regression = event("fixture.regression", "transfer", "acquisition", 5, {
      rationale: "Régression synthétique explicitement motivée.",
    });
    const result = applyMasteryEvent(initial, regression);
    expect(result.applied).toBe(true);
    expect(result.transition.kind).toBe("regression");
    expect(result.state.currentLevel).toBe("acquisition");
  });

  it("refuse une régression sans rationale explicite même sans passage préalable par le schéma", () => {
    const initial = deriveCurrentMasteryState(target, validSequence.slice(0, 2));
    const result = applyMasteryEvent(initial, event("fixture.regression-empty", "acquisition", "discovery", 3, {
      rationale: "",
    }));
    expect(result.applied).toBe(false);
    expect(result.transition.reasonCode).toBe("REGRESSION_RATIONALE_REQUIRED");
  });

  it("refuse un historique mal ordonné sans le trier silencieusement", () => {
    const state = deriveCurrentMasteryState(target, [validSequence[1], validSequence[0]]);
    expect(state.currentLevel).toBe("not_evaluated");
    expect(state.anomalies[0]).toEqual(expect.objectContaining({ code: "PREVIOUS_LEVEL_MISMATCH" }));
  });

  it("signale précisément un événement chronologiquement antérieur après un préfixe valide", () => {
    const state = deriveCurrentMasteryState(target, [
      validSequence[0],
      event("fixture.out-of-order", "discovery", "acquisition", 0),
    ]);
    expect(state.currentLevel).toBe("discovery");
    expect(state.anomalies[0]).toEqual(expect.objectContaining({ code: "OUT_OF_ORDER_EVENT" }));
  });

  it("ignore les événements d'une autre compétence", () => {
    const unrelated = event("fixture.other-competence", "not_evaluated", "discovery", 1, {
      competenceSnapshot: competenceSnapshot("fixture.other-competence"),
    });
    const state = deriveCurrentMasteryState(target, [unrelated, validSequence[0]]);
    expect(state.currentLevel).toBe("discovery");
    expect(state.appliedEventCount).toBe(1);
  });

  it("ignore les événements d'un autre tireur", () => {
    const unrelated = event("fixture.other-shooter", "not_evaluated", "discovery", 1, {
      shooterId: "fixture.other-shooter",
    });
    const state = deriveCurrentMasteryState(target, [unrelated]);
    expect(state.currentLevel).toBe("not_evaluated");
    expect(state.appliedEventCount).toBe(0);
  });

  it("refuse un niveau précédent incohérent avec l'état dérivé", () => {
    const state = deriveCurrentMasteryState(target, [
      validSequence[0],
      event("fixture.previous-mismatch", "not_evaluated", "acquisition", 2),
    ]);
    expect(state.currentLevel).toBe("discovery");
    expect(state.anomalies[0]).toEqual(expect.objectContaining({ code: "PREVIOUS_LEVEL_MISMATCH" }));
  });

  it("signale un identifiant d'événement dupliqué", () => {
    const duplicate = { ...validSequence[1], id: validSequence[0].id };
    const state = deriveCurrentMasteryState(target, [validSequence[0], duplicate]);
    expect(state.currentLevel).toBe("discovery");
    expect(state.anomalies[0]).toEqual(expect.objectContaining({ code: "DUPLICATE_EVENT_ID" }));
  });

  it("reste append-only et ne modifie ni le tableau ni les événements d'origine", () => {
    const events = validSequence.slice(0, 2);
    const before = JSON.stringify(events);
    const first = events[0];
    deriveCurrentMasteryState(target, events);
    expect(JSON.stringify(events)).toBe(before);
    expect(events[0]).toBe(first);
  });

  it("conserve les snapshots de contexte et variables sans changer l'identité de la compétence", () => {
    const enriched = event("fixture.contextual", "not_evaluated", "discovery", 1, {
      contextSnapshot,
      effectiveVariablesSnapshot: effectiveVariables,
    });
    const state = deriveCurrentMasteryState(target, [enriched]);
    expect(state.competenceSnapshot.id).toBe(target.competenceSnapshot.id);
    expect(state.lastContextSnapshot).toBe(contextSnapshot);
    expect(state.lastEffectiveVariablesSnapshot?.values).toBe(variables);
  });

  it("valide un événement historisé avec décision, évaluation, evidence et validation humaine facultatives", () => {
    const enriched = event("fixture.enriched", "not_evaluated", "discovery", 1, {
      pedagogicalDecisionSnapshot: entitySnapshot("pedagogical_decision"),
      competenceEvaluationSnapshot: entitySnapshot("evaluation"),
      evidenceSnapshots: [evidence],
      contextSnapshot,
      effectiveVariablesSnapshot: effectiveVariables,
      humanValidation: {
        validatorId: "fixture.validator",
        validatorRole: "TEST_FIXTURE_ROLE",
        validatedAt: "2026-01-01T00:01:30.000Z",
        rationale: "Validation humaine synthétique.",
      },
    });
    expect(masteryEventSchema.parse(enriched)).toBe(enriched);
  });

  it("autorise un événement initial sans décision ni évaluation préalable", () => {
    expect(masteryEventSchema.safeParse(validSequence[0]).success).toBe(true);
  });

  it("permet à une décision d'exister sans MasteryEvent", () => {
    const decision: PedagogicalDecision = {
      id: "fixture.decision-without-mastery-event",
      schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
      createdAt: "2026-01-01T00:00:00.000Z",
      sourceSnapshots: [],
      observationSnapshots: [],
      hypothesisSnapshots: [],
      evidenceSnapshots: [],
      uncertainty: 1,
      knownLimitations: ["Information synthétique insuffisante"],
      diagnosticTestSnapshot: null,
      diagnosticTestResultSnapshot: null,
      targetCompetenceSnapshot: null,
      pedagogicalTechniqueSnapshot: null,
      exerciseSnapshot: null,
      effectiveVariablesSnapshot: null,
      evaluationSnapshot: null,
      decisionType: "INSUFFICIENT_INFORMATION",
      rationale: "Décision synthétique sans événement de maîtrise.",
      ruleVersions: { fixtureRule: "fixture-rule-v1" },
    };
    expect(pedagogicalDecisionSchema.safeParse(decision).success).toBe(true);
    expect(deriveCurrentMasteryState(target, []).lastAppliedEventId).toBeNull();
  });

  it("référence une décision par snapshot sans dépendre du moteur v1", () => {
    const masteryEvent = event("fixture.decision-reference", "not_evaluated", "discovery", 1, {
      pedagogicalDecisionSnapshot: entitySnapshot("pedagogical_decision"),
    });
    expect(masteryEvent.pedagogicalDecisionSnapshot?.schemaVersion).toBe(PEDAGOGICAL_DECISION_SCHEMA_VERSION);
    expect(masteryEventSchema.safeParse(masteryEvent).success).toBe(true);
  });

  it("ne contient aucun contenu pédagogique réel ni règle L1+", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ["masteryContracts.ts", "masterySchemas.ts", "masteryState.ts"]
      .map((file) => readFileSync(resolve(directory, file), "utf8")).join("\n");
    expect(sources).not.toMatch(/\bD[1-6]\b|\bD4\b|\bC9\b|\b[A-J][1-9]\b/);
    expect(sources).not.toMatch(/L1\+|oneNewVariable|newVariableCount/);
  });
});
