import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateCoachingOutcome } from "./coachingOutcomeEvaluator";
import { firstStructurallyTestableHypothesis } from "./confirmationTestEngine";
import { proposeCoaching } from "./coachingCycleEngine";
import type { CoachingObjective, SafetyContext } from "./coachingTypes";
import { interpretControlSeries } from "./controlSeriesInterpretation";
import type { SeriesComparison } from "./seriesComparison";
import { compareSeries } from "./seriesComparison";
import { calculateSeriesMetrics } from "./seriesMetrics";
import type { TechnicalHypothesis } from "./technicalHypothesis";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "./targetCoordinateConversion";

const safety: SafetyContext = {
  inAuthorizedRange: true, rangeRulesAccepted: true, safeDirectionAvailable: true,
  weaponUnloadedVerified: true, magazineRemoved: true, chamberVisualPhysicalCheck: true,
  liveAmmunitionRemovedFromArea: true, eyeAndEarProtection: true, dummyRoundsAllowed: false,
  dummyRoundProcedureKnown: false, instructorPresent: false, canDryFire: true, canLiveFire: true,
};

const hypothesis = (code: TechnicalHypothesis["hypothesisCode"], rank = 1): TechnicalHypothesis => ({
  id: `hypothesis-${code}`, sessionId: "session", seriesId: "source", comparisonId: null,
  observationId: "observation", hypothesisCode: code, category: code === "EQUIPMENT_OR_SIGHT_ISSUE"
    ? "context_equipment" : "trigger", status: "requires_confirmation", plausibilityLevel: "medium",
  confidenceLevel: "low", rank, internalScore: 4, supportingEvidence: [], contradictingEvidence: [],
  missingEvidence: [], applicableContext: { numberOfHands: 2 }, sourceRules: [],
  rulesetVersion: "technical-hypothesis-rules-v1", generatedAt: "2026-08-26T00:00:00.000Z",
});

function comparisonForOffset(source: number, control: number, axis: "horizontalOffset" | "verticalOffset") {
  const delta = control - source;
  return {
    id: "comparison", sessionId: "session", baselineSeriesId: "source", comparedSeriesId: "control",
    comparisonType: "manual", status: "comparable", reliability: "acceptable",
    algorithmVersion: "v", thresholdsVersion: "v", baselineMetricsVersion: "v",
    comparedMetricsVersion: "v", unit: "normalized", reasons: [], limitations: [],
    differences: {
      [axis]: { baselineValue: source, comparedValue: control, delta,
        relativePercent: delta / Math.abs(source) * 100, variation: "notable", percentageLimitation: null },
      [axis === "horizontalOffset" ? "spreadWidth" : "spreadHeight"]: {
        baselineValue: .05, comparedValue: .05, delta: 0, relativePercent: 0,
        variation: "stable", percentageLimitation: null,
      },
    }, counts: {} as never, shape: { baselineValue: "compact", comparedValue: "compact", changed: false },
    computedAt: "2026-08-26T00:00:00.000Z",
  } as SeriesComparison;
}

describe("robustesse directionnelle", () => {
  it.each([
    ["horizontal_stability", "horizontalOffset", -.10, -.05, "objective_improved"],
    ["horizontal_stability", "horizontalOffset", .10, .05, "objective_improved"],
    ["horizontal_stability", "horizontalOffset", -.10, -.15, "objective_worsened"],
    ["horizontal_stability", "horizontalOffset", .10, .15, "objective_worsened"],
    ["vertical_stability", "verticalOffset", -.10, -.05, "objective_improved"],
    ["vertical_stability", "verticalOffset", .10, .05, "objective_improved"],
    ["vertical_stability", "verticalOffset", -.10, -.15, "objective_worsened"],
    ["vertical_stability", "verticalOffset", .10, .15, "objective_worsened"],
  ] as const)("%s : %s de %s vers %s", (objective, axis, source, control, expected) => {
    expect(evaluateCoachingOutcome(comparisonForOffset(source, control, axis), objective))
      .toBe(expected);
  });

  it("reste prudent lors d’un passage de l’autre côté de la cible", () => {
    expect(evaluateCoachingOutcome(comparisonForOffset(-.10, .05, "horizontalOffset"), "horizontal_stability"))
      .toBe("mixed_result");
  });
});

describe("sécurité propre au drill", () => {
  it("ne propose pas le contrôle matériel sans instructeur", () => {
    expect(proposeCoaching({ hypothesis: hypothesis("EQUIPMENT_OR_SIGHT_ISSUE"), testRunId: "test",
      outcome: "supports_hypothesis", sessionId: "session", level: "beginner", numberOfHands: 2,
      safety })).toBeNull();
  });

  it("autorise le contrôle matériel lorsque l’instructeur est explicitement présent", () => {
    expect(proposeCoaching({ hypothesis: hypothesis("EQUIPMENT_OR_SIGHT_ISSUE"), testRunId: "test",
      outcome: "supports_hypothesis", sessionId: "session", level: "beginner", numberOfHands: 2,
      safety: { ...safety, instructorPresent: true } })?.drill.code).toBe("DRILL_EQUIPMENT_CONTROL");
  });
});

