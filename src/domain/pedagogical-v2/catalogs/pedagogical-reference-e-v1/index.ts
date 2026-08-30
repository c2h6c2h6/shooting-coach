import competences from "./competences.json";
import diagnosticTests from "./diagnostic-tests.json";
import techniques from "./techniques.json";
import exercises from "./exercises.json";
import { parsePedagogicalCatalog } from "../../catalogLoader";

export const pedagogicalReferenceEV1Files: readonly unknown[] = [competences, diagnosticTests, techniques, exercises];

/** Inactive, in-memory pilot reference data. No product module imports this catalog. */
export function loadPedagogicalReferenceEV1() {
  return parsePedagogicalCatalog(pedagogicalReferenceEV1Files);
}
