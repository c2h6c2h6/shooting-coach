import { describe, expect, it } from "vitest";
import { SessionDraft, validateSessionDraft } from "./session";

const valid: SessionDraft = {
  shooterProfileId: "profile-1",
  mode: "coaching_free",
  weaponId: "glock-19",
  distanceMm: 7000,
  numberOfHands: 2,
  targetTypeId: "generic-centered",
};

describe("validateSessionDraft", () => {
  it("accepte un coaching libre sans objectif", () => {
    expect(validateSessionDraft(valid)).toEqual({});
  });

  it("refuse une séance sans profil", () => {
    expect(validateSessionDraft({ ...valid, shooterProfileId: null }).shooterProfileId).toBeDefined();
  });

  it("accepte un entraînement avec objectif libre", () => {
    expect(validateSessionDraft({ ...valid, mode: "training", objectiveLabel: "Détente" })).toEqual({});
  });

  it("refuse un entraînement sans objectif ni compétence", () => {
    expect(validateSessionDraft({ ...valid, mode: "training" }).objectiveLabel).toBeDefined();
  });

  it("accepte une distance standard et une distance personnalisée entière", () => {
    expect(validateSessionDraft({ ...valid, distanceMm: 25000 })).toEqual({});
    expect(validateSessionDraft({ ...valid, distanceMm: 12500 })).toEqual({});
  });

  it("refuse les distances nulles, négatives ou incohérentes", () => {
    for (const distanceMm of [null, -1000, 0, 100001, 7500.5]) {
      expect(validateSessionDraft({ ...valid, distanceMm }).distanceMm).toBeDefined();
    }
  });

  it("accepte uniquement 1 ou 2 mains pour une nouvelle séance", () => {
    expect(validateSessionDraft({ ...valid, numberOfHands: 1 })).toEqual({});
    expect(validateSessionDraft({ ...valid, numberOfHands: 2 })).toEqual({});
    expect(validateSessionDraft({ ...valid, numberOfHands: 3 as 1 }).numberOfHands).toBeDefined();
  });
});
