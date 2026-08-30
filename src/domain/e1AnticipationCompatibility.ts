import type { TechnicalHypothesis } from "./technicalHypothesis";
import type { HypothesisCode } from "./technicalHypothesisCatalog";

/** Legacy manifestation labels are retained for persisted sessions, but they
 * normalize to E1's sole functional hypothesis when reread. */
export const historicalE1ManifestationCodes = new Set<HypothesisCode>([
  "FLINCH_RESPONSE",
  "PUSHING_AGAINST_RECOIL",
]);

export function isHistoricalE1Manifestation(code: HypothesisCode) {
  return historicalE1ManifestationCodes.has(code);
}

export function normalizeHistoricalE1Hypothesis(hypothesis: TechnicalHypothesis): TechnicalHypothesis {
  if (!isHistoricalE1Manifestation(hypothesis.hypothesisCode)) return hypothesis;
  return {
    ...hypothesis,
    hypothesisCode: "SHOT_ANTICIPATION",
    category: "anticipation",
    supportingEvidence: [...hypothesis.supportingEvidence, {
      code: "HISTORICAL_E1_MANIFESTATION",
      labelFr: "Une manifestation historique est relue comme une réponse anticipatrice à vérifier, sans créer un diagnostic concurrent.",
      source: "limitation",
    }],
  };
}
