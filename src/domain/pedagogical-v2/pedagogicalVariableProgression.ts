import {
  pedagogicalVariableKeys,
  type PedagogicalVariableKey,
  type PedagogicalVariables,
} from "./contracts";
import type { EffectivePedagogicalVariablesSnapshot } from "./decisionContracts";

export const pedagogicalVariableChangeKinds = ["added", "removed", "modified"] as const;
export type PedagogicalVariableChangeKind = (typeof pedagogicalVariableChangeKinds)[number];

export const pedagogicalVariablesMetadataKeys = ["snapshotSchemaVersion", "variablesSchemaVersion"] as const;
export type PedagogicalVariablesMetadataKey = (typeof pedagogicalVariablesMetadataKeys)[number];

export const l1PlusValidationStatuses = [
  "no_variable_change",
  "compatible_single_change",
  "multiple_changes",
  "not_comparable",
] as const;
export type L1PlusValidationStatus = (typeof l1PlusValidationStatuses)[number];

/** Read-only comparison view. It permits absent values without defining a new variables contract. */
export type PedagogicalVariablesComparisonInput = Readonly<
  Omit<EffectivePedagogicalVariablesSnapshot, "values"> & {
    readonly values: Readonly<Partial<PedagogicalVariables>>;
  }
>;

export interface PedagogicalVariableChange {
  readonly key: PedagogicalVariableKey;
  readonly previousValue: unknown;
  readonly nextValue: unknown;
  readonly kind: PedagogicalVariableChangeKind;
  readonly interpretable: true;
}

export interface PedagogicalVariablesMetadataChange {
  readonly key: PedagogicalVariablesMetadataKey;
  readonly previousValue: string;
  readonly nextValue: string;
}

export interface PedagogicalVariableChangeAnalysis {
  readonly comparisonStatus: "comparable" | "not_comparable";
  readonly changedVariableCount: number | null;
  readonly changes: readonly PedagogicalVariableChange[];
  readonly nonComparableVariableKeys: readonly PedagogicalVariableKey[];
  readonly metadataChanges: readonly PedagogicalVariablesMetadataChange[];
}

export interface L1PlusValidationResult {
  readonly status: L1PlusValidationStatus;
  readonly compatibleWithNormalL1Plus: boolean | null;
  readonly representsVariableProgression: boolean | null;
  /** 4D does not assess whether the resulting pedagogical configuration is valid. */
  readonly configurationValidity: "not_assessed";
  readonly analysis: PedagogicalVariableChangeAnalysis;
}

type CanonicalValue = { readonly comparable: true; readonly value: string } | { readonly comparable: false };

function canonicalize(value: unknown, ancestors = new Set<object>()): CanonicalValue {
  if (value === undefined) return { comparable: true, value: "undefined" };
  if (value === null) return { comparable: true, value: "null" };
  if (typeof value === "string") return { comparable: true, value: `string:${JSON.stringify(value)}` };
  if (typeof value === "boolean") return { comparable: true, value: `boolean:${value}` };
  if (typeof value === "number") return Number.isFinite(value)
    ? { comparable: true, value: `number:${Object.is(value, -0) ? "-0" : value}` }
    : { comparable: false };
  if (typeof value !== "object") return { comparable: false };
  if (ancestors.has(value)) return { comparable: false };

  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) return { comparable: false };
  if (Reflect.ownKeys(value).some((key) => typeof key === "symbol")) return { comparable: false };

  ancestors.add(value);
  const result = Array.isArray(value)
    ? canonicalizeArray(value, ancestors)
    : canonicalizeRecord(value as Record<string, unknown>, ancestors);
  ancestors.delete(value);
  return result;
}

function canonicalizeArray(value: readonly unknown[], ancestors: Set<object>): CanonicalValue {
  const items: string[] = [];
  for (const item of value) {
    const canonical = canonicalize(item, ancestors);
    if (!canonical.comparable) return canonical;
    items.push(canonical.value);
  }
  return { comparable: true, value: `array:[${items.join(",")}]` };
}

function canonicalizeRecord(value: Record<string, unknown>, ancestors: Set<object>): CanonicalValue {
  const entries: string[] = [];
  for (const key of Object.keys(value).sort()) {
    const canonical = canonicalize(value[key], ancestors);
    if (!canonical.comparable) return canonical;
    entries.push(`${JSON.stringify(key)}:${canonical.value}`);
  }
  return { comparable: true, value: `object:{${entries.join(",")}}` };
}

function changeKind(previousValue: unknown, nextValue: unknown): PedagogicalVariableChangeKind {
  if (previousValue === undefined) return "added";
  if (nextValue === undefined) return "removed";
  return "modified";
}

/** Compares effective values by value and reports snapshot-version changes separately. */
export function comparePedagogicalVariables(
  previous: PedagogicalVariablesComparisonInput,
  next: PedagogicalVariablesComparisonInput,
): PedagogicalVariableChangeAnalysis {
  const changes: PedagogicalVariableChange[] = [];
  const nonComparableVariableKeys: PedagogicalVariableKey[] = [];

  for (const key of pedagogicalVariableKeys) {
    const previousValue: unknown = previous.values[key];
    const nextValue: unknown = next.values[key];
    const previousCanonical = canonicalize(previousValue);
    const nextCanonical = canonicalize(nextValue);
    if (!previousCanonical.comparable || !nextCanonical.comparable) {
      nonComparableVariableKeys.push(key);
    } else if (previousCanonical.value !== nextCanonical.value) {
      changes.push({ key, previousValue, nextValue, kind: changeKind(previousValue, nextValue), interpretable: true });
    }
  }

  const metadataChanges: PedagogicalVariablesMetadataChange[] = [];
  for (const key of pedagogicalVariablesMetadataKeys) {
    if (previous[key] !== next[key]) metadataChanges.push({ key, previousValue: previous[key], nextValue: next[key] });
  }

  const comparable = nonComparableVariableKeys.length === 0;
  return {
    comparisonStatus: comparable ? "comparable" : "not_comparable",
    changedVariableCount: comparable ? changes.length : null,
    changes,
    nonComparableVariableKeys,
    metadataChanges,
  };
}

/** Applies only the structural L1+ rule; it never assesses difficulty or global pedagogical validity. */
export function validateL1PlusProgression(
  previous: PedagogicalVariablesComparisonInput,
  next: PedagogicalVariablesComparisonInput,
): L1PlusValidationResult {
  const analysis = comparePedagogicalVariables(previous, next);
  if (analysis.changedVariableCount === null) return {
    status: "not_comparable",
    compatibleWithNormalL1Plus: null,
    representsVariableProgression: null,
    configurationValidity: "not_assessed",
    analysis,
  };
  if (analysis.changedVariableCount === 0) return {
    status: "no_variable_change",
    compatibleWithNormalL1Plus: true,
    representsVariableProgression: false,
    configurationValidity: "not_assessed",
    analysis,
  };
  if (analysis.changedVariableCount === 1) return {
    status: "compatible_single_change",
    compatibleWithNormalL1Plus: true,
    representsVariableProgression: true,
    configurationValidity: "not_assessed",
    analysis,
  };
  return {
    status: "multiple_changes",
    compatibleWithNormalL1Plus: false,
    representsVariableProgression: true,
    configurationValidity: "not_assessed",
    analysis,
  };
}
