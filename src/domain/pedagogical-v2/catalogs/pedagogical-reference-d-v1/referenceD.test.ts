import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION, type PedagogicalEvidence } from "../../contracts";
import { loadPedagogicalCatalog } from "../../catalogLoader";
import {
  diagnosticTestResultStatuses,
  PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
  type DiagnosticTestResult,
} from "../../inputContracts";
import { diagnosticTestResultSchema } from "../../inputSchemas";
import abToolsFile from "../pedagogical-reference-ab-v1/tools.json";
import competencesFile from "./competences.json";
import diagnosticTestsFile from "./diagnostic-tests.json";
import exercisesFile from "./exercises.json";
import techniquesFile from "./techniques.json";
import toolsFile from "./tools.json";
import { loadPedagogicalReferenceDV1, pedagogicalReferenceDV1Files } from ".";

const d3Definition = "Le tireur exerce une action sur la détente qui se poursuit sans interruption volontaire, relâchement parasite ni succession de reprises jusqu’au départ du coup. La continuité décrit l’absence de rupture dans l’action ; elle ne définit ni sa vitesse ni sa progressivité.";
const d4Definition = "Le tireur fait évoluer la pression exercée sur la détente de manière progressive et maîtrisée jusqu’au départ du coup, sans accélération terminale brusque destinée à provoquer volontairement l’instant du départ.";
const d2Definition = "Le tireur exerce l’action de l’index sur la détente sans introduire de composante directionnelle parasite suffisamment importante pour perturber l’organisation de l’arme.";

const d3Objective = "Construire une action de détente dans laquelle, une fois la pression volontairement engagée, celle-ci se poursuit sans succession pression–arrêt–reprise jusqu’au départ du coup.";
const d4Objective = "Construire une action dans laquelle le départ du coup survient au cours d’une montée de pression déjà engagée, et non à la suite d’une action terminale brusque du doigt.";
const d2Objective = "Construire une action de l’index dont la direction de pression permet d’agir sur la détente sans entraîner de déplacement parasite de l’arme imputable à cette direction.";

const d2ObservableIndicators = [
  "L’action de l’index s’effectue sans déplacement latéral observable de l’arme synchronisé avec cette action.",
  "La direction du mouvement de l’index reste cohérente pendant l’action sur la détente.",
  "La modification volontaire de la direction de pression modifie de manière observable la perturbation associée à l’action de l’index.",
  "Le comportement est reproductible sur plusieurs actions comparables.",
] as const;

const d2IndirectIndicators = [
  "Perturbation de l’arme synchronisée avec une action directionnelle visible de l’index.",
  "Défaut persistant alors que la pression de la main forte reste stable.",
  "Amélioration lorsque l’attention pédagogique est portée uniquement sur la direction de l’action de l’index.",
  "Différence observable entre deux directions de pression volontairement comparées sous supervision.",
] as const;

const d2InterpretationLimits = [
  "Une perturbation latérale de l’arme ne suffit pas, à elle seule, à diagnostiquer D2.",
  "La position de l’impact en cible ne permet pas, à elle seule, de valider ou invalider D2.",
  "D2 distingue la neutralité directionnelle de l’action de l’index et son indépendance vis-à-vis des autres doigts ; elle ne décrit ni sa progressivité ni la continuité de l’action.",
  "Une perturbation synchronisée avec l’action de l’index peut relever de sa direction, d’une co-activation des autres doigts, de D4 ou d’une combinaison ; l’observation doit donc rester différentielle.",
  "Une réponse anticipatrice relevant de E1 ne doit pas être requalifiée automatiquement en défaut D2.",
] as const;

const d3ObservableIndicators = [
  "Mouvement de l’index continu jusqu’au départ.",
  "Absence de relâchement pendant l’action engagée.",
  "Absence de succession répétée pression–arrêt–reprise.",
  "Départ du coup survenant pendant une action déjà engagée.",
  "Capacité à reproduire cette continuité sur plusieurs actions comparables.",
] as const;

const d3IndirectIndicators = [
  "Action qui commence puis s’interrompt lorsque l’image de visée oscille.",
  "Petites reprises successives de pression.",
  "Temps de départ très variable dans des conditions comparables.",
  "Amélioration lorsque la consigne est uniquement de poursuivre l’action.",
  "Amélioration lors d’un guidage pédagogique de l’action.",
] as const;

const d4ObservableIndicators = [
  "Augmentation de l’action sur la détente sans accélération terminale brusque.",
  "Mouvement de l’index dont le comportement reste cohérent jusqu’au départ.",
  "Reproductibilité de cette organisation sur plusieurs actions comparables.",
] as const;

const d4IndirectIndicators = [
  "Perturbation de l’arme synchronisée avec une accélération terminale visible.",
  "Dégradation apparaissant lorsque le tireur cherche volontairement à provoquer le départ.",
  "Amélioration lorsque la montée en pression est volontairement ralentie.",
  "Différence nette entre une action guidée et l’action autonome.",
] as const;

const d5Definition = "Le tireur poursuit l’action exercée sur la détente après le départ du coup jusqu’à atteindre la butée mécanique, sans relâchement prématuré provoqué par le départ.";
const d5Objective = "Construire une action dans laquelle le départ du coup ne provoque pas l’arrêt ou le relâchement de l’action sur la détente, celle-ci étant poursuivie jusqu’à la butée mécanique.";
const d5ObservableIndicators = [
  "L’action sur la détente se poursuit après le départ jusqu’à la butée mécanique.",
  "Aucun relâchement immédiat de la détente n’apparaît au moment du départ.",
  "La butée est atteinte avant tout éventuel retour de la détente.",
  "Le tireur peut maintenir la détente à la butée pendant la phase d’observation et de décision.",
] as const;
const d5IndirectIndicators = [
  "Relâchement de la détente immédiatement après le départ.",
  "Retour de la détente engagé avant que la butée ait été clairement atteinte.",
  "Amélioration lorsque la consigne porte uniquement sur la poursuite de l’action jusqu’à la butée.",
] as const;
const d5InterpretationLimits = [
  "Un relâchement prématuré après le départ ne permet pas, à lui seul, d’identifier la cause de ce comportement.",
  "D5 décrit la poursuite de l’action jusqu’à la butée ; elle ne décrit pas le retour vers le reset.",
  "Atteindre la butée ne signifie pas qu’il faut rechercher immédiatement le reset.",
  "D5 ne définit ni une cadence de tir ni une vitesse imposée après le départ.",
] as const;

