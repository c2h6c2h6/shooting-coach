import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  pedagogicalDecisionTypes,
  type PedagogicalEvidence,
  type PedagogicalVariables,
} from "./contracts";
import {
  EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  type PedagogicalDecision,
  type PedagogicalReferenceSnapshot,
} from "./decisionContracts";
import {
  effectivePedagogicalVariablesSnapshotSchema,
  pedagogicalDecisionSchema,
  pedagogicalReferenceSnapshotSchema,
} from "./decisionSchemas";

const variables: PedagogicalVariables = {
  distance: { value: 7, unit: "fixture-unit" },
  numberOfHands: 2,
  time: null,
  cadence: "fixture-cadence",
  zoneSize: null,
  targetType: "fixture-target",
  sightSystem: null,
  shotCount: 5,
  movement: null,
  attentionalLoad: null,
  complexity: null,
  supervision: "fixture-supervision",
};

const catalogSnapshot = (
  referenceType: "competence" | "pedagogical_technique" | "exercise",
): PedagogicalReferenceSnapshot => ({
  referenceType,
  origin: "catalog_item",
  id: `fixture.${referenceType}`,
  code: `FIXTURE_${referenceType.toUpperCase()}`,
  displayName: `Fixture ${referenceType}`,
  itemVersion: "1.0.0-test",
  catalogVersion: "fixture-catalog-v1",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
});

const entitySnapshot = (
  referenceType: "source" | "observation" | "hypothesis" | "diagnostic_test" | "diagnostic_test_result" | "evaluation",
): PedagogicalReferenceSnapshot => ({
  referenceType,
  origin: "versioned_entity",
  id: `fixture.${referenceType}`,
  code: null,
  displayName: `Fixture ${referenceType}`,
  itemVersion: null,
  catalogVersion: null,
  schemaVersion: "fixture-entity-schema-v1",
});

const evidence: PedagogicalEvidence = {
  id: "fixture.evidence",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "1.0.0-test",
  catalogVersion: "fixture-catalog-v1",
  subjectType: "fixture-subject",
  subjectId: "fixture.subject",
  sourceType: "fixture-source",
  sourceReferenceId: "fixture.source",
  value: { fixtureValue: true },
  effect: "neutral",
  strength: 0.5,
  reliability: 0.5,
};

const effectiveVariables = {
  snapshotSchemaVersion: EFFECTIVE_PEDAGOGICAL_VARIABLES_SNAPSHOT_SCHEMA_VERSION,
  variablesSchemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  values: variables,
} as const;

const decision: PedagogicalDecision = {
  id: "fixture.decision",
  schemaVersion: PEDAGOGICAL_DECISION_SCHEMA_VERSION,
  createdAt: "2026-01-01T00:00:00.000Z",
  sourceSnapshots: [entitySnapshot("source")],
  observationSnapshots: [entitySnapshot("observation")],
  hypothesisSnapshots: [entitySnapshot("hypothesis")],
  evidenceSnapshots: [evidence],
  uncertainty: 0.5,
  knownLimitations: ["Limite synthétique de fixture"],
  diagnosticTestSnapshot: entitySnapshot("diagnostic_test"),
  diagnosticTestResultSnapshot: entitySnapshot("diagnostic_test_result"),
  targetCompetenceSnapshot: catalogSnapshot("competence"),
  pedagogicalTechniqueSnapshot: catalogSnapshot("pedagogical_technique"),
  exerciseSnapshot: catalogSnapshot("exercise"),
  effectiveVariablesSnapshot: effectiveVariables,
  evaluationSnapshot: entitySnapshot("evaluation"),
  decisionType: "MAINTAIN",
  rationale: "Rationale synthétique sans contenu pédagogique réel.",
  ruleVersions: { fixtureRule: "fixture-rule-v1" },
};

