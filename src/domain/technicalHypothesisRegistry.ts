import {
  observationHypothesisMappings,
  type ObservationHypothesisMapping,
} from "./observationHypothesisMappings";
import type { HypothesisCode } from "./technicalHypothesisCatalog";

export type HypothesisRegistryStatus =
  | "active_with_source"
  | "historical_alias"
  | "reserved_without_source"
  | "orphan_or_incoherent";

export interface ActiveHypothesisSource {
  readonly kind: "single_series_observation";
  /** Exact mapping objects consumed by `generateTechnicalHypotheses`. */
  readonly mappings: readonly ObservationHypothesisMapping[];
}

export interface HypothesisRegistryEntry {
  readonly code: HypothesisCode;
  readonly status: HypothesisRegistryStatus;
  readonly activeSources: readonly ActiveHypothesisSource[];
}

const activeWithSingleSeriesSource = new Set<HypothesisCode>([
  "LATERAL_TRIGGER_PRESSURE", "INCONSISTENT_TRIGGER_PRESS", "SHOT_ANTICIPATION",
  "INCONSISTENT_GRIP_PRESSURE", "WRIST_INSTABILITY", "SIGHT_ALIGNMENT_VARIATION",
  "SIGHT_PICTURE_VARIATION", "EXCESSIVE_AIMING_TIME", "UNSTABLE_STANCE", "POSTURAL_SWAY",
  "BREATHING_DISRUPTION", "ATTENTION_LOSS", "ABRUPT_TRIGGER_PRESS",
  "EQUIPMENT_OR_SIGHT_ISSUE", "TWO_HAND_CONTRIBUTION",
]);

const historicalAliases = new Set<HypothesisCode>([
  "TRIGGER_FINGER_TOO_LITTLE", "TRIGGER_FINGER_TOO_DEEP",
  "PUSHING_AGAINST_RECOIL", "FLINCH_RESPONSE",
  "DOMINANT_HAND_OVERGRIP", "TRIGGER_HAND_TENSION", "UNBALANCED_HAND_PRESSURE",
]);

const comparisonOnly = new Set<HypothesisCode>([
  "GRIP_CHANGES_BETWEEN_SHOTS", "INCONSISTENT_BODY_POSITION",
  "LOSS_OF_TECHNIQUE_DURING_SERIES", "FATIGUE",
]);

const comparisonObservationCodes = new Set([
  "GROUP_WIDER", "SHAPE_CHANGED", "NO_NOTABLE_CHANGE",
]);

function sourcesFor(code: HypothesisCode): readonly ActiveHypothesisSource[] {
  if (!activeWithSingleSeriesSource.has(code)) return [];
  return [{ kind: "single_series_observation", mappings: observationHypothesisMappings
    .filter((mapping) => mapping.hypothesis === code && !comparisonObservationCodes.has(mapping.observation))
  }];
}

export function createTechnicalHypothesisRegistry(
  codes: readonly HypothesisCode[],
): Record<HypothesisCode, HypothesisRegistryEntry> {
  return Object.fromEntries(codes.map((code) => [code, {
      code,
      status: historicalAliases.has(code) ? "historical_alias"
        : activeWithSingleSeriesSource.has(code) ? "active_with_source"
          : "reserved_without_source",
      activeSources: sourcesFor(code),
    }])) as Record<HypothesisCode, HypothesisRegistryEntry>;
}

export function isActiveGeneratedHypothesis(
  registry: Record<HypothesisCode, HypothesisRegistryEntry>, code: HypothesisCode,
): boolean {
  const entry = registry[code];
  return entry.status === "active_with_source" && entry.activeSources.length > 0;
}

export const comparisonOnlyHypothesisCodes = comparisonOnly;