const d6Definition = "Lorsque la décision de poursuivre impose une nouvelle action sur la détente, le tireur effectue depuis la butée un retour contrôlé jusqu’au point de reset permettant le réengagement de l’action, sans relâchement excessif ni désorganisation.";
const d6Objective = "Construire un retour depuis la butée vers le reset qui rende possible une nouvelle action sur la détente tout en conservant l’organisation du geste et sans faire de la vitesse ou de la recherche du clic une finalité.";
const d6ObservableIndicators = [
  "Le retour vers le reset n’est engagé que lorsqu’une nouvelle action sur la détente est nécessaire.",
  "Le retour depuis la butée est contrôlé jusqu’au point permettant le réengagement de l’action.",
  "Le tireur n’effectue pas de relâchement excessif au-delà de ce qui est nécessaire au reset.",
  "Une nouvelle action peut être engagée après le reset sans désorganisation observable.",
  "Le comportement est reproductible sur plusieurs cycles comparables.",
] as const;
const d6IndirectIndicators = [
  "Relâchement immédiat et automatique après chaque départ, indépendamment de la décision de poursuivre.",
  "Recherche volontaire du clic de reset au détriment de l’organisation du geste.",
  "Relâchement excessif de la détente avant la nouvelle action.",
  "Amélioration lorsque le retour depuis la butée est volontairement contrôlé.",
] as const;
const d6InterpretationLimits = [
  "Le reset n’est nécessaire que lorsqu’une nouvelle action sur la détente doit suivre.",
  "D6 ne doit pas être évaluée comme une recherche de vitesse.",
  "La perception ou l’audition du clic de reset ne constitue pas, à elle seule, un critère de maîtrise de D6.",
  "La référence à un tempo comparable entre l’aller et le retour est un outil pédagogique d’acquisition et non une exigence chronométrique universelle.",
  "D6 décrit le retour contrôlé vers le reset ; elle ne remplace pas D5, qui concerne la poursuite préalable jusqu’à la butée.",
] as const;

const byCode = () => new Map(loadPedagogicalReferenceDV1().competences.map((item) => [item.code, item]));
const diagnosticTest = () => loadPedagogicalReferenceDV1().diagnosticTests.find(item=>item.code==="TEST-D4-01");
const technique = () => loadPedagogicalReferenceDV1().techniques.find(item=>item.code==="TECH-D4-01");
const exercise = () => loadPedagogicalReferenceDV1().exercises.find(item=>item.code==="EX-D4-01");

const usableEvidence: PedagogicalEvidence = {
  id: "TEST-FIXTURE-EVIDENCE-D4-01",
  schemaVersion: PEDAGOGICAL_V2_CONTRACT_SCHEMA_VERSION,
  itemVersion: "TEST-FIXTURE-1",
  catalogVersion: "TEST-FIXTURE-CATALOG",
  subjectType: "uncertainty",
  subjectId: "UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT",
  sourceType: "diagnostic_test_result",
  sourceReferenceId: "TEST-FIXTURE-RESULT-D4-01",
  value: { TEST_FIXTURE: true },
  effect: "strengthens",
  strength: 0.5,
  reliability: 0.5,
};

function resultFixture(status: DiagnosticTestResult["status"]): DiagnosticTestResult {
  return {
    id: `TEST-FIXTURE-RESULT-D4-01-${status}`,
    schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    recordVersion: "TEST-FIXTURE-1",
    performedAt: "2026-01-01T00:00:00.000Z",
    diagnosticTestSnapshot: {
      referenceType: "diagnostic_test",
      origin: "catalog_item",
      id: "diagnostic-test-d4-01",
      code: "TEST-D4-01",
      displayName: "Observation ralentie de l’action",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1",
      schemaVersion: PEDAGOGICAL_V2_INPUT_SCHEMA_VERSION,
    },
    status,
    structuredResult: { TEST_FIXTURE: true },
    observationSnapshots: [],
    evidenceSnapshots: status === "usable" ? [usableEvidence] : [],
    knownLimitations: [],
    inconclusiveReason: status === "inconclusive" ? "TEST/FIXTURE résultat inconclusif" : null,
    provenance: { sourceType: "TEST/FIXTURE", sourceId: null, actorType: null, actorId: null },
  };
}

function sourceFilesUnder(path: string): string[] {
  return readdirSync(path).flatMap((name) => {
    const candidate = resolve(path, name);
    return statSync(candidate).isDirectory() ? sourceFilesUnder(candidate) : /\.(ts|tsx)$/.test(name) ? [candidate] : [];
  });
}

