import competences from "./competences.json";
import tools from "./tools.json";
import techniques from "./techniques.json";
import exercises from "./exercises.json";
import diagnosticTests from "./diagnosticTests.json";
import { parsePedagogicalCatalog } from "../../catalogLoader";

export const pedagogicalReferenceCV1Files: readonly unknown[] = [competences, tools, techniques, exercises, diagnosticTests];

/** Inactive, in-memory reference data. No product module imports this catalog. */
export function loadPedagogicalReferenceCV1() {
  return parsePedagogicalCatalog(pedagogicalReferenceCV1Files);
}
