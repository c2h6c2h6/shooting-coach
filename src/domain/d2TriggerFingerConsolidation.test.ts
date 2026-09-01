import { describe, expect, it } from "vitest";
import { generateTechnicalHypotheses } from "./technicalHypothesis";
import type { ShootingObservation } from "./shootingObservation";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import { applyConfirmationOutcomeToHypothesis } from "./confirmationOutcomeTransition";
import { proposeCoaching } from "./coachingCycleEngine";
import { normalizeHistoricalTriggerFingerHypothesis } from "./d2TriggerFingerCompatibility";
import type { TechnicalHypothesis } from "./technicalHypothesis";
import type { SafetyContext } from "./coachingTypes";
import { selectConfirmationTest } from "./confirmationTestEngine";

function generate(
  observationCode: ShootingObservation["observationCode"],
  laterality: "right" | "left",
) {
  const observation: ShootingObservation = {
    id: `observation-${observationCode}-${laterality}`, sessionId: "session", seriesId: "series",
    comparisonId: null, observationCode,
    category: observationCode.startsWith("OFFSET") ? "centering" : "combined",
    scope: "single_series", status: "confirmed_by_rules", magnitude: "medium", confidenceLevel: "low",
    rank: "primary", supportingMetrics: { laterality }, limitingFactors: [], algorithmVersion: "test",
    rulesetVersion: "test", thresholdsVersion: "test", sourceVersion: "test", generatedAt: "2026-08-27T00:00:00.000Z",
  };
  return generateTechnicalHypotheses({ observations: [observation], laterality, impactCount: 5,
    numberOfHands: 2, generatedAt: "2026-08-27T00:00:00.000Z" });
}

const safe: SafetyContext = {inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
  weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,
  liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,dummyRoundsAllowed:false,
  dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};

function functionalHypothesis(code: TechnicalHypothesis["hypothesisCode"] = "LATERAL_TRIGGER_PRESSURE"):
TechnicalHypothesis {
  return {id:`hypothesis-${code}`,sessionId:"session",seriesId:"series",comparisonId:null,
    observationId:"observation",hypothesisCode:code,category:"trigger",status:"requires_confirmation",
    plausibilityLevel:"medium",confidenceLevel:"low",rank:1,internalScore:4,supportingEvidence:[],
    contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],
    rulesetVersion:"technical-hypothesis-rules-v1",generatedAt:"2026-08-27T00:00:00.000Z"};
}

