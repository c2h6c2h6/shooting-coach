import { describe, expect, it } from "vitest";
import { selectConfirmationTest } from "./confirmationTestEngine";
import { outcomeForTestObservation } from "./confirmationTestObservation";
import { proposeCoaching } from "./coachingCycleEngine";
import { firstStructurallyTestableHypothesis } from "./confirmationTestEngine";
import { confirmationTestCatalog } from "./confirmationTestCatalog";
import { coachingRecommendationCatalog } from "./coachingRecommendationCatalog";
import { observationHypothesisMappings } from "./observationHypothesisMappings";
import { applyConfirmationOutcomeToHypothesis } from "./confirmationOutcomeTransition";
import type { SafetyContext } from "./coachingTypes";
import type { TechnicalHypothesis } from "./technicalHypothesis";

const safety: SafetyContext = {inAuthorizedRange:true,rangeRulesAccepted:true,safeDirectionAvailable:true,
  weaponUnloadedVerified:true,magazineRemoved:true,chamberVisualPhysicalCheck:true,
  liveAmmunitionRemovedFromArea:true,eyeAndEarProtection:true,dummyRoundsAllowed:false,
  dummyRoundProcedureKnown:false,instructorPresent:false,canDryFire:true,canLiveFire:true};

function hypothesis(code: TechnicalHypothesis["hypothesisCode"] = "UNBALANCED_HAND_PRESSURE",
  rank = 1, overrides: Partial<TechnicalHypothesis> = {}): TechnicalHypothesis {
  return {id:`hypothesis-${rank}`,sessionId:"session",seriesId:"series",comparisonId:null,
    observationId:`observation-${rank}`,hypothesisCode:code,category:"grip",status:"requires_confirmation",
    plausibilityLevel:"medium",confidenceLevel:"low",rank,internalScore:5-rank,supportingEvidence:[],
    contradictingEvidence:[],missingEvidence:[],applicableContext:{numberOfHands:2},sourceRules:[],
    rulesetVersion:"technical-hypothesis-rules-v1",generatedAt:"2026-08-27T00:00:00.000Z",...overrides};
}

describe("neutralisation prudente de UNBALANCED_HAND_PRESSURE", () => {
  it("ne sélectionne plus TEST_GRIP_CONSTANCY", () => {
    const selection=selectConfirmationTest({hypothesis:hypothesis(),alternatives:[],sessionMode:"coaching_free",
      safety,userCanPerform:true,contextKnown:true,numberOfHands:2});
    expect(selection.primary).toBeNull();
    expect(selection.blockers).toContain("Aucun test applicable.");
  });

  it("conserve TEST_GRIP_CONSTANCY et tous ses critères pour la constance réelle", () => {
    const h=hypothesis("INCONSISTENT_GRIP_PRESSURE");
    const selection=selectConfirmationTest({hypothesis:h,alternatives:[],sessionMode:"coaching_free",
      safety,userCanPerform:true,contextKnown:true,numberOfHands:2});
    expect(selection.primary?.code).toBe("TEST_GRIP_CONSTANCY");
    expect(selection.primary?.observationCriteria).toEqual(["Prise ressentie constante","Crispation croissante",
      "Pression variable","Changement de placement"]);
    const outcome=outcomeForTestObservation(selection.primary!.code,h.hypothesisCode,"Pression variable");
    expect(outcome).toBe("supports_hypothesis");
  });

  it("ne propose ni recommandation ni drill de constance ou follow-through", () => {
    const proposal=proposeCoaching({hypothesis:hypothesis(),testRunId:"legacy-test",
      outcome:"supports_hypothesis",sessionId:"session",level:"beginner",numberOfHands:2,safety});
    expect(proposal).toBeNull();
    expect(coachingRecommendationCatalog.find(item=>item.code==="REC_GRIP_CONSTANCY")?.hypothesisCodes)
      .not.toContain("UNBALANCED_HAND_PRESSURE");
  });

  it("passe de H1 non testable à H2 testable sans changer la liste", () => {
    const h1=hypothesis("UNBALANCED_HAND_PRESSURE",1),h2=hypothesis("INCONSISTENT_GRIP_PRESSURE",2);
    const before=[h1.rank,h1.internalScore,h2.rank,h2.internalScore];
    expect(firstStructurallyTestableHypothesis({hypotheses:[h1,h2],sessionMode:"coaching_free"})).toBe(h2);
    expect([h1.rank,h1.internalScore,h2.rank,h2.internalScore]).toEqual(before);
  });

  it("saute aussi H2 non testable et retient H3", () => {
    const h1=hypothesis("UNBALANCED_HAND_PRESSURE",1),h2=hypothesis("ATTENTION_LOSS",2,
      {category:"context_equipment"}),h3=hypothesis("INCONSISTENT_GRIP_PRESSURE",3);
    expect(firstStructurallyTestableHypothesis({hypotheses:[h1,h2,h3],sessionMode:"coaching_free"})).toBe(h3);
  });

  it("ne crée aucun fallback si aucune autre piste n’est testable", () => {
    expect(firstStructurallyTestableHypothesis({hypotheses:[hypothesis(),
      hypothesis("ATTENTION_LOSS",2,{category:"context_equipment"})],sessionMode:"coaching_free"})).toBeNull();
  });

  it("rattache les mappings géométriques au code fonctionnel et conserve numberOfHands", () => {
    expect(observationHypothesisMappings.some(item=>item.hypothesis==="UNBALANCED_HAND_PRESSURE")).toBe(false);
    expect(observationHypothesisMappings.some(item=>item.hypothesis==="TWO_HAND_CONTRIBUTION")).toBe(true);
    expect(hypothesis().applicableContext.numberOfHands).toBe(2);
    expect(confirmationTestCatalog.find(item=>item.code==="TEST_GRIP_CONSTANCY")?.hypothesisCodes)
      .not.toContain("UNBALANCED_HAND_PRESSURE");
  });

  it("conserve la sémantique does_not_support", () => {
    const h=hypothesis("INCONSISTENT_GRIP_PRESSURE");
    expect(applyConfirmationOutcomeToHypothesis(h,"does_not_support_hypothesis"))
      .toMatchObject({status:"weakened",rank:1,internalScore:4});
  });
});
