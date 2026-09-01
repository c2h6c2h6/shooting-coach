import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { diagnosticQuestionCatalog } from "../domain/diagnosticQuestionCatalog";

const screen = readFileSync(
  resolve(process.cwd(), "app/sessions/[id]/series/[seriesId]/coaching.tsx"),
  "utf8",
);
const seriesScreen = readFileSync(
  resolve(process.cwd(), "app/sessions/[id]/series/[seriesId].tsx"),
  "utf8",
);
const provider = readFileSync(resolve(process.cwd(), "src/ui/CoachingProvider.tsx"), "utf8");

describe("orchestration factuelle du test de coaching", () => {
  it("route directement la reproductibilité vers le coaching causal", () => {
    expect(seriesScreen).toContain("Le décalage est reproductible. Nous allons maintenant vérifier ses causes possibles.");
    expect(seriesScreen).toContain("Examiner la première cause testable");
    expect(seriesScreen).toContain("onContinue={()=>router.push(`/sessions/${sessionId}/series/${series.id}/coaching`)}");
  });
  it("ne propose aucun statut de preuve avant la réalisation du test", () => {
    expect(screen).not.toContain("Renforce l’hypothèse");
    expect(screen).not.toContain("Renforce faiblement");
    expect(screen).not.toContain("Contredit");
  });

  it("affiche les observations factuelles seulement après Commencer le test", () => {
    expect(screen).toContain("Qu’avez-vous observé ?");
    expect(screen).toContain("test.observationCriteria.map");
  });

  it("persiste l’observation choisie et non un jugement saisi par l’utilisateur", () => {
    expect(provider).toContain("outcomeForTestObservation(test.testCode,h.hypothesisCode,observation)");
    expect(provider).toContain("observations:[...test.observations,observation]");
    expect(provider).toContain('status:"in_progress"');
  });

  it("restaure un résultat déjà calculé sans redemander l’observation", () => {
    expect(screen).toContain("setOutcome(x.test.outcome)");
    expect(screen).toContain("state&&!outcome");
  });
});

describe("confirmation de sécurité coordonnée", () => {
  it("réunit la sécurité générale et la sécurité à sec sous une seule action", () => {
    expect(screen).toContain("Sécurité avant le test");
    expect(screen).toContain("validateCombinedSafety");
    expect(screen).toContain(
      "Je confirme que les conditions de sécurité nécessaires à ce test sont réunies",
    );
  });

  it("conserve séparément la confirmation spécifique dans le run du test", () => {
    expect(provider).toContain("confirmedSpecificSafety:JSON.stringify(confirmedSafetyKeys)");
    expect(provider).toContain("saveSessionSafety(context)");
  });
});

describe("clarification subjective E1", () => {
  it("retire Non observé du ressenti FELT_TENSION", () => {
    expect(seriesScreen).toContain("question.code===\"FELT_TENSION\"");
    expect(seriesScreen).toContain("Non observé");
  });

  it("conserve Non observé pour les questions observationnelles", () => {
    expect(diagnosticQuestionCatalog.find((item) => item.code === "FRONT_SIGHT_CLEAR")?.textFr)
      .toContain("guidon");
    expect(seriesScreen).toContain("not_observed");
  });

  it("annonce explicitement la cause et le test sélectionnés", () => {
    expect(screen).toContain("Cause à vérifier");
    expect(screen).toContain("Test proposé");
  });

  it("nomme la prochaine cause après une hypothèse non soutenue", () => {
    expect(screen).toContain("Examiner ensuite : ${presentHypothesis(nextHypothesisCode).title}");
  });

  it("termine prudemment lorsqu’aucune autre piste n’est disponible", () => {
    expect(screen).toContain("Aucune autre piste testable n’est disponible pour cette série.");
    expect(screen).toContain("Le test courant pourra être repris ultérieurement.");
  });
});
