import { describe, expect, it, vi } from "vitest";
import { Session } from "../domain/session";
import { savePendingSession } from "./savePendingSession";

const session = {
  id: "session-123",
} as Session;

describe("savePendingSession", () => {
  it("crée une seule séance et ouvre systématiquement sa page", async () => {
    let resolveCreation!: (value: Session) => void;
    const createPending = vi.fn(
      () => new Promise<Session>((resolve) => {
        resolveCreation = resolve;
      }),
    );
    const replace = vi.fn();
    const clearPendingDraft = vi.fn();
    const lock = { current: false };

    const firstSave = savePendingSession({
      lock,
      createPending,
      clearPendingDraft,
      replace,
    });
    const repeatedSave = savePendingSession({
      lock,
      createPending,
      clearPendingDraft,
      replace,
    });

    expect(createPending).toHaveBeenCalledTimes(1);
    await expect(repeatedSave).resolves.toBeNull();

    resolveCreation(session);
    await expect(firstSave).resolves.toBe(session);

    expect(replace).toHaveBeenCalledOnce();
    expect(replace).toHaveBeenCalledWith("/sessions/session-123");
    expect(clearPendingDraft).toHaveBeenCalledOnce();
    expect(replace.mock.invocationCallOrder[0]).toBeLessThan(
      clearPendingDraft.mock.invocationCallOrder[0],
    );
    expect(lock.current).toBe(true);
  });

  it("déverrouille l'enregistrement après un échec", async () => {
    const failure = new Error("Échec");
    const lock = { current: false };

    await expect(savePendingSession({
      lock,
      createPending: vi.fn().mockRejectedValue(failure),
      clearPendingDraft: vi.fn(),
      replace: vi.fn(),
    })).rejects.toBe(failure);

    expect(lock.current).toBe(false);
  });
});
