import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadPedagogicalCatalog } from "../../catalogLoader";
import competencesFile from "./competences.json";
import diagnosticTestsFile from "./diagnostic-tests.json";
import techniquesFile from "./techniques.json";
import exercisesFile from "./exercises.json";
import { loadPedagogicalReferenceEV1, pedagogicalReferenceEV1Files } from ".";

const e1Definition = "E1 concerne la capacité du tireur à accepter le départ du coup sans produire une réponse motrice anticipatrice précédant le recul attendu.";
const e1Objective = "Construire une réponse au départ dans laquelle le tireur laisse survenir le coup sans produire, avant le recul, de mouvement anticipateur destiné à accompagner, éviter ou provoquer ce départ.";
const e1ObservableIndicators = [
  "Absence de réponse motrice observable précédant le recul réel.",
  "Lorsque le départ attendu ne se produit pas, absence de mouvement anticipateur associé à ce départ attendu.",
  "Organisation corporelle conservée jusqu’au moment où le recul réel survient.",
  "Comportement reproductible sur plusieurs occurrences comparables.",
] as const;
const e1IndirectIndicators = [
  "Mouvement corporel apparaissant avant le recul attendu.",
  "Réponse motrice observable alors qu’aucun départ réel ne s’est produit.",
  "Dégradation lorsque le tireur cherche à prévoir l’instant exact du départ.",
  "Amélioration lorsque le tireur accepte de laisser survenir le départ sans tenter d’en provoquer l’instant.",
] as const;
const e1InterpretationLimits = [
  "Une absence de réponse anticipatrice sur une occurrence ne suffit pas à exclure E1.",
  "Pour soutenir E1, la réponse observée doit précéder le recul réel ou apparaître malgré l’absence de départ.",
  "Un mouvement apparaissant après un véritable départ peut relever du recul normal et ne suffit pas à caractériser E1.",
  "La position de l’impact en cible ne constitue pas, à elle seule, une preuve de réponse anticipatrice.",
  "E1 peut coexister avec D4 ou avec d’autres mécanismes ; une observation ne doit pas être attribuée automatiquement à une cause unique.",
] as const;

const testObjective = "Déterminer si une réponse motrice anticipatrice apparaît lorsque le tireur s’attend à un départ alors qu’aucun départ ni recul réel ne survient.";
const testConditions = [
  "Le tireur doit s’attendre à ce qu’un départ puisse survenir.",
  "Certaines occurrences doivent permettre d’observer la réponse du tireur alors qu’aucun départ réel ne survient.",
  "L’instructeur doit pouvoir observer suffisamment clairement la chronologie entre l’action du tireur et l’absence ou la présence réelle du départ.",
  "Le test doit être utilisé dans des conditions permettant de distinguer une réponse anticipatrice d’un mouvement consécutif au recul.",
] as const;
const testLimits = [
  "Une absence de réponse anticipatrice sur une occurrence ne suffit pas à exclure E1.",
  "Une réponse observée ne soutient E1 que si elle précède le recul réel ou apparaît malgré l’absence de départ.",
  "Un mouvement apparaissant après un véritable départ peut relever du recul normal.",
  "La position de l’impact en cible ne permet pas, à elle seule, d’interpréter ce test.",
  "Une réponse observable malgré l’absence de départ constitue une evidence particulièrement informative mais ne produit pas automatiquement un diagnostic.",
] as const;
const testStopCriteria = [
  "L’instructeur ne peut plus déterminer suffisamment clairement la chronologie entre la réponse motrice observée et le départ ou l’absence de départ.",
  "Les conditions ne permettent plus de distinguer raisonnablement une réponse anticipatrice d’un autre mouvement.",
  "La poursuite du test n’apporte plus d’information discriminante utile.",
  "L’instructeur décide d’interrompre le test.",
] as const;
const supervisionRequirements = [
  "Supervision directe par un instructeur.",
  "Observation de la chronologie entre la réponse motrice et le départ ou l’absence de départ.",
] as const;
const techniquePrinciple = "Amener le tireur à poursuivre son action sans chercher à provoquer, accompagner ou éviter l’instant du départ, afin que le coup puisse survenir sans réponse motrice anticipatrice.";
const techniqueIndications = [
  "Réponse motrice observée avant le recul ou malgré l’absence de départ réel.",
  "Tendance du tireur à chercher à provoquer ou contrôler volontairement l’instant exact du départ.",
  "Organisation qui se dégrade à l’approche du départ alors que l’action précédente reste acceptable.",
  "Besoin de faire ressentir la différence entre laisser survenir le départ et y répondre par anticipation.",
] as const;
const techniqueContraindications = [
  "Lorsque la chronologie du mouvement observé ne permet pas de distinguer une réponse anticipatrice d’un mouvement consécutif au recul.",
  "Lorsque l’incertitude principale concerne une autre compétence et qu’E1 n’est pas suffisamment étayée.",
  "Lorsque la consigne conduit le tireur à interrompre ou dégrader volontairement son action dans le seul but de ne pas anticiper.",
  "Lorsque la poursuite de la technique n’apporte plus d’information ou d’apprentissage utile.",
] as const;

