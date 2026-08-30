import {
  PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  type Competence,
  type ExerciseDefinition,
  type PedagogicalTechnique,
  type PedagogicalTool,
} from "./contracts";
import {
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type DiagnosticTestDefinition,
} from "./inputContracts";
import {
  type CatalogDiagnostic,
  type CatalogDiagnosticCode,
  type CatalogFileKind,
  type CatalogLoadResult,
  catalogFileKinds,
  type CompetenceDefinition,
  type LoadedPedagogicalCatalog,
  PedagogicalCatalogValidationError,
} from "./catalogContracts";
import {
  competenceSchema,
  exerciseDefinitionSchema,
  pedagogicalTechniqueSchema,
  pedagogicalToolSchema,
  type ContractSchema,
} from "./schemas";
import { diagnosticTestDefinitionSchema } from "./inputSchemas";

type RecordValue = Record<string, unknown>;
type IndexedItem = { readonly kind: CatalogFileKind; readonly fileIndex: number; readonly itemIndex: number; readonly value: RecordValue };

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function diagnostic(
  diagnostics: CatalogDiagnostic[], code: CatalogDiagnosticCode, fileIndex: number, path: string,
  message: string, itemId: string | null = null,
) {
  diagnostics.push({ code, fileIndex, path, message, itemId });
}

function sorted<T extends { readonly id: string }>(items: readonly T[]): readonly T[] {
  return [...items].sort((left, right) => left.id.localeCompare(right.id));
}

function expectedSchemaVersion(kind: CatalogFileKind): string {
  return kind === "diagnostic_tests"
    ? PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION
    : PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION;
}

function validateItem(
  item: IndexedItem,
  catalogVersion: string,
  diagnostics: CatalogDiagnostic[],
): boolean {
  const path = `items[${item.itemIndex}]`;
  const itemId = isText(item.value.id) ? item.value.id : null;
  const expectedItemSchemaVersion = expectedSchemaVersion(item.kind);
  if (item.value.schemaVersion !== expectedItemSchemaVersion) {
    diagnostic(diagnostics, "ITEM_SCHEMA_VERSION_MISMATCH", item.fileIndex, `${path}.schemaVersion`,
      `version attendue : ${expectedItemSchemaVersion}`, itemId);
  }
  if (item.value.catalogVersion !== catalogVersion) {
    diagnostic(diagnostics, "ITEM_CATALOG_VERSION_MISMATCH", item.fileIndex, `${path}.catalogVersion`,
      `version attendue : ${catalogVersion}`, itemId);
  }

  // The resolved competence schema requires dependentCompetenceIds. The source contract forbids it.
  if (item.kind === "competences" && "dependentCompetenceIds" in item.value) {
    diagnostic(diagnostics, "INVALID_ITEM", item.fileIndex, `${path}.dependentCompetenceIds`,
      "ce champ est dérivé du graphe des prérequis et ne doit pas être fourni", itemId);
  }
  const valueForSchema = item.kind === "competences"
    ? { ...item.value, dependentCompetenceIds: [] }
    : item.value;
  const schemas: Record<CatalogFileKind, ContractSchema<unknown>> = {
    competences: competenceSchema,
    techniques: pedagogicalTechniqueSchema,
    tools: pedagogicalToolSchema,
    exercises: exerciseDefinitionSchema,
    diagnostic_tests: diagnosticTestDefinitionSchema,
  };
  const parsed = schemas[item.kind].safeParse(valueForSchema);
  if (!parsed.success) {
    for (const issue of parsed.issues) {
      diagnostic(diagnostics, "INVALID_ITEM", item.fileIndex, `${path}.${issue.path}`, issue.message, itemId);
    }
  }
  return !diagnostics.some((entry) => entry.fileIndex === item.fileIndex && entry.itemId === itemId &&
    entry.path.startsWith(path));
}

function addBrokenReference(
  diagnostics: CatalogDiagnostic[], item: IndexedItem, field: string, referencedId: string, target: string,
) {
  diagnostic(diagnostics, "BROKEN_REFERENCE", item.fileIndex, `items[${item.itemIndex}].${field}`,
    `${target} introuvable : ${referencedId}`, String(item.value.id));
}