describe("référentiel métier réel D2/D3/D4/D5/D6 v1", () => {
  it("charge exactement les cinq compétences D2 à D6 autorisées", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.competences.map((item) => item.code)).toEqual(["D2", "D3", "D4", "D5", "D6"]);
    expect(catalog.competences).toHaveLength(5);
  });

  it("conserve exactement les identifiants et versions autoritatifs", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.catalogVersion).toBe("pedagogical-reference-d-v1");
    expect(catalog.competences.map((item) => item.id)).toEqual([
      "competence-d2", "competence-d3", "competence-d4", "competence-d5", "competence-d6",
    ]);
    expect(catalog.competences.every((item) => item.itemVersion === "1.0.0" &&
      item.schemaVersion === "pedagogical-v2-contracts-v1" &&
      item.catalogVersion === "pedagogical-reference-d-v1")).toBe(true);
  });

  it("conserve le domaine et le mode instructor pour D2 à D6", () => {
    const competences = loadPedagogicalReferenceDV1().competences;
    expect(new Set(competences.map((item) => item.domain))).toEqual(new Set(["D — Détente"]));
    expect(competences.every((item) => item.validationMode === "instructor")).toBe(true);
    expect(competences.some((item) => item.validationMode === "automatic")).toBe(false);
  });

  it("résout D2 à D6 sans référence cassée ni cycle", () => {
    expect(loadPedagogicalCatalog(pedagogicalReferenceDV1Files)).toEqual(expect.objectContaining({
      success: true,
      diagnostics: [],
    }));
  });

  it("conserve D2 sans prérequis et le graphe direct D3 vers D6", () => {
    const competences = byCode();
    expect(competences.get("D2")?.prerequisiteIds).toEqual([]);
    expect(competences.get("D3")?.prerequisiteIds).toEqual([]);
    expect(competences.get("D4")?.prerequisiteIds).toEqual(["competence-d3"]);
    expect(competences.get("D5")?.prerequisiteIds).toEqual(["competence-d4"]);
    expect(competences.get("D6")?.prerequisiteIds).toEqual(["competence-d5"]);
    expect(competencesFile.items.every((item) => !("dependentCompetenceIds" in item))).toBe(true);
  });

  it("dérive les dépendances sans seconde source de vérité", () => {
    const competences = byCode();
    expect(competences.get("D2")?.dependentCompetenceIds).toEqual([]);
    expect(competences.get("D3")?.dependentCompetenceIds).toEqual(["competence-d4"]);
    expect(competences.get("D4")?.dependentCompetenceIds).toEqual(["competence-d5"]);
    expect(competences.get("D5")?.dependentCompetenceIds).toEqual(["competence-d6"]);
    expect(competences.get("D6")?.dependentCompetenceIds).toEqual([]);
  });

  it("charge D2 exactement une fois avec son identité autoritative", () => {
    const d2Items = loadPedagogicalReferenceDV1().competences.filter((item) => item.code === "D2");
    expect(d2Items).toHaveLength(1);
    expect(d2Items[0]).toMatchObject({
      id: "competence-d2",
      code: "D2",
      domain: "D — Détente",
      name: "Appliquer une pression directionnellement neutre sur la détente",
      schemaVersion: "pedagogical-v2-contracts-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1",
      validationMode: "instructor",
      prerequisiteIds: [],
    });
  });

  it("conserve exactement la définition et l’objectif D2", () => {
    const d2 = byCode().get("D2");
    expect(d2?.definition).toBe(d2Definition);
    expect(d2?.pedagogicalObjective).toBe(d2Objective);
  });

  it("conserve exactement les indicateurs et limites D2", () => {
    const d2 = byCode().get("D2");
    expect(d2?.observableIndicators).toEqual(d2ObservableIndicators);
    expect(d2?.indirectIndicators).toEqual(d2IndirectIndicators);
    expect(d2?.interpretationLimits).toEqual(d2InterpretationLimits);
  });

  it("ajoute uniquement les deux composantes internes demandées à D2", () => {
    const source = competencesFile.items.find((item) => item.code === "D2")!;
    expect(source.internalComponents).toEqual([{code:"D2.1",description:"Neutralité directionnelle de l’action de l’index."},
      {code:"D2.2",description:"Indépendance de l’action de l’index vis-à-vis des autres doigts de la main qui tient l’arme."}]);
    for (const key of ["pedagogicalToolIds", "pedagogicalSupportNotes",
      "referenceStatements", "dependentCompetenceIds", "diagnosticTestId", "techniqueId", "exerciseId"]) {
      expect(source).not.toHaveProperty(key);
    }
  });

  it("préserve le moyen directionnel D2 et ajoute la chaîne d’indépendance", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const document = readFileSync(resolve(directory, "../../../../../PEDAGOGICAL_REFERENCE_D_D2_V1.md"), "utf8");
    expect(document).toContain("Comparer sous supervision des actions où la direction de pression de l’index est volontairement modifiée");
    expect(document).toContain("UNCERTAINTY_D2_DIRECTIONAL_PRESSURE");
    expect(loadPedagogicalReferenceDV1().diagnosticTests.map((item) => item.code)).toEqual(["TEST-D2-INDEPENDENCE-01","TEST-D4-01"]);
    expect(loadPedagogicalReferenceDV1().techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(loadPedagogicalReferenceDV1().exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
  });

  it("préserve exactement les définitions D3 et D4", () => {
    const competences = byCode();
    expect(competences.get("D3")?.definition).toBe(d3Definition);
    expect(competences.get("D4")?.definition).toBe(d4Definition);
  });

  it("préserve exactement les objectifs D3 et D4", () => {
    const competences = byCode();
    expect(competences.get("D3")?.pedagogicalObjective).toBe(d3Objective);
    expect(competences.get("D4")?.pedagogicalObjective).toBe(d4Objective);
  });

  it("préserve exactement les indicateurs directs et indirects de D3", () => {
    const d3 = byCode().get("D3");
    expect(d3?.observableIndicators).toEqual(d3ObservableIndicators);
    expect(d3?.indirectIndicators).toEqual(d3IndirectIndicators);
  });

  it("préserve exactement les indicateurs directs et indirects de D4", () => {
    const d4 = byCode().get("D4");
    expect(d4?.observableIndicators).toEqual(d4ObservableIndicators);
    expect(d4?.indirectIndicators).toEqual(d4IndirectIndicators);
  });

  it("conserve toutes les limites d'interprétation sans créer leurs entités citées", () => {
    const competences = byCode();
    expect(competences.get("D3")?.interpretationLimits).toEqual([
      "Une action discontinue ne permet pas, à elle seule, d’identifier sa cause.",
      "Elle peut notamment être associée à une recherche excessive de stabilité ou de perfection visuelle, à une difficulté d’acceptation du départ, à une co-contraction de la main forte, à la fatigue ou à une mauvaise compréhension de la consigne.",
      "D3 décrit la rupture de l’action, pas pourquoi cette rupture existe.",
      "La position des impacts en cible ne permet pas, à elle seule, de diagnostiquer D3.",
      "Ne pas confondre D3 avec D4 : une action peut être continue mais brutalement accélérée.",
    ]);
    expect(competences.get("D4")?.interpretationLimits).toEqual([
      "Une perturbation de l’arme au départ ne suffit pas à diagnostiquer D4.",
      "Une perturbation peut notamment être compatible avec : D2 — direction de pression ou indépendance index–main ; E1 — réponse anticipatrice ; D4 ; ou une combinaison.",
      "La position des impacts en cible ne permet jamais, à elle seule, de valider ou invalider D4.",
      "Le terme “coup de doigt” ne constitue pas un diagnostic technique suffisamment précis du moteur.",
    ]);
    expect(loadPedagogicalReferenceDV1().competences.map((item) => item.code)).not.toEqual(
      expect.arrayContaining(["D1", "E1"]),
    );
  });

  it("conserve les doctrines comme notes sans créer de nouvelle entité", () => {
    const competences = byCode();
    expect(competences.get("D3")?.pedagogicalSupportNotes).toEqual([
      "La continuité signifie que l’action ne s’interrompt pas ; elle ne signifie ni lenteur obligatoire ni vitesse imposée.",
    ]);
    expect(competences.get("D4")?.pedagogicalSupportNotes).toEqual([
      "Progressif ne signifie pas lent.",
      "Le ralentissement peut être utilisé pour apprendre ou observer D4.",
      "Le ralentissement n’est pas la compétence.",
      "Une action rapide peut être progressive.",
    ]);
  });

  it("réutilise uniquement les deux outils autoritatifs sans nouvel outil sémantique", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.tools.map((item) => item.code).sort()).toEqual([
      "INSTRUCTOR_TACTILE_FEEDBACK", "OBSERVATION_VIDEO",
    ]);
    const abById = new Map(abToolsFile.items.map((item) => [item.id, item]));
    for (const tool of toolsFile.items) {
      const source = abById.get(tool.id)!;
      expect({ code: tool.code, kind: tool.kind, name: tool.name, description: tool.description,
        schemaVersion: tool.schemaVersion, itemVersion: tool.itemVersion }).toEqual({
        code: source.code, kind: source.kind, name: source.name, description: source.description,
        schemaVersion: source.schemaVersion, itemVersion: source.itemVersion,
      });
    }
    expect(byCode().get("D3")?.pedagogicalToolIds).toEqual([
      "pedagogical-tool:INSTRUCTOR_TACTILE_FEEDBACK", "pedagogical-tool:OBSERVATION_VIDEO",
    ]);
  });

  it("ne crée aucune autre compétence, notamment D1, D7, E1 ou C9", () => {
    expect(loadPedagogicalReferenceDV1().competences.map((item) => item.code)).toEqual(["D2", "D3", "D4", "D5", "D6"]);
  });

  it("n'encode dans les objets D2/D4 aucun événement, décision ou self-report réel", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.diagnosticTests.map((item) => item.code)).toEqual(["TEST-D2-INDEPENDENCE-01","TEST-D4-01"]);
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
    const forbidden = new Set(["masteryEvents", "pedagogicalDecisions", "shooterSelfReports",
      "observations", "hypotheses", "recommendations"]);
    expect(competencesFile.items.every((item) => Object.keys(item).every((key) => !forbidden.has(key)))).toBe(true);
  });

  it("ne crée aucune variable spécifique ni lien direct vers un exercice", () => {
    const source = JSON.stringify(competencesFile);
    expect(source).not.toMatch(/D[234]_(RAPIDE|DISTANCE|CADENCE)/);
    expect(competencesFile.items.every((item) => !("exerciseId" in item) && !("exerciseIds" in item))).toBe(true);
  });

  it("n'est référencé en production que par le pilote D4 et le contrôle technique D2 explicitement isolés", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const projectRoot = resolve(directory, "../../../../..");
    const productionFiles = [...sourceFilesUnder(resolve(projectRoot, "app")), ...sourceFilesUnder(resolve(projectRoot, "src"))]
      .filter((file) => !file.startsWith(directory) && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));
    const catalogConsumers = productionFiles.filter((file) =>
      /pedagogical-reference-d-v1|loadPedagogicalReferenceDV1/.test(readFileSync(file, "utf8")));
    expect(catalogConsumers).toEqual([
      resolve(projectRoot, "src/application/pedagogicalV2Pilot.ts"),
      resolve(projectRoot, "src/domain/technicalObservationControl.ts"),
    ]);
  });

  it("conserve l'isolation de React, Expo, SQLite, repositories et moteur v1", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(directory, "index.ts"), "utf8");
    const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1]);
    expect(imports.every((value) => value.startsWith("."))).toBe(true);
    expect(imports.join("\n")).not.toMatch(/react|expo|sqlite|repository|coachingCycle|Recommendation|TrainingDrill/i);
  });

  it("documente les frontières et tous les éléments explicitement hors périmètre", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const document = readFileSync(resolve(directory, "../../../../../PEDAGOGICAL_REFERENCE_D_D3_D4_V1.md"), "utf8");
    expect(document).toContain("D3 : « L’action s’interrompt-elle ? »");
    expect(document).toContain("D4 : « Comment l’intensité de la pression évolue-t-elle ? »");
    expect(document).toContain("TEST-D4-01");
    expect(document).toContain("EX-D4-01");
    expect(document).toContain("D1, D2 ou E1");
  });
});

