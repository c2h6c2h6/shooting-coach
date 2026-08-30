import competences from "./competences.json";
import tools from "./tools.json";
import diagnosticTests from "./diagnostic-tests.json";
import techniques from "./techniques.json";
import exercises from "./exercises.json";
import { parsePedagogicalCatalog } from "../../catalogLoader";

export const pedagogicalReferenceDV1Files: readonly unknown[] = [competences, tools, diagnosticTests, techniques, exercises];

/** Inactive, in-memory pilot reference data. No product module imports this catalog. */
export function loadPedagogicalReferenceDV1() {
  return parsePedagogicalCatalog(pedagogicalReferenceDV1Files);
}