describe("consolidation fonctionnelle D2", () => {
  it.each([
    ["right", "OFFSET_LEFT", "TRIGGER_FINGER_TOO_DEEP"],
    ["right", "OFFSET_RIGHT", "TRIGGER_FINGER_TOO_LITTLE"],
    ["left", "OFFSET_LEFT", "TRIGGER_FINGER_TOO_LITTLE"],
    ["left", "OFFSET_RIGHT", "TRIGGER_FINGER_TOO_DEEP"],
  ] as const)("ne produit plus %s + %s → %s", (laterality, observation, historicalCode) => {
    expect(generate(observation, laterality).some(item => item.hypothesisCode === historicalCode)).toBe(false);
  });

  it("supprime aussi les deux anciennes règles directionnelles COMPACT_BUT_OFFSET", () => {
    expect(observationHypothesisMappings.filter(item => item.observation === "COMPACT_BUT_OFFSET"
      && ["TRIGGER_FINGER_TOO_LITTLE", "TRIGGER_FINGER_TOO_DEEP"].includes(item.hypothesis)))
      .toHaveLength(0);
  });

  it.each(["right", "left"] as const)("conserve une piste D2 fonctionnelle sans règle miroir pour %s", laterality => {
    const left=generate("OFFSET_LEFT",laterality),right=generate("OFFSET_RIGHT",laterality);
    expect(left.some(item=>item.hypothesisCode==="LATERAL_TRIGGER_PRESSURE")).toBe(true);
    expect(right.some(item=>item.hypothesisCode==="LATERAL_TRIGGER_PRESSURE")).toBe(true);
    expect(observationHypothesisMappings.some(item=>item.hypothesis.startsWith("TRIGGER_FINGER_TOO_"))).toBe(false);
  });

  it("recadre le test vers la neutralité directionnelle de l’action", () => {
    const test=confirmationTestCatalog.find(item=>item.code==="TEST_TRIGGER_FINGER_PLACEMENT")!;
    expect(test.hypothesisCodes).toContain("LATERAL_TRIGGER_PRESSURE");
    expect(test.title).toBe("Influence de l’action de l’index");
    expect(test.objective).toContain("déplacement latéral reproductible");
    expect(test.observationCriteria).toEqual(["Aucun déplacement latéral reproductible lors de l’action",
      "Déplacement latéral reproductible synchronisé avec l’action sur la détente",
      "Observation ambiguë ou non reproductible","Mouvement impossible à observer de façon fiable"]);
    expect(test.instructions.join(" ")).toMatch(/action habituelle.*déplacement latéral synchronisé.*reproductible/i);
    expect(test.instructions.join(" ")).toContain("sans rechercher de position universelle");
    expect(test.instructions.join(" ")).toMatch(/résultat en cible.*preuve/i);
    const selection=selectConfirmationTest({hypothesis:functionalHypothesis(),alternatives:[],
      sessionMode:"coaching_free",safety:safe,userCanPerform:true,contextKnown:true,numberOfHands:2});
    expect([selection.primary?.code,selection.alternative?.code]).toContain("TEST_TRIGGER_FINGER_PLACEMENT");
    expect(outcomeForTestObservation(test.code,"LATERAL_TRIGGER_PRESSURE",
      "Déplacement latéral reproductible synchronisé avec l’action sur la détente")).toBe("supports_hypothesis");
    expect(outcomeForTestObservation(test.code,"LATERAL_TRIGGER_PRESSURE",
      "Aucun déplacement latéral reproductible lors de l’action")).toBe("does_not_support_hypothesis");
    expect(outcomeForTestObservation(test.code,"LATERAL_TRIGGER_PRESSURE",
      "Observation ambiguë ou non reproductible")).toBe("inconclusive");
    expect(outcomeForTestObservation(test.code,"LATERAL_TRIGGER_PRESSURE",
      "Mouvement impossible à observer de façon fiable")).toBe("not_observed");
  });

  it("does_not_support affaiblit toujours D2 sans modifier rang ni score", () => {
    const hypothesis=functionalHypothesis();
    const outcome=outcomeForTestObservation("TEST_TRIGGER_FINGER_PLACEMENT",hypothesis.hypothesisCode,
      "Aucun déplacement latéral reproductible lors de l’action");
    expect(applyConfirmationOutcomeToHypothesis(hypothesis,outcome))
      .toMatchObject({status:"weakened",rank:1,internalScore:4});
  });

  it("ne considère pas une absence de différence entre placements comme preuve négative", () => {
    expect(() => outcomeForTestObservation("TEST_TRIGGER_FINGER_PLACEMENT", "LATERAL_TRIGGER_PRESSURE",
      "Aucune différence observable")).toThrow();
  });

  it("ne déduit aucun drill de l’ordre du catalogue pour l’action latérale", () => {
    expect(proposeCoaching({hypothesis:functionalHypothesis(),testRunId:"test",outcome:"supports_hypothesis",
      sessionId:"session",level:"beginner",numberOfHands:2,safety:safe})?.drill.code)
      .toBeUndefined();
  });

  it.each(["TRIGGER_FINGER_TOO_LITTLE","TRIGGER_FINGER_TOO_DEEP"] as const)(
    "relit %s comme D2 fonctionnelle sans modifier score ni rang", historicalCode => {
      const historical={...functionalHypothesis(historicalCode),rank:3,internalScore:7};
      const normalized=normalizeHistoricalTriggerFingerHypothesis(historical);
      expect(normalized).toMatchObject({id:historical.id,hypothesisCode:"LATERAL_TRIGGER_PRESSURE",
        rank:3,internalScore:7});
      expect(normalized.supportingEvidence.at(-1)?.code).toBe("HISTORICAL_TRIGGER_FINGER_PLACEMENT");
    });
});
