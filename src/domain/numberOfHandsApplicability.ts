import { ConfirmationTestDefinition, TrainingDrill } from "./coachingTypes";
import { DiagnosticQuestion } from "./diagnosticQuestionCatalog";
import { NumberOfHands } from "./session";
import { HypothesisCode } from "./technicalHypothesisCatalog";

export type NumberOfHandsApplicability = "applicable" | "inapplicable" | "insufficient_information";

export const twoHandOnlyHypothesisCodes = new Set<HypothesisCode>([
  "WEAK_SUPPORT_HAND_PRESSURE",
  "EXCESSIVE_SUPPORT_HAND_PRESSURE",
  "UNBALANCED_HAND_PRESSURE",
  "TWO_HAND_CONTRIBUTION",
]);

const twoHandOnlyCompetenceCodes = new Set(["B3", "B4"]);

export function hypothesisApplicabilityForNumberOfHands(
  hypothesisCode: HypothesisCode,
  numberOfHands: NumberOfHands | null,
): NumberOfHandsApplicability {
  if (!twoHandOnlyHypothesisCodes.has(hypothesisCode)) return "applicable";
  if (numberOfHands === 2) return "applicable";
  return numberOfHands === 1 ? "inapplicable" : "insufficient_information";
}

export function competenceApplicabilityForNumberOfHands(
  competenceCode: string,
  numberOfHands: NumberOfHands | null,
): NumberOfHandsApplicability {
  if (!twoHandOnlyCompetenceCodes.has(competenceCode)) return "applicable";
  if (numberOfHands === 2) return "applicable";
  return numberOfHands === 1 ? "inapplicable" : "insufficient_information";
}

export function isDiagnosticQuestionApplicableForNumberOfHands(
  question: DiagnosticQuestion,
  numberOfHands: NumberOfHands | null,
): boolean {
  return question.code !== "SUPPORT_PRESSURE_CONSTANT" || numberOfHands === 2;
}

export function isConfirmationTestApplicableForNumberOfHands(
  _test: ConfirmationTestDefinition,
  hypothesisCode: HypothesisCode,
  numberOfHands: NumberOfHands | null,
): boolean {
  return hypothesisApplicabilityForNumberOfHands(hypothesisCode, numberOfHands) === "applicable";
}

export function isTrainingDrillApplicableForNumberOfHands(
  _drill: TrainingDrill,
  hypothesisCode: HypothesisCode,
  numberOfHands: NumberOfHands | null,
): boolean {
  return hypothesisApplicabilityForNumberOfHands(hypothesisCode, numberOfHands) === "applicable";
}

export function numberOfHandsFromApplicableContext(context: Record<string, unknown>): NumberOfHands | null {
  return context.numberOfHands === 1 || context.numberOfHands === 2 ? context.numberOfHands : null;
}