describe("D5/D6 — Butée et reset contrôlé", () => {
  it("charge D5 et D6 exactement une fois avec leurs identités et versions", () => {
    const d5Items = loadPedagogicalReferenceDV1().competences.filter((item) => item.code === "D5");
    const d6Items = loadPedagogicalReferenceDV1().competences.filter((item) => item.code === "D6");
    expect(d5Items).toHaveLength(1);
    expect(d6Items).toHaveLength(1);
    expect(d5Items[0]).toMatchObject({
      id: "competence-d5", code: "D5", name: "Poursuivre l’action sur la détente jusqu’à la butée",
      domain: "D — Détente", schemaVersion: "pedagogical-v2-contracts-v1", itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1", validationMode: "instructor",
    });
    expect(d6Items[0]).toMatchObject({
      id: "competence-d6", code: "D6",
      name: "Revenir au reset de manière contrôlée lorsqu’une nouvelle action est nécessaire",
      domain: "D — Détente", schemaVersion: "pedagogical-v2-contracts-v1", itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1", validationMode: "instructor",
    });
  });

  it("conserve exactement la définition et l'objectif D5", () => {
    const d5 = byCode().get("D5");
    expect(d5?.definition).toBe(d5Definition);
    expect(d5?.pedagogicalObjective).toBe(d5Objective);
  });

  it("conserve exactement les indicateurs directs et indirects D5", () => {
    const d5 = byCode().get("D5");
    expect(d5?.observableIndicators).toEqual(d5ObservableIndicators);
    expect(d5?.indirectIndicators).toEqual(d5IndirectIndicators);
  });

  it("conserve exactement les limites D5", () => {
    expect(byCode().get("D5")?.interpretationLimits).toEqual(d5InterpretationLimits);
  });

  it("conserve exactement la définition et l'objectif D6", () => {
    const d6 = byCode().get("D6");
    expect(d6?.definition).toBe(d6Definition);
    expect(d6?.pedagogicalObjective).toBe(d6Objective);
  });

  it("conserve exactement les indicateurs directs et indirects D6", () => {
    const d6 = byCode().get("D6");
    expect(d6?.observableIndicators).toEqual(d6ObservableIndicators);
    expect(d6?.indirectIndicators).toEqual(d6IndirectIndicators);
  });

  it("conserve exactement les limites D6", () => {
    expect(byCode().get("D6")?.interpretationLimits).toEqual(d6InterpretationLimits);
  });

  it("dérive le graphe direct acyclique D3 vers D6 sans référence cassée", () => {
    const result = loadPedagogicalCatalog(pedagogicalReferenceDV1Files);
    expect(result).toEqual(expect.objectContaining({ success: true, diagnostics: [] }));
    const competences = byCode();
    expect([...competences].map(([code, item]) => ({
      code, prerequisites: item.prerequisiteIds, dependents: item.dependentCompetenceIds,
    }))).toEqual([
      { code: "D2", prerequisites: [], dependents: [] },
      { code: "D3", prerequisites: [], dependents: ["competence-d4"] },
      { code: "D4", prerequisites: ["competence-d3"], dependents: ["competence-d5"] },
      { code: "D5", prerequisites: ["competence-d4"], dependents: ["competence-d6"] },
      { code: "D6", prerequisites: ["competence-d5"], dependents: [] },
    ]);
  });

  it("reste indépendant de l'ordre des fichiers et des compétences", () => {
    const reversedCompetences = { ...competencesFile, items: [...competencesFile.items].reverse() };
    const reversedFiles = [...pedagogicalReferenceDV1Files].reverse().map((file) =>
      file === competencesFile ? reversedCompetences : file);
    const result = loadPedagogicalCatalog(reversedFiles);
    expect(result).toEqual(expect.objectContaining({ success: true, diagnostics: [] }));
    if (result.success) expect(result.catalog.competences).toEqual(loadPedagogicalReferenceDV1().competences);
  });

  it("n'ajoute aucun champ optionnel ni autre contenu métier avec D5/D6", () => {
    for (const item of competencesFile.items.filter((competence) => ["D5", "D6"].includes(competence.code))) {
      expect(item).not.toHaveProperty("pedagogicalToolIds");
      expect(item).not.toHaveProperty("pedagogicalSupportNotes");
      expect(item).not.toHaveProperty("internalComponents");
      expect(item).not.toHaveProperty("referenceStatements");
      expect(item).not.toHaveProperty("dependentCompetenceIds");
    }
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.tools.map((item) => item.code).sort()).toEqual([
      "INSTRUCTOR_TACTILE_FEEDBACK", "OBSERVATION_VIDEO",
    ]);
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
    expect(catalog.diagnosticTests.map((item) => item.code)).toEqual(["TEST-D2-INDEPENDENCE-01","TEST-D4-01"]);
  });

  it("documente les doctrines et les frontières D4/D5/D6 sans créer d'entité supplémentaire", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const document = readFileSync(resolve(directory, "../../../../../PEDAGOGICAL_REFERENCE_D_D5_D6_V1.md"), "utf8");
    expect(document).toContain("Le départ du coup ne termine pas l’action sur la détente.");
    expect(document).toContain("Le reset est conditionnel à une nouvelle action.");
    expect(document).toContain("Éviter l’obsession du clic.");
    expect(document).toContain("Il ne s’agit pas d’une égalité chronométrique universelle");
    expect(document).toContain("D4 : comment la pression évolue avant le départ.");
    expect(document).toContain("D5 : l’action est-elle poursuivie jusqu’à la butée après le départ ?");
    expect(document).toContain("D6 : lorsqu’une nouvelle action est nécessaire, le retour depuis la butée vers le reset est-il contrôlé ?");
  });
});

