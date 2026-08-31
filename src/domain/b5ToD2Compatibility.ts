import type {TechnicalHypothesis} from "./technicalHypothesis";
import type {HypothesisCode} from "./technicalHypothesisCatalog";

export const historicalB5HypothesisCodes=new Set<HypothesisCode>([
  "DOMINANT_HAND_OVERGRIP","TRIGGER_HAND_TENSION",
]);

export function normalizeHistoricalB5Hypothesis(hypothesis:TechnicalHypothesis):TechnicalHypothesis {
  if(!historicalB5HypothesisCodes.has(hypothesis.hypothesisCode))return hypothesis;
  return {...hypothesis,hypothesisCode:"TRIGGER_FINGER_HAND_COACTIVATION",category:"trigger"};
}
