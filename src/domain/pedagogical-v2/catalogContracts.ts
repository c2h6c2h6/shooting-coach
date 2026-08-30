import type {
  Competence,
  ExerciseDefinition,
  PedagogicalTechnique,
  PedagogicalTool,
} from "./contracts";
import type { DiagnosticTestDefinition } from "./inputContracts";

export const catalogFileKinds = ["competences", "techniques", "tools", "exercises", "diagnostic_tests"] as const;
export type CatalogFileKind = (typeof catalogFileKinds)[number];

/** Source competence: dependentCompetenceIds is deliberately absent and always derived by the loader. */
export type CompetenceDefinition = Omit<Competence, "dependentCompetenceIds">;

export type CatalogItemByKind = {
  readonly competences: CompetenceDefinition;
  readonly techniques: PedagogicalTechnique;
  readonly tools: PedagogicalTool;
  readonly exercises: ExerciseDefinition;
  readonly diagnostic_tests: DiagnosticTestDefinition;
};

export interface PedagogicalCatalogFile<K extends CatalogFileKind = CatalogFileKind> {
  readonly kind: K;
  readonly schemaVersion: string;
  readonly catalogVersion: string;
  readonly items: readonly CatalogItemByKind[K][];
}

export interface LoadedPedagogicalCatalog {
  readonly schemaVersion: string;
  readonly catalogVersion: string;
  readonly competences: readonly Competence[];
  readonly techniques: readonly PedagogicalTechnique[];
  readonly tools: readonly PedagogicalTool[];
  readonly exercises: readonly ExerciseDefinition[];
  readonly diagnosticTests: readonly DiagnosticTestDefinition[];
}

export const catalogDiagnosticCodes = [
  "INVALID_FILE",
  "INCOMPATIBLE_SCHEMA_VERSION",
  "MISSING_CATALOG_VERSION",
  "CATALOG_VERSION_MISMATCH",
  "INVALID_ITEM",
  "ITEM_SCHEMA_VERSION_MISMATCH",
  "ITEM_CATALOG_VERSION_MISMATCH",
  "DUPLICATE_ID",
  "DUPLICATE_CODE",
  "BROKEN_REFERENCE",
  "PREREQUISITE_CYCLE",
] as const;

export type CatalogDiagnosticCode = (typeof catalogDiagnosticCodes)[number];

export interface CatalogDiagnostic {
  readonly code: CatalogDiagnosticCode;
  readonly fileIndex: number;
  readonly path: string;
  readonly message: string;
  readonly itemId: string | null;
}

export type CatalogLoadResult =
  | { readonly success: true; readonly catalog: LoadedPedagogicalCatalog; readonly diagnostics: readonly [] }
  | { readonly success: false; readonly diagnostics: readonly CatalogDiagnostic[] };

export class PedagogicalCatalogValidationError extends Error {
  constructor(readonly diagnostics: readonly CatalogDiagnostic[]) {
    super(diagnostics.map((diagnostic) =>
      `[${diagnostic.code}] fichier ${diagnostic.fileIndex}, ${diagnostic.path}: ${diagnostic.message}`).join("\n"));
    this.name = "PedagogicalCatalogValidationError";
  }
}
