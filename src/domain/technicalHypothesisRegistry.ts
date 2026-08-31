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

export type ReservedHypothesisRole =
  | "comparative_grip_manifestation"
  | "mastery_robustness_indicator"
  | "contextual_non_technical"
  | "out_of_scope";

export interface ActiveHypothesisSource {
  readonly kind: "single_series_observation";
  /** Exact mapping objects consumed by `generateTechnicalHypotheses`. */
  readonly mappings: readonly ObservationHypothesisMapping[];
}

export interface HypothesisRegistryEntry {
  readonly code: HypothesisCode;
  readonly status: HypothesisRegistryStatus;
  readonly activeSources: readonly ActiveHypothesisSource[];
  readonly reservedRole?: ReservedHypothesisRole;
}

const activeWithSingleSeriesSource = new Set<HypothesisCode>([
  "LATERAL_TRIGGER_PRESSURE", "SHOT_ANTICIPATION",
  "INCONSISTENT_GRIP_PRESSURE", "WRIST_INSTABILITY", "SIGHT_ALIGNMENT_VARIATION",
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

const reservedRoles: Partial<Record<HypothesisCode, ReservedHypothesisRole>> = {
  GRIP_CHANGES_BETWEEN_SHOTS: "comparative_grip_manifestation",
  LOSS_OF_TECHNIQUE_DURING_SERIES: "mastery_robustness_indicator",
  INCONSISTENT_BODY_POSITION: "contextual_non_technical",
  FATIGUE: "out_of_scope",
};

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
      ...(reservedRoles[code] === undefined ? {} : { reservedRole: reservedRoles[code] }),
    }])) as Record<HypothesisCode, HypothesisRegistryEntry>;
}

export function isActiveGeneratedHypothesis(
  registry: Record<HypothesisCode, HypothesisRegistryEntry>, code: HypothesisCode,
): boolean {
  const entry = registry[code];
  return entry.status === "active_with_source" && entry.activeSources.length > 0;
}

export const comparisonOnlyHypothesisCodes = comparisonOnly;
