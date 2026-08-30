import type { TechnicalHypothesis } from "./technicalHypothesis";
import type { HypothesisCode } from "./technicalHypothesisCatalog";

export const historicalTriggerFingerHypothesisCodes = new Set<HypothesisCode>([
  "TRIGGER_FINGER_TOO_LITTLE",
  "TRIGGER_FINGER_TOO_DEEP",
]);

export function isHistoricalTriggerFingerHypothesis(code: HypothesisCode) {
  return historicalTriggerFingerHypothesisCodes.has(code);
}

export function normalizeHistoricalTriggerFingerHypothesis(
  hypothesis: TechnicalHypothesis,
): TechnicalHypothesis {
  if (!isHistoricalTriggerFingerHypothesis(hypothesis.hypothesisCode)) return hypothesis;
  return {
    ...hypothesis,
    hypothesisCode: "LATERAL_TRIGGER_PRESSURE",
    category: "trigger",
    supportingEvidence: [
      ...hypothesis.supportingEvidence,
      {
        code: "HISTORICAL_TRIGGER_FINGER_PLACEMENT",
        labelFr: "Une hypothèse historique liée au placement de l’index avait été examinée, sans permettre d’en déduire la profondeur depuis la cible.",
        source: "limitation",
      },
    ],
  };
}
