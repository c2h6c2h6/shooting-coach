export function resolvePedagogicalV2PilotFlag(value: string | undefined): boolean {
  return value === "true";
}

/** Explicit build-time opt-in. Undefined, empty, or any value other than "true" keeps the pilot disabled. */
export const PEDAGOGICAL_V2_PILOT = resolvePedagogicalV2PilotFlag(
  process.env.EXPO_PUBLIC_PEDAGOGICAL_V2_PILOT,
);