function validateReferences(items: readonly IndexedItem[], diagnostics: CatalogDiagnostic[]) {
  const idsByKind = new Map<CatalogFileKind, Set<string>>(catalogFileKinds.map((kind) => [kind, new Set()]));
  for (const item of items) idsByKind.get(item.kind)!.add(String(item.value.id));
  const allIds = new Set(items.map((item) => String(item.value.id)));
  const check = (item: IndexedItem, field: string, kind: CatalogFileKind, label: string) => {
    const value = item.value[field];
    const references = Array.isArray(value) ? value : [value];
    for (const reference of references) {
      if (typeof reference === "string" && !idsByKind.get(kind)!.has(reference)) {
        addBrokenReference(diagnostics, item, field, reference, label);
      }
    }
  };
  for (const item of items) {
    if (item.kind === "competences") {
      check(item, "prerequisiteIds", "competences", "compétence prérequise");
      check(item, "pedagogicalToolIds", "tools", "outil pédagogique");
    }
    if (item.kind === "techniques") {
      check(item, "compatibleCompetenceIds", "competences", "compétence compatible");
      check(item, "compatiblePedagogicalToolIds", "tools", "outil pédagogique compatible");
    }
    if (item.kind === "exercises") {
      check(item, "primaryCompetenceId", "competences", "compétence principale");
      check(item, "secondaryCompetenceIds", "competences", "compétence secondaire");
      check(item, "prerequisiteCompetenceIds", "competences", "compétence prérequise");
      check(item, "pedagogicalTechniqueIds", "techniques", "technique pédagogique");
      check(item, "pedagogicalToolIds", "tools", "outil pédagogique");
    }
    if (item.kind === "diagnostic_tests") {
      if (typeof item.value.observedCompetenceId === "string") {
        check(item, "observedCompetenceId", "competences", "compétence observée");
      }
      const prerequisites = item.value.prerequisiteReferenceIds;
      if (Array.isArray(prerequisites)) {
        for (const prerequisiteId of prerequisites) {
          if (typeof prerequisiteId === "string" && !allIds.has(prerequisiteId)) {
            addBrokenReference(diagnostics, item, "prerequisiteReferenceIds", prerequisiteId, "référence prérequise");
          }
        }
      }
    }
  }
}

function detectPrerequisiteCycles(competences: readonly IndexedItem[], diagnostics: CatalogDiagnostic[]) {
  const byId = new Map(competences.map((item) => [String(item.value.id), item]));
  const state = new Map<string, "visiting" | "visited">();
  const stack: string[] = [];
  const reported = new Set<string>();

  const visit = (id: string) => {
    if (state.get(id) === "visited") return;
    if (state.get(id) === "visiting") {
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      const signature = [...new Set(cycle)].sort().join("|");
      if (!reported.has(signature)) {
        reported.add(signature);
        const item = byId.get(id)!;
        diagnostic(diagnostics, "PREREQUISITE_CYCLE", item.fileIndex,
          `items[${item.itemIndex}].prerequisiteIds`, `cycle détecté : ${cycle.join(" -> ")}`, id);
      }
      return;
    }
    state.set(id, "visiting");
    stack.push(id);
    const item = byId.get(id);
    for (const prerequisite of (item?.value.prerequisiteIds as readonly string[] | undefined) ?? []) {
      if (byId.has(prerequisite)) visit(prerequisite);
    }
    stack.pop();
    state.set(id, "visited");
  };
  for (const id of [...byId.keys()].sort()) visit(id);
}

function deriveCompetences(definitions: readonly CompetenceDefinition[]): readonly Competence[] {
  const dependentIds = new Map(definitions.map((definition) => [definition.id, [] as string[]]));
  for (const definition of definitions) {
    for (const prerequisiteId of definition.prerequisiteIds) dependentIds.get(prerequisiteId)!.push(definition.id);
  }
  return sorted(definitions.map((definition) => ({
    ...definition,
    dependentCompetenceIds: dependentIds.get(definition.id)!.sort(),
  })));
}

