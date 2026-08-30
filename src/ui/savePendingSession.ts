import { Session } from "../domain/session";

interface SaveLock {
  current: boolean;
}

interface SavePendingSessionDependencies {
  lock: SaveLock;
  createPending(): Promise<Session>;
  clearPendingDraft(): void;
  replace(path: `/sessions/${string}`): void;
}

export async function savePendingSession({
  lock,
  createPending,
  clearPendingDraft,
  replace,
}: SavePendingSessionDependencies): Promise<Session | null> {
  if (lock.current) return null;
  lock.current = true;

  try {
    const session = await createPending();
    replace(`/sessions/${session.id}`);
    clearPendingDraft();
    return session;
  } catch (reason) {
    lock.current = false;
    throw reason;
  }
}
