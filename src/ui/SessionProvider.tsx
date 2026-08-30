import { randomUUID } from "expo-crypto";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useMemo,
  useState,
} from "react";
import { SessionRepository } from "../application/sessionRepository";
import {
  Session,
  SessionDraft,
  TargetTypeReference,
  WeaponReference,
} from "../domain/session";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteSessionRepository } from "../infrastructure/sessions/sqliteSessionRepository";

interface SessionService {
  pendingDraft: SessionDraft | null;
  setPendingDraft(draft: SessionDraft | null): void;
  getReferences(): Promise<{ weapons: WeaponReference[]; targetTypes: TargetTypeReference[] }>;
  createPending(): Promise<Session>;
  createAndStart(draft: SessionDraft): Promise<Session>;
  listByProfile(profileId: string): Promise<Session[]>;
  getById(id: string): Promise<Session | null>;
  start(id: string): Promise<Session>;
  complete(id: string): Promise<Session>;
}

const SessionContext = createContext<SessionService | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  const [pendingDraft, setPendingDraft] = useState<SessionDraft | null>(null);
  const repository = useMemo<Promise<SessionRepository>>(
    () => getDatabase().then((db) => new SqliteSessionRepository(db, randomUUID)),
    [],
  );
  const value = useMemo<SessionService>(
    () => ({
      pendingDraft,
      setPendingDraft,
      async getReferences() {
        const repo = await repository;
        const [weapons, targetTypes] = await Promise.all([
          repo.listWeapons(),
          repo.listTargetTypes(),
        ]);
        return { weapons, targetTypes };
      },
      async createPending() {
        if (!pendingDraft) throw new Error("Aucun brouillon de séance.");
        return (await repository).create(pendingDraft);
      },
      async createAndStart(draft) {
        const repo = await repository;
        const pending = await repo.create(draft);
        return repo.start(pending.id);
      },
      async listByProfile(profileId) {
        return (await repository).listByProfile(profileId);
      },
      async getById(id) {
        return (await repository).getById(id);
      },
      async start(id) {
        return (await repository).start(id);
      },
      async complete(id) {
        return (await repository).complete(id);
      },
    }),
    [pendingDraft, repository],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessions(): SessionService {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSessions doit être utilisé dans SessionProvider.");
  return value;
}
