import { router } from "expo-router";
import { ScrollView } from "react-native";
import { ProfileForm } from "../../src/ui/ProfileForm";
import { useProfiles } from "../../src/ui/ProfileProvider";

export default function NewProfileScreen() {
  const { create } = useProfiles();
  return (
    <ScrollView>
      <ProfileForm
        submitLabel="Créer le profil"
        onSubmit={async (draft) => {
          await create(draft);
          router.replace("/");
        }}
      />
    </ScrollView>
  );
}
