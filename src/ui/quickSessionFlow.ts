import type { ShooterProfile } from "../domain/profile";
import {
  validateSessionDraft,
  type Session,
  type SessionDraft,
  type TargetTypeReference,
  type WeaponReference,
} from "../domain/session";
import type { Series } from "../domain/series";

export const QUICK_SESSION_DEFAULT_DISTANCE_MM = 7000;

export interface QuickSessionReferences {
  readonly weapons: readonly WeaponReference[];
  readonly targetTypes: readonly TargetTypeReference[];
}

export interface QuickSessionOutcome {
  readonly session: Session;
  readonly referenceSeries: Series | null;
  readonly destination: `/sessions/${string}` | `/sessions/${string}/series/${string}/impacts`;
}

export interface NumberOfHandsPrefill {
  readonly value: 1 | 2;
  readonly source: "previous_compatible_session" | "default";
  readonly sourceSessionId: string | null;
}

function lastCompatibleSession(
  references: QuickSessionReferences,
  previousSessions: readonly Session[],
): Session | null {
  return previousSessions.find((session) =>
    session.mode === "coaching_free" &&
    references.weapons.some((weapon) => weapon.id === session.weaponId) &&
    references.targetTypes.some((target) => target.id === session.targetTypeId)) ?? null;
}

export function resolveNumberOfHandsPrefill(
  references: QuickSessionReferences,
  previousSessions: readonly Session[],
): NumberOfHandsPrefill {
  const previous = lastCompatibleSession(references, previousSessions);
  if (previous?.numberOfHands === 1 || previous?.numberOfHands === 2) {
    return { value: previous.numberOfHands, source: "previous_compatible_session", sourceSessionId: previous.id };
  }
  return { value: 2, source: "default", sourceSessionId: null };
}

export function buildQuickSessionDraft(
  profile: ShooterProfile,
  references: QuickSessionReferences,
  previousSessions: readonly Session[],
): SessionDraft | null {
  const previous = lastCompatibleSession(references, previousSessions);
  const numberOfHandsPrefill = resolveNumberOfHandsPrefill(references, previousSessions);
  const weaponId = [previous?.weaponId, profile.primaryWeapon, references.weapons[0]?.id]
    .find((id) => Boolean(id && references.weapons.some((weapon) => weapon.id === id))) ?? null;
  const targetTypeId = [previous?.targetTypeId, references.targetTypes[0]?.id]
    .find((id) => Boolean(id && references.targetTypes.some((target) => target.id === id))) ?? null;
  const draft: SessionDraft = {
    shooterProfileId: profile.id,
    mode: "coaching_free",
    weaponId,
    distanceMm: previous?.distanceMm ?? QUICK_SESSION_DEFAULT_DISTANCE_MM,
    numberOfHands: numberOfHandsPrefill.value,
    targetTypeId,
    objectiveLabel: null,
    selectedSkillId: null,
  };
  return Object.keys(validateSessionDraft(draft)).length === 0 ? draft : null;
}

export async function startSessionAndOpenUsefulScreen(
  draft: SessionDraft,
  dependencies: {
    createAndStart(value: SessionDraft): Promise<Session>;
    listBySession(sessionId: string): Promise<Series[]>;
    startSeries(seriesId: string): Promise<Series>;
  },
): Promise<QuickSessionOutcome> {
  const session = await dependencies.createAndStart(draft);
  const reference = (await dependencies.listBySession(session.id))
    .find((series) => series.type === "reference") ?? null;
  if (!reference) return {
    session,
    referenceSeries: null,
    destination: `/sessions/${session.id}`,
  };
  const activeReference = reference.status === "planned"
    ? await dependencies.startSeries(reference.id)
    : reference;
  return {
    session,
    referenceSeries: activeReference,
    destination: `/sessions/${session.id}/series/${activeReference.id}/impacts`,
  };
}
