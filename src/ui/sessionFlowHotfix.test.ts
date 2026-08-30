import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { Impact } from "../domain/impact";
import type { ShooterProfile } from "../domain/profile";
import type { Session } from "../domain/session";
import type { Series } from "../domain/series";
import {
  analyzeSeries,
  requiresRecordedShotCountConfirmation,
  suggestedRecordedShotCount,
} from "./analyzeSeriesFlow";
import {
  buildQuickSessionDraft,
  QUICK_SESSION_DEFAULT_DISTANCE_MM,
  resolveNumberOfHandsPrefill,
  startSessionAndOpenUsefulScreen,
} from "./quickSessionFlow";

const timestamp = "2026-08-24T10:00:00.000Z";
const profile: ShooterProfile = {
  id: "profile-1",
  displayName: "John",
  laterality: "right",
  declaredLevel: "beginner",
  primaryWeapon: "glock-48",
  createdAt: timestamp,
  updatedAt: timestamp,
};
const references = {
  weapons: [{ id: "glock-19", name: "Glock 19", active: true }, { id: "glock-48", name: "Glock 48", active: true }],
  targetTypes: [{ id: "generic", name: "Cible générique", active: true, widthMm: null, heightMm: null }],
};
const session: Session = {
  id: "session-1",
  shooterProfileId: profile.id,
  mode: "coaching_free",
  weaponId: "glock-48",
  distanceMm: 7000,
  numberOfHands: 2,
  targetTypeId: "generic",
  objectiveLabel: null,
  selectedSkillId: null,
  shooterDisplayName: profile.displayName,
  shooterLaterality: profile.laterality,
  weaponName: "Glock 48",
  targetTypeName: "Cible générique",
  targetWidthMm: null,
  targetHeightMm: null,
  status: "active",
  startedAt: timestamp,
  completedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const referenceSeries: Series = {
  id: "series-1",
  sessionId: session.id,
  sequenceNumber: 1,
  type: "reference",
  expectedShotCount: 5,
  instruction: "Réalisez cette série pour observer votre niveau du jour.",
  status: "planned",
  recordedShotCount: 0,
  startedAt: null,
  completedAt: null,
  createdAt: timestamp,
  updatedAt: timestamp,
};
const impacts = Array.from({ length: 5 }, (_, index): Impact => ({
  id: `impact-${index + 1}`,
  seriesId: referenceSeries.id,
  sequenceNumber: index + 1,
  normalizedX: 0.45 + index * 0.01,
  normalizedY: 0.5,
  source: "manual",
  isExcluded: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}));

describe("hotfix UX 9B — démarrage rapide", () => {
  it("construit un coaching libre valide avec l’arme du profil et les valeurs par défaut", () => {
    expect(buildQuickSessionDraft(profile, references, [])).toEqual({
      shooterProfileId: "profile-1",
      mode: "coaching_free",
      weaponId: "glock-48",
      distanceMm: QUICK_SESSION_DEFAULT_DISTANCE_MM,
      numberOfHands: 2,
      targetTypeId: "generic",
      objectiveLabel: null,
      selectedSkillId: null,
    });
  });

  it("réutilise les derniers paramètres compatibles connus", () => {
    const previous = { ...session, weaponId: "glock-19", distanceMm: 15000, numberOfHands: 1 as const };
    expect(buildQuickSessionDraft(profile, references, [previous])).toMatchObject({
      weaponId: "glock-19",
      distanceMm: 15000,
      numberOfHands: 1,
      targetTypeId: "generic",
    });
  });

  it("trace exactement la provenance du préremplissage numberOfHands", () => {
    expect(resolveNumberOfHandsPrefill(references, [])).toEqual({
      value: 2, source: "default", sourceSessionId: null,
    });
    expect(resolveNumberOfHandsPrefill(references, [{ ...session, id: "one", numberOfHands: 1 }])).toEqual({
      value: 1, source: "previous_compatible_session", sourceSessionId: "one",
    });
    expect(resolveNumberOfHandsPrefill(references, [{ ...session, id: "two", numberOfHands: 2 }])).toEqual({
      value: 2, source: "previous_compatible_session", sourceSessionId: "two",
    });
    expect(resolveNumberOfHandsPrefill(references, [{ ...session, id: "legacy", numberOfHands: null }])).toEqual({
      value: 2, source: "default", sourceSessionId: null,
    });
  });

  it("n’hérite pas 1 main d’une séance dont les références ne sont plus compatibles", () => {
    const incompatible = { ...session, id: "obsolete", weaponId: "removed", numberOfHands: 1 as const };
    expect(buildQuickSessionDraft(profile, references, [incompatible])?.numberOfHands).toBe(2);
    expect(resolveNumberOfHandsPrefill(references, [incompatible]).source).toBe("default");
  });

  it("crée et active séance et série avant d’ouvrir directement les impacts", async () => {
    const createAndStart = vi.fn().mockResolvedValue(session);
    const listBySession = vi.fn().mockResolvedValue([referenceSeries]);
    const active = { ...referenceSeries, status: "active" as const, startedAt: timestamp };
    const startSeries = vi.fn().mockResolvedValue(active);
    const outcome = await startSessionAndOpenUsefulScreen({
      shooterProfileId: profile.id,
      mode: "coaching_free",
      weaponId: "glock-48",
      distanceMm: 7000,
      numberOfHands: 2,
      targetTypeId: "generic",
    }, { createAndStart, listBySession, startSeries });
    expect(createAndStart).toHaveBeenCalledOnce();
    expect(startSeries).toHaveBeenCalledWith(referenceSeries.id);
    expect(outcome.destination).toBe("/sessions/session-1/series/series-1/impacts");
  });

  it("reste robuste lorsqu’aucune série de référence n’existe", async () => {
    const outcome = await startSessionAndOpenUsefulScreen({
      shooterProfileId: profile.id, mode: "training", weaponId: "glock-48",
      distanceMm: 7000, numberOfHands: 2, targetTypeId: "generic", objectiveLabel: "TEST/FIXTURE",
    }, {
      createAndStart: vi.fn().mockResolvedValue({ ...session, mode: "training" }),
      listBySession: vi.fn().mockResolvedValue([]),
      startSeries: vi.fn(),
    });
    expect(outcome.referenceSeries).toBeNull();
    expect(outcome.destination).toBe("/sessions/session-1");
  });
});

describe("hotfix UX 9B — analyse en une action", () => {
  it("déclare automatiquement 5 coups pour 5 impacts inclus", () => {
    expect(requiresRecordedShotCountConfirmation({ ...referenceSeries, status: "active" }, impacts)).toBe(false);
    expect(suggestedRecordedShotCount({ ...referenceSeries, status: "active" }, impacts)).toBe(5);
  });

  it("demande une confirmation pour un mismatch ou un impact exclu", () => {
    expect(requiresRecordedShotCountConfirmation(referenceSeries, impacts.slice(0, 4))).toBe(true);
    expect(requiresRecordedShotCountConfirmation(referenceSeries, [
      { ...impacts[0], isExcluded: true, exclusionReason: "TEST/FIXTURE" }, ...impacts.slice(1),
    ])).toBe(true);
  });

  it("sauvegarde, finalise et produit les résultats dans l’ordre", async () => {
    const calls: string[] = [];
    const completed = { ...referenceSeries, status: "completed" as const, recordedShotCount: 5, completedAt: timestamp };
    const result = await analyzeSeries({ series: { ...referenceSeries, status: "active" }, impacts, recordedShotCount: 5 }, {
      saveImpacts: async () => { calls.push("impacts"); },
      invalidateMetrics: async () => { calls.push("invalidate"); },
      completeSeries: async (_id, count) => { calls.push(`complete:${count}`); return completed; },
      calculateMetrics: async () => { calls.push("metrics"); },
      generateObservations: async () => { calls.push("observations"); },
      generateHypotheses: async () => { calls.push("hypotheses"); },
    });
    expect(calls).toEqual(["impacts", "invalidate", "complete:5", "metrics", "observations", "hypotheses"]);
    expect(result).toBe(completed);
  });

  it("ne mute pas les impacts fournis", async () => {
    const original = impacts.map((impact) => ({ ...impact }));
    await analyzeSeries({ series: { ...referenceSeries, status: "active" }, impacts, recordedShotCount: 5 }, {
      saveImpacts: async (_id, values) => { values[0].normalizedX = 0; },
      invalidateMetrics: async () => undefined,
      completeSeries: async () => ({ ...referenceSeries, status: "completed" }),
      calculateMetrics: async () => undefined,
      generateObservations: async () => undefined,
      generateHypotheses: async () => undefined,
    });
    expect(impacts).toEqual(original);
  });
});

describe("hotfix UX 9B — garde-fous de présentation", () => {
  const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

  it("rend le démarrage direct et la modification des paramètres accessibles sans récapitulatif", () => {
    const home = source("app/index.tsx");
    const configuration = source("app/sessions/new.tsx");
    expect(home).toContain("Démarrer une séance");
    expect(home).toContain("Modifier");
    expect(home).not.toContain("/sessions/review");
    expect(configuration).not.toContain("setPendingDraft");
    expect(configuration).not.toContain("Vérifier avant d’enregistrer");
  });

  it("présente une seule action d’analyse et ne confirme que les cas ambigus", () => {
    const screen = source("app/sessions/[id]/series/[seriesId]/impacts.tsx");
    expect(screen).toContain("Analyser la série");
    expect(screen).toContain("requiresRecordedShotCountConfirmation");
    expect(screen).not.toContain("Confirmer la saisie");
  });

  it("affiche la synthèse et l’outlier avant les mesures détaillées sans modifier le moteur", () => {
    const screen = source("app/sessions/[id]/series/[seriesId].tsx");
    expect(screen.indexOf("<ObservationSection")).toBeLessThan(screen.indexOf("<ObjectiveResults"));
    expect(screen).toContain("Impact isolé à vérifier");
    expect(screen).toContain("Voir les mesures détaillées");
    expect(screen).not.toContain("supportingMetrics")
  });

  it("remplace le titre de route technique par un titre utilisateur", () => {
    const layout = source("app/_layout.tsx");
    expect(layout).toContain('name="sessions/[id]/index" options={{ title: "Séance" }}');
  });

  it("traduit le pilote, explique les blocages et masque les sorties techniques", () => {
    const pilot = source("app/sessions/[id]/series/[seriesId]/pedagogical-v2-pilot.tsx");
    expect(pilot).toContain("Le test apporte une information");
    expect(pilot).toContain("Le test ne permet pas de départager");
    expect(pilot).toContain("Impossible de conclure");
    expect(pilot).toContain("Pour continuer :");
    expect(pilot).not.toContain("Variables par défaut");
    expect(pilot).not.toContain("Variables modifiables");
    expect(pilot).not.toContain("JSON.stringify");
    expect(pilot).not.toContain("Aucun MasteryEvent");
    expect(pilot).not.toContain("Confirmez explicitement MAINTAIN");
  });
});
