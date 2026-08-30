import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  APP_OPENING_ANIMATION_DURATION_MS,
  APP_OPENING_BRAND,
  APP_OPENING_BRAND_CHARACTERS,
  APP_OPENING_FINAL_HOLD_MS,
  APP_OPENING_INITIAL_HOLD_MS,
  APP_OPENING_SAFETY_RULES,
  APP_OPENING_SPLIT_FLAP_DURATION_MS,
  APP_OPENING_SPLIT_FLAP_SEQUENCES,
} from "./appOpeningContent";

describe("app opening C2H6 / ACDC", () => {
  it("conserve l'identité finale et les quatre règles exactes", () => {
    expect(APP_OPENING_BRAND).toBe("C2H6 / ACDC");
    expect(APP_OPENING_SAFETY_RULES).toEqual([
      { keyword: "Arme", statement: "Une arme est toujours chargée" },
      { keyword: "Canon", statement: "Vers la cible ou la zone la plus sûre" },
      { keyword: "Doigt", statement: "Doigt haut tant que je ne tire pas" },
      { keyword: "Cible", statement: "Je suis responsable de mon tir et de ses conséquences" },
    ]);
  });

  it("conserve C2H6 puis ACDC pendant les durées demandées", () => {
    expect(APP_OPENING_INITIAL_HOLD_MS).toBe(1_200);
    expect(APP_OPENING_SPLIT_FLAP_DURATION_MS).toBe(1_310);
    expect(APP_OPENING_FINAL_HOLD_MS).toBe(1_200);
    expect(APP_OPENING_ANIMATION_DURATION_MS).toBe(3_710);
  });

  it("individualise l'identité finale dans neuf compartiments", () => {
    expect(APP_OPENING_BRAND_CHARACTERS).toEqual(["C", "2", "H", "6", "/", "A", "C", "D", "C"]);
    expect(APP_OPENING_BRAND_CHARACTERS.join("")).toBe("C2H6/ACDC");
  });

  it("affiche 2 et 6 comme des chiffres normaux sans style d'indice", () => {
    const screen = readFileSync(resolve(process.cwd(), "src/ui/AppOpeningScreen.tsx"), "utf8");
    const content = readFileSync(resolve(process.cwd(), "src/ui/appOpeningContent.ts"), "utf8");
    expect(`${screen}\n${content}`).not.toMatch(/[₂₆]/u);
    expect(screen).not.toContain("fontVariant");
    expect(screen).not.toContain("translateY");
    expect(screen).not.toMatch(/subscript/i);
  });

  it("fait chercher chaque volet avant un figement progressif sur ACDC", () => {
    expect(APP_OPENING_SPLIT_FLAP_SEQUENCES.map((sequence) => sequence[0])).toEqual(["C", "2", "H", "6"]);
    expect(APP_OPENING_SPLIT_FLAP_SEQUENCES.map((sequence) => sequence.at(-1))).toEqual(["A", "C", "D", "C"]);
    APP_OPENING_SPLIT_FLAP_SEQUENCES.forEach((sequence) => {
      expect(sequence.length).toBeGreaterThanOrEqual(6);
      expect(new Set(sequence.slice(1, -1)).size).toBeGreaterThanOrEqual(4);
    });
  });

  it("utilise uniquement l'animation React Native et propose l'accès explicite", () => {
    const source = readFileSync(resolve(process.cwd(), "src/ui/AppOpeningScreen.tsx"), "utf8");
    expect(source).toContain("Animated.timing");
    expect(source).toContain("useNativeDriver: true");
    expect(source).toContain("rotateX");
    expect(source).toContain("FLAP_STAGGER_MS");
    expect(source).toContain("<SplitFlapCell");
    expect(source).toContain("Entrer dans l’application");
    expect(source).toContain("Passer");
    expect(source).not.toContain("Comprendre. Décider. Agir.");
    expect(source).not.toMatch(/lottie|reanimated/i);
  });

  it("précède l'accueil sans créer de nouvelle route métier", () => {
    const home = readFileSync(resolve(process.cwd(), "app/index.tsx"), "utf8");
    expect(home).toContain("openingSeenThisLaunch");
    expect(home).toContain("<AppOpeningScreen");
    expect(home).toContain("headerShown: false");
    expect(home).toContain("Démarrer une séance");
  });
});