describe("TEST-D4-01 — Observation ralentie de l’action", () => {
  it("charge exactement un DiagnosticTest réel avec son identité et ses versions", () => {
    expect(loadPedagogicalReferenceDV1().diagnosticTests).toHaveLength(2);
    expect(diagnosticTest()).toMatchObject({
      id: "diagnostic-test-d4-01",
      code: "TEST-D4-01",
      name: "Observation ralentie de l’action",
      schemaVersion: "pedagogical-v2-inputs-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1",
    });
  });

  it("conserve exactement l'incertitude, la compétence observée et le seul prérequis", () => {
    expect(diagnosticTest()).toMatchObject({
      discriminatedHypothesisIds: [],
      discriminatedUncertaintyCodes: ["UNCERTAINTY_D4_PROGRESSIVITY_INSUFFICIENT"],
      observedCompetenceId: "competence-d4",
      prerequisiteReferenceIds: ["competence-d3"],
    });
  });

  it("conserve exactement l'objectif et les conditions autoritatives", () => {
    expect(diagnosticTest()?.objective).toBe(
      "L’augmentation de pression reste-t-elle progressive lorsque l’action est volontairement ralentie afin de rendre son organisation observable ?",
    );
    expect(diagnosticTest()?.conditionsOfUse).toEqual([
      "Action volontairement ralentie.",
      "Objectif exclusif : rendre l’organisation de la pression plus observable.",
      "Conditions permettant une observation directe par l’instructeur.",
      "Aucune contrainte temporelle ajoutée.",
    ]);
  });

  it("conserve exactement les limites d'interprétation", () => {
    expect(diagnosticTest()?.interpretationLimits).toEqual([
      "Une action progressive pendant le test n’exclut pas qu’une perturbation apparaisse dans d’autres conditions.",
      "Une action non progressive pendant le test renforce l’hypothèse D4 insuffisante mais ne permet pas d’exclure l’intervention concomitante d’un autre mécanisme.",
      "Une perturbation de l’arme ne suffit pas à attribuer le défaut à D4.",
      "La position des impacts en cible ne permet pas, à elle seule, d’interpréter le résultat de ce test.",
    ]);
  });

  it("conserve exactement les critères d'arrêt et la supervision instructor", () => {
    expect(diagnosticTest()?.stopCriteria).toEqual([
      "Impossibilité d’observer l’action de manière suffisamment fiable.",
      "Conditions ne permettant plus d’isoler raisonnablement l’observation recherchée.",
      "Interruption demandée par l’instructeur.",
    ]);
    expect(diagnosticTest()?.validationMode).toBe("instructor");
    expect(diagnosticTest()?.supervisionRequirements).toEqual(["Supervision instructeur requise."]);
  });

  it("réutilise uniquement les trois catégories existantes de DiagnosticTestResult", () => {
    expect(diagnosticTestResultStatuses).toEqual(["usable", "non_discriminating", "inconclusive"]);
    for (const status of diagnosticTestResultStatuses) {
      expect(diagnosticTestResultSchema.safeParse(resultFixture(status)).success).toBe(true);
    }
  });

  it("conserve l'evidence d'un résultat usable sans produire de diagnostic automatique", () => {
    const parsed = diagnosticTestResultSchema.parse(resultFixture("usable"));
    expect(parsed.evidenceSnapshots).toEqual([usableEvidence]);
    expect(parsed).not.toHaveProperty("automaticDiagnosis");
    expect(parsed).not.toHaveProperty("exerciseId");
    expect(parsed).not.toHaveProperty("masteryLevel");
  });

  it("préserve intégralement TEST-D4-01 à côté du test D2", () => {
    const source = JSON.stringify(diagnosticTestsFile.items.find(item=>item.code==="TEST-D4-01"));
    expect(diagnosticTestsFile.items.map((item) => item.code)).toEqual(["TEST-D4-01","TEST-D2-INDEPENDENCE-01"]);
    expect(source).not.toMatch(/douille|départ attendu|EX-D4-01|D1|D2|D5|D6|E1/);
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
  });

  it("laisse D3 et D4 inchangés et limite TEST-D4-01 au pilote isolé", () => {
    expect(competencesFile.items.map((item) => item.code)).toEqual(["D2", "D3", "D4", "D5", "D6"]);
    expect(byCode().get("D3")?.definition).toBe(d3Definition);
    expect(byCode().get("D4")?.definition).toBe(d4Definition);
    const directory = dirname(fileURLToPath(import.meta.url));
    const projectRoot = resolve(directory, "../../../../..");
    const productionFiles = [...sourceFilesUnder(resolve(projectRoot, "app")), ...sourceFilesUnder(resolve(projectRoot, "src"))]
      .filter((file) => !file.startsWith(directory) && !file.endsWith(".test.ts") && !file.endsWith(".test.tsx"));
    const testConsumers = productionFiles.filter((file) =>
      /diagnostic-test-d4-01|TEST-D4-01/.test(readFileSync(file, "utf8")));
    expect(testConsumers).toEqual([
      resolve(projectRoot, "src/application/pedagogicalV2Pilot.ts"),
    ]);
  });
});

