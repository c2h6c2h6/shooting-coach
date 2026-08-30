import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { randomUUID } from "expo-crypto";
import { ProfileService } from "../application/profileRepository";
import { ShooterProfile, ShooterProfileDraft } from "../domain/profile";
import { getDatabase } from "../infrastructure/database/sqlite";
import { SqliteProfileRepository } from "../infrastructure/profiles/sqliteProfileRepository";

const ProfileContext = createContext<ProfileService | null>(null);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profiles, setProfiles] = useState<ShooterProfile[]>([]);
  const [activeProfile, setActiveProfile] = useState<ShooterProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const repository = useMemo(
    () => getDatabase().then((db) => new SqliteProfileRepository(db, randomUUID)),
    [],
  );

  const refresh = useCallback(async () => {
    const repo = await repository;
    const [nextProfiles, nextActive] = await Promise.all([
      repo.list(),
      repo.getActive(),
    ]);
    setProfiles(nextProfiles);
    setActiveProfile(nextActive);
    setLoading(false);
  }, [repository]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<ProfileService>(
    () => ({
      profiles,
      activeProfile,
      loading,
      refresh,
      async create(draft: ShooterProfileDraft) {
        const profile = await (await repository).create(draft);
        await refresh();
        return profile;
      },
      async update(id: string, draft: ShooterProfileDraft) {
        const profile = await (await repository).update(id, draft);
        await refresh();
        return profile;
      },
      async remove(id: string) {
        await (await repository).delete(id);
        await refresh();
      },
      async select(id: string) {
        await (await repository).setActive(id);
        await refresh();
      },
    }),
    [profiles, activeProfile, loading, refresh, repository],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileService {
  const value = useContext(ProfileContext);
  if (!value) throw new Error("useProfiles doit être utilisé dans ProfileProvider.");
  return value;
}
