import { ShooterProfile, ShooterProfileDraft } from "../domain/profile";

export interface ProfileRepository {
  list(): Promise<ShooterProfile[]>;
  getById(id: string): Promise<ShooterProfile | null>;
  create(draft: ShooterProfileDraft): Promise<ShooterProfile>;
  update(id: string, draft: ShooterProfileDraft): Promise<ShooterProfile>;
  delete(id: string): Promise<void>;
  getActive(): Promise<ShooterProfile | null>;
  setActive(id: string): Promise<void>;
}

export interface ProfileService {
  profiles: ShooterProfile[];
  activeProfile: ShooterProfile | null;
  loading: boolean;
  refresh(): Promise<void>;
  create(draft: ShooterProfileDraft): Promise<ShooterProfile>;
  update(id: string, draft: ShooterProfileDraft): Promise<ShooterProfile>;
  remove(id: string): Promise<void>;
  select(id: string): Promise<void>;
}