export function loadPedagogicalCatalog(files: readonly unknown[]): CatalogLoadResult {
  const diagnostics: CatalogDiagnostic[] = [];
  const indexedItems: IndexedItem[] = [];
  let catalogVersion: string | null = null;

  files.forEach((file, fileIndex) => {
    if (!isRecord(file)) {
      diagnostic(diagnostics, "INVALID_FILE", fileIndex, "$", "le fichier doit contenir un objet");
      return;
    }
    if (!(catalogFileKinds as readonly unknown[]).includes(file.kind)) {
      diagnostic(diagnostics, "INVALID_FILE", fileIndex, "kind", "type de fichier de catalogue inconnu");
      return;
    }
    const kind = file.kind as CatalogFileKind;
    const expectedFileSchemaVersion = expectedSchemaVersion(kind);
    if (file.schemaVersion !== expectedFileSchemaVersion) {
      diagnostic(diagnostics, "INCOMPATIBLE_SCHEMA_VERSION", fileIndex, "schemaVersion",
        `version attendue : ${expectedFileSchemaVersion}`);
    }
    if (!isText(file.catalogVersion)) {
      diagnostic(diagnostics, "MISSING_CATALOG_VERSION", fileIndex, "catalogVersion", "version de catalogue obligatoire");
    } else if (catalogVersion === null) catalogVersion = file.catalogVersion;
    else if (file.catalogVersion !== catalogVersion) {
      diagnostic(diagnostics, "CATALOG_VERSION_MISMATCH", fileIndex, "catalogVersion",
        `version attendue : ${catalogVersion}`);
    }
    if (!Array.isArray(file.items)) {
      diagnostic(diagnostics, "INVALID_FILE", fileIndex, "items", "la liste des éléments est obligatoire");
      return;
    }
    file.items.forEach((value, itemIndex) => {
      if (!isRecord(value)) {
        diagnostic(diagnostics, "INVALID_ITEM", fileIndex, `items[${itemIndex}]`, "l'élément doit être un objet");
        return;
      }
      indexedItems.push({ kind: file.kind as CatalogFileKind, fileIndex, itemIndex, value });
    });
  });

  const effectiveCatalogVersion = catalogVersion ?? "";
  const structurallyValid = indexedItems.filter((item) => validateItem(item, effectiveCatalogVersion, diagnostics));
  const seenIds = new Map<string, IndexedItem>();
  const seenCodes = new Map<string, IndexedItem>();
  for (const item of structurallyValid) {
    const id = String(item.value.id);
    const code = String(item.value.code);
    if (seenIds.has(id)) diagnostic(diagnostics, "DUPLICATE_ID", item.fileIndex, `items[${item.itemIndex}].id`,
      `identifiant déjà déclaré : ${id}`, id);
    else seenIds.set(id, item);
    if (seenCodes.has(code)) diagnostic(diagnostics, "DUPLICATE_CODE", item.fileIndex, `items[${item.itemIndex}].code`,
      `code déjà déclaré : ${code}`, id);
    else seenCodes.set(code, item);
  }

  validateReferences(structurallyValid, diagnostics);
  detectPrerequisiteCycles(structurallyValid.filter((item) => item.kind === "competences"), diagnostics);

  if (diagnostics.length > 0) return { success: false, diagnostics };
  const values = <T>(kind: CatalogFileKind) => structurallyValid.filter((item) => item.kind === kind)
    .map((item) => item.value as unknown as T);
  const catalog: LoadedPedagogicalCatalog = {
    schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
    catalogVersion: effectiveCatalogVersion,
    competences: deriveCompetences(values<CompetenceDefinition>("competences")),
    techniques: sorted(values<PedagogicalTechnique>("techniques")),
    tools: sorted(values<PedagogicalTool>("tools")),
    exercises: sorted(values<ExerciseDefinition>("exercises")),
    diagnosticTests: sorted(values<DiagnosticTestDefinition>("diagnostic_tests")),
  };
  return { success: true, catalog, diagnostics: [] };
}

export function parsePedagogicalCatalog(files: readonly unknown[]): LoadedPedagogicalCatalog {
  const result = loadPedagogicalCatalog(files);
  if (!result.success) throw new PedagogicalCatalogValidationError(result.diagnostics);
  return result.catalog;
}
