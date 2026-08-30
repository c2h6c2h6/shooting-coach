import { describe, expect, it } from "vitest";
import { resolvePedagogicalV2PilotFlag } from "./featureFlags";

describe("PEDAGOGICAL_V2_PILOT", () => {
  it("reste désactivé par défaut", () => {
    expect(resolvePedagogicalV2PilotFlag(undefined)).toBe(false);
    expect(resolvePedagogicalV2PilotFlag("")).toBe(false);
    expect(resolvePedagogicalV2PilotFlag("false")).toBe(false);
  });

  it("ne s’active que par la valeur explicite true", () => {
    expect(resolvePedagogicalV2PilotFlag("true")).toBe(true);
    expect(resolvePedagogicalV2PilotFlag("TRUE")).toBe(false);
    expect(resolvePedagogicalV2PilotFlag("1")).toBe(false);
  });
});
