import { TechnicalHypothesis } from "./technicalHypothesis";
import { technicalHypothesisCatalog } from "./technicalHypothesisCatalog";
export function hypothesisExplanation(h:TechnicalHypothesis){
  return {title:technicalHypothesisCatalog[h.hypothesisCode].titleFr,
    statement:technicalHypothesisCatalog[h.hypothesisCode].cautiousStatementFr,
    support:h.supportingEvidence.map(e=>e.labelFr),weaken:h.contradictingEvidence.map(e=>e.labelFr),
    missing:h.missingEvidence.map(e=>e.labelFr)};
}
