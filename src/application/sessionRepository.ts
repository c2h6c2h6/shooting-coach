import {
  Session,
  SessionDraft,
  TargetTypeReference,
  WeaponReference,
} from "../domain/session";

export interface SessionRepository {
  list(): Promise<Session[]>;
  listByProfile(profileId: string): Promise<Session[]>;
  getById(id: string): Promise<Session | null>;
  create(draft: SessionDraft): Promise<Session>;
  start(id: string): Promise<Session>;
  complete(id: string): Promise<Session>;
  listWeapons(): Promise<WeaponReference[]>;
  listTargetTypes(): Promise<TargetTypeReference[]>;
}