describe("TECH-D4-01 — Ralentissement volontaire", () => {
  it("charge exactement une technique réelle avec son identité et ses versions", () => {
    expect(loadPedagogicalReferenceDV1().techniques).toHaveLength(2);
    expect(technique()).toMatchObject({
      id: "technique-d4-01",
      code: "TECH-D4-01",
      name: "Ralentissement volontaire",
      schemaVersion: "pedagogical-v2-contracts-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1",
    });
  });

  it("conserve exactement le principe autoritatif", () => {
    expect(technique()?.principle).toBe(
      "Faire exécuter volontairement l’action sur la détente à une vitesse suffisamment réduite pour permettre au tireur de percevoir et à l’instructeur d’observer l’organisation de la montée en pression, notamment une éventuelle accélération terminale. Une fois l’action progressive acquise, la durée peut être réduite progressivement sans modifier la qualité recherchée.",
    );
  });

  it("conserve exactement les quatre indications", () => {
    expect(technique()?.indications).toEqual([
      "Difficulté du tireur à percevoir la manière dont sa pression évolue jusqu’au départ.",
      "Accélération terminale observée ou suspectée.",
      "Besoin de rendre l’action suffisamment lisible pour permettre un retour instructeur.",
      "Besoin de faire ressentir la différence entre vitesse de l’action et progressivité de l’action.",
    ]);
  });

  it("conserve exactement les quatre conditions de non-utilisation", () => {
    expect(technique()?.contraindications).toEqual([
      "Lorsque ralentir l’action ne répond pas à l’incertitude ou à l’objectif pédagogique travaillé.",
      "Lorsque le ralentissement provoque une modification telle de l’action qu’elle n’est plus interprétable.",
      "Lorsque l’élève transforme la consigne en objectif de lenteur.",
      "Lorsque l’instructeur dispose déjà d’éléments suffisants et que la poursuite de la technique n’apporte plus d’information ou d’apprentissage utile.",
    ]);
  });

  it("requiert l'instructeur et n'impose aucun outil pédagogique", () => {
    expect(technique()?.instructorRequired).toBe(true);
    expect(technique()?.compatiblePedagogicalToolIds).toEqual([]);
    expect(technique()?.compatiblePedagogicalToolIds).not.toEqual(
      expect.arrayContaining(["pedagogical-tool:INSTRUCTOR_TACTILE_FEEDBACK", "pedagogical-tool:OBSERVATION_VIDEO"]),
    );
  });

  it("associe uniquement competence-d4 sans définir la technique comme une nouvelle compétence", () => {
    expect(technique()?.compatibleCompetenceIds).toEqual(["competence-d4"]);
    expect(loadPedagogicalReferenceDV1().competences.map((item) => item.code)).toEqual(["D2", "D3", "D4", "D5", "D6"]);
  });

  it("ne fabrique aucun champ de prérequis ou de limites absent du contrat", () => {
    const source = techniquesFile.items[0];
    expect(source).not.toHaveProperty("prerequisiteIds");
    expect(source).not.toHaveProperty("prerequisiteCompetenceIds");
    expect(source).not.toHaveProperty("interpretationLimits");
  });

  it("documente le prérequis, la doctrine et les limites sans étendre le contrat", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const document = readFileSync(resolve(directory, "../../../../../PEDAGOGICAL_TECHNIQUE_D4_01_V1.md"), "utf8");
    expect(document).toContain("`competence-d3`");
    expect(document).toContain("Le ralentissement est un moyen pédagogique, pas la compétence. Progressif ne signifie pas lent.");
    expect(document).toContain("Une action lente n’est pas nécessairement progressive.");
    expect(document).toContain("La technique ne doit pas installer la lenteur comme critère de réussite.");
  });

  it("maintient TEST-D4-01 et TECH-D4-01 comme deux objets sans déclenchement automatique", () => {
    expect(diagnosticTest()?.code).toBe("TEST-D4-01");
    expect(technique()?.code).toBe("TECH-D4-01");
    expect(diagnosticTestsFile.items[0]).not.toHaveProperty("pedagogicalTechniqueId");
    expect(techniquesFile.items[0]).not.toHaveProperty("diagnosticTestId");
  });

  it("ne produit directement ni exercice, ni décision, ni maîtrise, ni seconde technique", () => {
    const catalog = loadPedagogicalReferenceDV1();
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-D2-INDEPENDENCE-01","TECH-D4-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
    const source = JSON.stringify(techniquesFile);
    expect(source).not.toMatch(/EX-D4-01|MasteryEvent|PedagogicalDecision|CompetenceEvaluation|automaticDiagnosis/);
  });
});