const geometry = { version: UNVERIFIED_TARGET_GEOMETRY_VERSION, widthMm: null, heightMm: null,
  centerNormalizedX: .5, centerNormalizedY: .5 };
const context = (id: string) => ({ id, sessionId: "session", status: "completed" as const,
  weaponId: "weapon", distanceMm: 7000, numberOfHands: 2 as const, targetTypeId: "target",
  targetGeometryVersion: UNVERIFIED_TARGET_GEOMETRY_VERSION });
const metrics = (id: string, points: ReadonlyArray<readonly [number, number]>) => calculateSeriesMetrics({
  impacts: points.map(([normalizedX, normalizedY], index) => ({ id: `${id}-${index}`,
    normalizedX, normalizedY, isExcluded: false })), expectedShotCount: 5,
  recordedShotCount: points.length, geometry, computedAt: "2026-08-26T00:00:00.000Z",
});
function controlResult(controlPoints: ReadonlyArray<readonly [number, number]>) {
  const source = metrics("source", [[.495,.495],[.505,.495],[.495,.505],[.505,.505],[.35,.65]]);
  const control = metrics("control", controlPoints);
  const comparison = { id: "comparison", computedAt: "now", ...compareSeries({ baseline: context("source"),
    compared: context("control"), baselineMetrics: source, comparedMetrics: control,
    comparisonType: "manual" }) } as SeriesComparison;
  return { control, result: interpretControlSeries({ objective: "horizontal_stability", sourceMetrics: source,
    controlMetrics: control, comparison }) };
}

describe("prudence outlier identique dans l’analyse et la clôture", () => {
  it("ne transforme pas un micro-outlier statistique en reproduction forte", () => {
    const value = controlResult([[.5,.5],[.5,.5],[.5,.5],[.5,.5],[.508,.5]]);
    expect(value.control.potentiallyAtypicalImpactIds).toHaveLength(1);
    expect(value.result.outcome).toBe("objective_improved");
    expect(value.result.interpretation).not.toContain("reste présent");
  });

  it("reconnaît toujours un véritable outlier", () => {
    const value = controlResult([[.495,.495],[.505,.495],[.495,.505],[.505,.505],[.35,.65]]);
    expect(value.result.outcome).toBe("objective_stable");
    expect(value.result.interpretation).toContain("reste présent");
  });
});

describe("première hypothèse réellement testable", () => {
  it("prend H2 lorsque H1 ne possède aucun test", () => {
    const h1 = hypothesis("SIGHT_PICTURE_VARIATION", 1);
    const h2 = hypothesis("LATERAL_TRIGGER_PRESSURE", 2);
    expect(firstStructurallyTestableHypothesis({ hypotheses: [h1, h2], sessionMode: "coaching_free" }))
      .toBe(h2);
    expect([h1.rank, h2.rank]).toEqual([1, 2]);
  });

  it("conserve H1 lorsque H1 est testable", () => {
    const h1 = hypothesis("ABRUPT_TRIGGER_PRESS", 1);
    const h2 = hypothesis("LATERAL_TRIGGER_PRESSURE", 2);
    expect(firstStructurallyTestableHypothesis({ hypotheses: [h1, h2], sessionMode: "coaching_free" }))
      .toBe(h1);
  });

  it("ne fabrique aucun test lorsqu’aucune hypothèse n’est testable", () => {
    expect(firstStructurallyTestableHypothesis({
      hypotheses: [hypothesis("SIGHT_PICTURE_VARIATION", 1)], sessionMode: "coaching_free",
    })).toBeNull();
  });

  it("respecte numberOfHands en passant une hypothèse 2 mains inapplicable", () => {
    const h1 = { ...hypothesis("UNBALANCED_HAND_PRESSURE", 1), applicableContext: { numberOfHands: 1 } };
    const h2 = { ...hypothesis("LATERAL_TRIGGER_PRESSURE", 2), applicableContext: { numberOfHands: 1 } };
    expect(firstStructurallyTestableHypothesis({ hypotheses: [h1, h2], sessionMode: "coaching_free" }))
      .toBe(h2);
  });

  it("n’utilise plus directement hypotheses[0] dans l’écran de coaching", () => {
    const source = readFileSync(resolve(process.cwd(), "app/sessions/[id]/series/[seriesId]/coaching.tsx"), "utf8");
    expect(source).not.toContain("const h=hypotheses[0]");
    expect(source).toContain("firstStructurallyTestableHypothesis");
  });
});
