import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text } from "react-native";
import { ProfileForm } from "../../../src/ui/ProfileForm";
import { useProfiles } from "../../../src/ui/ProfileProvider";

export default function EditProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profiles, update } = useProfiles();
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return <Text style={{ padding: 24 }}>Profil introuvable.</Text>;

  return (
    <ScrollView>
      <ProfileForm
        initialValue={profile}
        submitLabel="Enregistrer les modifications"
        onSubmit={async (draft) => {
          await update(profile.id, draft);
          router.back();
        }}
      />
    </ScrollView>
  );
}
