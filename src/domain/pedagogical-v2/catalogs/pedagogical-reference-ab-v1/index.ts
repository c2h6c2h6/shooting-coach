import competences from "./competences.json";
import tools from "./tools.json";
import techniques from "./techniques.json";
import exercises from "./exercises.json";
import { parsePedagogicalCatalog } from "../../catalogLoader";

export const pedagogicalReferenceABV1Files: readonly unknown[] = [competences, tools, techniques, exercises];

/** Inactive, in-memory reference data. No product module imports this catalog. */
export function loadPedagogicalReferenceABV1() {
  return parsePedagogicalCatalog(pedagogicalReferenceABV1Files);
}