describe("snapshots et décision pédagogique v2", () => {
  it("valide une décision complète uniquement à partir de snapshots", () => {
    expect(pedagogicalDecisionSchema.parse(decision)).toBe(decision);
  });

  it("refuse un snapshot incomplet", () => {
    const { displayName: _displayName, ...incomplete } = catalogSnapshot("competence");
    const result = pedagogicalReferenceSnapshotSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.some((entry) => entry.path === "displayName")).toBe(true);
  });

  it("exige les versions individuelles et de catalogue pour un élément de catalogue", () => {
    const result = pedagogicalReferenceSnapshotSchema.safeParse({
      ...catalogSnapshot("exercise"), itemVersion: null, catalogVersion: null,
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues.map((entry) => entry.path)).toEqual(
      expect.arrayContaining(["itemVersion", "catalogVersion"]),
    );
  });

  it("autorise une entité versionnée hors catalogue sans inventer de versions de catalogue", () => {
    expect(pedagogicalReferenceSnapshotSchema.parse(entitySnapshot("observation"))).toEqual(
      expect.objectContaining({ itemVersion: null, catalogVersion: null, schemaVersion: "fixture-entity-schema-v1" }),
    );
  });

  it("conserve les paramètres effectifs et le vocabulaire numberOfHands", () => {
    const parsed = effectivePedagogicalVariablesSnapshotSchema.parse(effectiveVariables);
    expect(parsed.values).toBe(variables);
    expect(parsed.values.numberOfHands).toBe(2);
    expect(parsed.values.shotCount).toBe(5);
  });

  it("réutilise exactement les sept types de décision déjà validés", () => {
    expect(pedagogicalDecisionTypes).toEqual([
      "PROGRESS", "MAINTAIN", "SIMPLIFY", "RETURN_TO_PREREQUISITE", "TEST_ANOTHER_HYPOTHESIS",
      "INSUFFICIENT_INFORMATION", "STOP",
    ]);
  });

  it("conserve les evidence sans transformation", () => {
    const parsed = pedagogicalDecisionSchema.parse(decision);
    expect(parsed.evidenceSnapshots[0]).toBe(evidence);
    expect(parsed.evidenceSnapshots[0].value).toBe(evidence.value);
  });

  it("refuse toute projection éditoriale ajoutée comme entrée métier", () => {
    const editorialProjectionKey = ["recomm", "endationSnapshot"].join("");
    const result = pedagogicalDecisionSchema.safeParse({ ...decision, [editorialProjectionKey]: entitySnapshot("source") });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.issues).toContainEqual({ path: editorialProjectionKey, message: "champ inconnu" });
  });

  it("sépare l'identité de l'exercice de ses variables effectives tout en exigeant leur snapshot conjoint", () => {
    expect(decision.exerciseSnapshot).not.toHaveProperty("values");
    expect(decision.effectiveVariablesSnapshot?.values).toBe(variables);
    expect(pedagogicalDecisionSchema.safeParse({ ...decision, effectiveVariablesSnapshot: null }).success).toBe(false);
    expect(pedagogicalDecisionSchema.safeParse({ ...decision, exerciseSnapshot: null }).success).toBe(false);
  });

  it.each(["INSUFFICIENT_INFORMATION", "STOP"] as const)(
    "autorise %s sans compétence, technique ni exercice",
    (decisionType) => {
      const result = pedagogicalDecisionSchema.safeParse({
        ...decision,
        decisionType,
        diagnosticTestSnapshot: null,
        diagnosticTestResultSnapshot: null,
        targetCompetenceSnapshot: null,
        pedagogicalTechniqueSnapshot: null,
        exerciseSnapshot: null,
        effectiveVariablesSnapshot: null,
        evaluationSnapshot: null,
      });
      expect(result.success).toBe(true);
    },
  );

  it("refuse un résultat de test sans snapshot du test correspondant", () => {
    expect(pedagogicalDecisionSchema.safeParse({ ...decision, diagnosticTestSnapshot: null }).success).toBe(false);
  });

  it("ne contient aucun contenu pédagogique réel ni pilote encodé", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ["decisionContracts.ts", "decisionSchemas.ts"]
      .map((file) => readFileSync(resolve(directory, file), "utf8")).join("\n");
    expect(sources).not.toMatch(/\bD4\b|\bC9\b|\b[A-J][1-9]\b/);
    expect(sources).not.toMatch(/catalogVersion:\s*["'][^"']+["']/);
  });
});