describe("référentiel métier réel E1 v1", () => {
  it("charge exactement E1 et TEST-E1-01 dans le catalogue E séparé", () => {
    const catalog = loadPedagogicalReferenceEV1();
    expect(catalog.catalogVersion).toBe("pedagogical-reference-e-v1");
    expect(catalog.competences.map((item) => item.code)).toEqual(["E1"]);
    expect(catalog.diagnosticTests.map((item) => item.code)).toEqual(["TEST-E1-01"]);
    expect(catalog.techniques.map((item) => item.code)).toEqual(["TECH-E1-01"]);
    expect(catalog.exercises.map((item) => item.code)).toEqual(["EX-E1-01"]);
    expect(catalog.tools).toEqual([]);
  });

  it("conserve exactement l’identité, le domaine, les versions et l’absence de prérequis E1", () => {
    const e1 = loadPedagogicalReferenceEV1().competences[0];
    expect(e1).toMatchObject({
      id: "competence-e1",
      schemaVersion: "pedagogical-v2-contracts-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-e-v1",
      code: "E1",
      domain: "E — Départ",
      name: "Accepter le départ sans réponse anticipatrice",
      validationMode: "instructor",
      prerequisiteIds: [],
      dependentCompetenceIds: [],
    });
  });

  it("conserve exactement la définition et l’objectif E1", () => {
    const e1 = loadPedagogicalReferenceEV1().competences[0];
    expect(e1.definition).toBe(e1Definition);
    expect(e1.pedagogicalObjective).toBe(e1Objective);
  });

  it("conserve exactement les indicateurs directs et indirects E1", () => {
    const e1 = loadPedagogicalReferenceEV1().competences[0];
    expect(e1.observableIndicators).toEqual(e1ObservableIndicators);
    expect(e1.indirectIndicators).toEqual(e1IndirectIndicators);
  });

  it("conserve exactement les limites E1 sans champs optionnels artificiels", () => {
    const e1 = loadPedagogicalReferenceEV1().competences[0];
    expect(e1.interpretationLimits).toEqual(e1InterpretationLimits);
    for (const key of ["pedagogicalToolIds", "pedagogicalSupportNotes", "internalComponents", "referenceStatements"])
      expect(competencesFile.items[0]).not.toHaveProperty(key);
  });

  it("conserve exactement l’identité et les références de TEST-E1-01", () => {
    const test = loadPedagogicalReferenceEV1().diagnosticTests[0];
    expect(test).toMatchObject({
      id: "diagnostic-test-e1-01",
      schemaVersion: "pedagogical-v2-inputs-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-e-v1",
      code: "TEST-E1-01",
      name: "Départ attendu non produit",
      observedCompetenceId: "competence-e1",
      discriminatedHypothesisIds: [],
      discriminatedUncertaintyCodes: ["UNCERTAINTY_E1_ANTICIPATORY_RESPONSE"],
      prerequisiteReferenceIds: [],
      validationMode: "instructor",
    });
  });

  it("conserve exactement l’objectif, les conditions et les limites de TEST-E1-01", () => {
    const test = loadPedagogicalReferenceEV1().diagnosticTests[0];
    expect(test.objective).toBe(testObjective);
    expect(test.conditionsOfUse).toEqual(testConditions);
    expect(test.interpretationLimits).toEqual(testLimits);
  });

  it("conserve exactement les critères d’arrêt et la supervision de TEST-E1-01", () => {
    const test = loadPedagogicalReferenceEV1().diagnosticTests[0];
    expect(test.stopCriteria).toEqual(testStopCriteria);
    expect(test.supervisionRequirements).toEqual(supervisionRequirements);
  });

  it("charge exactement l’identité, les versions et la compétence compatible de TECH-E1-01", () => {
    const catalog = loadPedagogicalReferenceEV1();
    expect(catalog.techniques).toHaveLength(1);
    expect(catalog.techniques[0]).toMatchObject({
      id: "technique-e1-01",
      schemaVersion: "pedagogical-v2-contracts-v1",
      itemVersion: "1.0.0",
      catalogVersion: "pedagogical-reference-e-v1",
      code: "TECH-E1-01",
      name: "Acceptation du départ",
      compatibleCompetenceIds: ["competence-e1"],
      instructorRequired: true,
      compatiblePedagogicalToolIds: [],
    });
  });

  it("charge un ExerciseDefinition E1 dédié sans créer de lien automatique", () => {
    const exercise = loadPedagogicalReferenceEV1().exercises[0];
    expect(exercise).toMatchObject({ id: "exercise-e1-01", code: "EX-E1-01", primaryCompetenceId: "competence-e1",
      pedagogicalTechniqueIds: ["technique-e1-01"], instructorRequired: true });
    expect(exercise.pedagogicalObjective).toContain("sans réponse motrice anticipatrice");
    expect(exercisesFile.items).toHaveLength(1);
  });

  it("conserve exactement le principe, les indications et les contre-indications de TECH-E1-01", () => {
    const technique = loadPedagogicalReferenceEV1().techniques[0];
    expect(technique.principle).toBe(techniquePrinciple);
    expect(technique.indications).toEqual(techniqueIndications);
    expect(technique.contraindications).toEqual(techniqueContraindications);
  });

  it("ne transforme ni TEST-E1-01 ni E1 en sélection automatique de TECH-E1-01", () => {
    const test = loadPedagogicalReferenceEV1().diagnosticTests[0];
    const competence = loadPedagogicalReferenceEV1().competences[0];
    expect(test).not.toHaveProperty("pedagogicalTechniqueId");
    expect(test).not.toHaveProperty("selectedTechniqueId");
    expect(competence).not.toHaveProperty("pedagogicalTechniqueId");
    expect(competence).not.toHaveProperty("selectedTechniqueId");
    expect(techniquesFile.items).toHaveLength(1);
  });

  it("résout E1 et TEST-E1-01 sans référence cassée, quel que soit l’ordre des fichiers", () => {
    expect(loadPedagogicalCatalog(pedagogicalReferenceEV1Files)).toEqual(expect.objectContaining({
      success: true,
      diagnostics: [],
    }));
    expect(loadPedagogicalCatalog([diagnosticTestsFile, competencesFile])).toEqual(expect.objectContaining({
      success: true,
      diagnostics: [],
    }));
    expect(loadPedagogicalCatalog([techniquesFile, diagnosticTestsFile, competencesFile])).toEqual(expect.objectContaining({
      success: true,
      diagnostics: [],
    }));
  });

  it("reste isolé de React, Expo, SQLite, du moteur v1 et de tout contenu D", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const sources = ["index.ts", "competences.json", "diagnostic-tests.json", "techniques.json", "exercises.json"]
      .map((name) => readFileSync(resolve(directory, name), "utf8")).join("\n");
    expect(sources).not.toMatch(/from\s+["'][^"']*(react|expo|sqlite|repositor|CoachingCycle|TechnicalHypothesis|Recommendation|TrainingDrill)/i);
    expect(sources).not.toMatch(/competence-d[3456]|TEST-D4-01|technique-d4-01|exercise-d4-01/);
  });
});
