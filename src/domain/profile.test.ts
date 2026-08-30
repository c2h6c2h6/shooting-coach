import { describe, expect, it } from "vitest";
import { ShooterProfileDraft, validateProfile } from "./profile";

const validDraft: ShooterProfileDraft = {
  displayName: "Alex",
  laterality: "left",
  declaredLevel: "beginner",
  primaryWeapon: "glock-19",
};

describe("validateProfile", () => {
  it("accepte un profil complet", () => {
    expect(validateProfile(validDraft)).toEqual({});
  });

  it("refuse une latéralité absente", () => {
    expect(validateProfile({ ...validDraft, laterality: null }).laterality).toBe(
      "La latéralité est obligatoire pour toute analyse.",
    );
  });

  it("refuse un nom trop court", () => {
    expect(validateProfile({ ...validDraft, displayName: " " }).displayName).toBe(
      "Saisissez au moins 2 caractères.",
    );
  });
});