describe("EX-D4-01 — Construire la montée de pression", () => {
  it("charge exactement un exercice réel avec son identité et ses versions", () => {
    expect(loadPedagogicalReferenceDV1().exercises).toHaveLength(2);
    expect(exercise()).toMatchObject({
      id: "exercise-d4-01",
      code: "EX-D4-01",
      name: "Construire la montée de pression",
      schemaVersion: "pedagogical-v2-contracts-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-d-v1",
      learningPhase: "acquisition",
    });
  });

  it("conserve D4 comme unique compétence principale et D3 comme seul prérequis", () => {
    expect(exercise()).toMatchObject({
      primaryCompetenceId: "competence-d4",
      secondaryCompetenceIds: [],
      prerequisiteCompetenceIds: ["competence-d3"],
    });
  });

  it("associe uniquement TECH-D4-01 sans déclenchement automatique", () => {
    expect(exercise()?.pedagogicalTechniqueIds).toEqual(["technique-d4-01"]);
    expect(diagnosticTestsFile.items[0]).not.toHaveProperty("exerciseId");
    expect(techniquesFile.items[0]).not.toHaveProperty("exerciseId");
    expect(exercisesFile.items[0]).not.toHaveProperty("diagnosticTestId");
  });

  it("conserve exactement l'objectif, la rationale et la supervision", () => {
    expect(exercise()).toMatchObject({
      pedagogicalObjective: "Produire plusieurs actions progressives et reproductibles dans une situation simplifiée, sans contrainte temporelle ajoutée.",
      rationale: "Isoler la progressivité de l’action sur la détente dans une situation volontairement simplifiée, sans contrainte temporelle ajoutée, afin de permettre au tireur de construire et à l’instructeur d’observer une montée de pression sans accélération terminale brusque.",
      instructorRequired: true,
      modeCodes: [],
      technicalEquipmentCodes: [],
      pedagogicalToolIds: [],
    });
  });

  it("conserve exactement le protocole et l'unique instruction", () => {
    expect(exercise()?.protocol).toEqual([
      "L’instructeur place l’exercice dans une situation simplifiée compatible avec les conditions d’entraînement et de sécurité établies.",
      "Le tireur applique la consigne : « Fais monter la pression jusqu’au départ, sans action brusque finale. »",
      "L’instructeur observe prioritairement l’évolution de l’action sur la détente, sans ajouter de contrainte temporelle.",
      "L’action est répétée suffisamment pour permettre à l’instructeur d’apprécier si le comportement observé est reproductible et non accidentel.",
    ]);
    expect(exercise()?.instructions).toEqual([
      "Fais monter la pression jusqu’au départ, sans action brusque finale.",
    ]);
  });

  it("conserve exactement les sensations recherchées et les erreurs fréquentes", () => {
    expect(exercise()?.desiredSensations).toEqual([
      "Perception d’une pression qui augmente progressivement jusqu’au départ.",
      "Sensation que le départ survient pendant une action déjà engagée, sans action terminale brusque.",
      "Conservation de la qualité de l’action lorsque sa durée commence ensuite à être réduite.",
    ]);
    expect(exercise()?.frequentErrors).toEqual([
      "Accélération terminale brusque destinée à provoquer le départ.",
      "Transformer le ralentissement en objectif de lenteur.",
      "Interrompre puis reprendre l’action au lieu de conserver la continuité requise par D3.",
      "Modifier simultanément plusieurs éléments de l’action, rendant l’observation de D4 difficilement interprétable.",
    ]);
  });

  it("conserve le critère qualitatif sans seuil numérique et les critères d'arrêt exacts", () => {
    expect(exercise()?.successCriteria).toEqual([
      "Le comportement doit être suffisamment répété pour permettre à l’instructeur de constater qu’il n’est pas accidentel.",
    ]);
    expect(exercise()?.successCriteria.join(" ")).not.toMatch(/\d/);
    expect(exercise()?.stopCriteria).toEqual([
      "L’action n’est plus suffisamment continue pour permettre d’évaluer proprement D4.",
      "Les conditions ne permettent plus d’observer la progressivité de manière suffisamment fiable.",
      "Le ralentissement modifie l’action au point qu’elle n’est plus interprétable.",
      "L’instructeur décide d’interrompre l’exercice.",
    ]);
  });

  it("conserve exactement les conditions de non-utilisation", () => {
    expect(exercise()?.doNotUseWhen).toEqual([
      "Lorsque D3 n’est pas suffisamment présente pour permettre de travailler la progressivité de l’action.",
      "Lorsque l’objectif pédagogique du moment ne concerne pas D4.",
      "Lorsque le ralentissement provoque une modification telle de l’action qu’elle n’est plus interprétable.",
      "Lorsque la répétition n’apporte plus d’information ou d’apprentissage utile.",
    ]);
  });

  it("conserve exactement les variables par défaut et time comme seule variable modifiable", () => {
    expect(exercise()?.defaultVariables).toEqual({
      distance: null,
      numberOfHands: null,
      time: null,
      cadence: null,
      zoneSize: null,
      targetType: null,
      sightSystem: null,
      shotCount: null,
      movement: null,
      attentionalLoad: null,
      complexity: null,
      supervision: "instructor",
    });
    expect(exercise()?.modifiableVariableKeys).toEqual(["time"]);
  });

  it("résout toutes les références et ne crée aucune sortie automatique", () => {
    expect(loadPedagogicalCatalog(pedagogicalReferenceDV1Files)).toEqual(expect.objectContaining({
      success: true,
      diagnostics: [],
    }));
    const loaded = exercise();
    expect(loaded).not.toHaveProperty("pedagogicalDecision");
    expect(loaded).not.toHaveProperty("masteryEvent");
    expect(loaded).not.toHaveProperty("competenceEvaluation");
    expect(loaded).not.toHaveProperty("shooterSelfReport");
  });

  it("reste chargeable indépendamment de l'ordre des fichiers du catalogue", () => {
    const result = loadPedagogicalCatalog([...pedagogicalReferenceDV1Files].reverse());
    expect(result).toEqual(expect.objectContaining({ success: true, diagnostics: [] }));
    if (result.success) {
      expect(result.catalog.exercises.map((item) => item.code)).toEqual(["EX-D2-INDEPENDENCE-01","EX-D4-01"]);
    }
  });

  it("documente les doctrines et le périmètre sans étendre le contrat", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const document = readFileSync(resolve(directory, "../../../../../PEDAGOGICAL_EXERCISE_D4_01_V1.md"), "utf8");
    expect(document).toContain("Progressif ne signifie pas lent.");
    expect(document).toContain("Le ralentissement est un moyen pédagogique, pas la compétence.");
    expect(document).toContain("D3 est un prérequis de EX-D4-01, pas une compétence secondaire.");
    expect(document).toContain("L’exercice ne possède qu’une seule compétence principale : D4.");
    expect(document).toContain("Une modification de la durée ne crée pas une nouvelle compétence D4.");
  });
});
