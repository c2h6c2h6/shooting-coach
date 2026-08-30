import type { TechnicalHypothesis } from "./technicalHypothesis";

export const HISTORICAL_TWO_HAND_CONTRIBUTION_CODE = "UNBALANCED_HAND_PRESSURE" as const;
export const FUNCTIONAL_TWO_HAND_CONTRIBUTION_CODE = "TWO_HAND_CONTRIBUTION" as const;

type TwoHandCompatibleHypothesis = Pick<TechnicalHypothesis,"hypothesisCode"|"category"|"supportingEvidence">;

export function isHistoricalTwoHandContributionHypothesis(hypothesis: Pick<TechnicalHypothesis,"hypothesisCode">) {
  return hypothesis.hypothesisCode === HISTORICAL_TWO_HAND_CONTRIBUTION_CODE;
}

export function normalizeTwoHandContributionHypothesis<T extends TwoHandCompatibleHypothesis>(
  hypothesis: T,
  historical = false,
): T {
  if (!isHistoricalTwoHandContributionHypothesis(hypothesis)) return hypothesis;
  return {
    ...hypothesis,
    hypothesisCode: FUNCTIONAL_TWO_HAND_CONTRIBUTION_CODE,
    category: "grip",
    supportingEvidence: historical ? [...hypothesis.supportingEvidence, {
      code: "HISTORICAL_TWO_HAND_CONTRIBUTION",
      labelFr: "Une hypothèse historique relative à la contribution des deux mains avait été examinée sous l’ancien ruleset.",
      source: "limitation",
    }] : hypothesis.supportingEvidence,
  } as T;
}
