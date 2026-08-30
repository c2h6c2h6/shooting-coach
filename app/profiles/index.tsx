import { Link, router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { lateralityLabels, weaponLabels } from "../../src/domain/profile";
import { formatDistance, Session } from "../../src/domain/session";
import { useProfiles } from "../../src/ui/ProfileProvider";
import { useSessions } from "../../src/ui/SessionProvider";
import { colors, layout, shadows } from "../../src/ui/theme";

export default function ProfilesScreen() {
  const { profiles, activeProfile, remove, select } = useProfiles();
  const { listByProfile } = useSessions();
  const [sessions, setSessions] = useState<Record<string, Session[]>>({});
  useFocusEffect(useCallback(() => {
    let mounted = true;
    void Promise.all(profiles.map(async (profile) => [profile.id, await listByProfile(profile.id)] as const))
      .then((values) => { if (mounted) setSessions(Object.fromEntries(values)); });
    return () => { mounted = false; };
  }, [listByProfile, profiles]));

  async function deleteProfile(id: string) {
    try {
      await remove(id);
    } catch (reason) {
      Alert.alert(
        "Suppression impossible",
        reason instanceof Error
          ? reason.message
          : "Le profil n’a pas pu être supprimé. Réessayez.",
      );
    }
  }

  function confirmDelete(id: string, name: string) {
    Alert.alert("Supprimer le profil ?", `${name} sera supprimé de cet appareil s’il ne possède aucune séance.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => void deleteProfile(id) },
    ]);
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <Text style={styles.heading}>Profils tireurs</Text>
      <Text style={styles.intro}>Choisissez le profil utilisé pour la prochaine séance.</Text>
      {profiles.map((profile) => (
        <View key={profile.id} style={styles.card}>
          <Text style={styles.title}>
            {profile.displayName}
          </Text>
          {activeProfile?.id === profile.id ? <Text style={styles.badge}>Profil actif</Text> : null}
          <Text style={styles.meta}>
            {lateralityLabels[profile.laterality]} · {weaponLabels[profile.primaryWeapon]}
          </Text>
          <View style={styles.actions}>
            {activeProfile?.id !== profile.id && (
              <Pressable onPress={() => void select(profile.id)}><Text style={styles.action}>Sélectionner</Text></Pressable>
            )}
            <Pressable onPress={() => router.push(`/profiles/${profile.id}/edit`)}>
              <Text style={styles.action}>Modifier</Text>
            </Pressable>
            <Pressable onPress={() => confirmDelete(profile.id, profile.displayName)}>
              <Text style={styles.delete}>Supprimer</Text>
            </Pressable>
          </View>
          {(sessions[profile.id] ?? []).length ? <View style={styles.history}>
            <Text style={styles.historyTitle}>Séances enregistrées</Text>
            {(sessions[profile.id] ?? []).map((session) => (
              <Pressable key={session.id} style={styles.sessionRow} onPress={() => router.push(`/sessions/${session.id}`)}>
                <Text style={styles.sessionTitle}>{session.completedAt ? new Date(session.completedAt).toLocaleDateString("fr-FR") : "Séance en cours"} · {session.weaponName}</Text>
                <Text style={styles.sessionMeta}>{formatDistance(session.distanceMm)} · {session.status === "completed" ? "Terminée" : session.status === "active" ? "En cours" : "Brouillon"}</Text>
              </Pressable>
            ))}
          </View> : null}
        </View>
      ))}
      <Link href="/profiles/new" style={styles.button}>Ajouter un profil</Link>
      {profiles.length === 0 && <Text style={styles.empty}>Aucun profil enregistré.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: layout.pagePadding,
    paddingBottom: layout.pagePadding + 32,
    gap: 12,
  },
  heading: { color: colors.navy, fontSize: 28, lineHeight: 34, fontWeight: "800" },
  intro: { color: colors.muted, fontSize: 16, lineHeight: 22, marginBottom: 4 },
  card: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 16, gap: 7, ...shadows.card },
  title: { color: colors.navy, fontSize: 19, fontWeight: "800" },
  badge: { alignSelf: "flex-start", color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, fontWeight: "800", fontSize: 12 },
  meta: { color: colors.text },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 20, marginTop: 8, minHeight: 36, alignItems: "center" },
  action: { color: colors.teal, fontWeight: "800" },
  delete: { color: colors.danger, fontWeight: "700" },
  button: { backgroundColor: colors.teal, color: colors.surface, fontWeight: "800", padding: 15, borderRadius: layout.radius, textAlign: "center", overflow: "hidden", marginTop: 4 },
  empty: { color: colors.muted, textAlign: "center", paddingVertical: 24 },
  history: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 8 },
  historyTitle: { color: colors.navy, fontWeight: "800" },
  sessionRow: { backgroundColor: colors.background, borderRadius: 10, padding: 10, gap: 2 },
  sessionTitle: { color: colors.navy, fontWeight: "700" },
  sessionMeta: { color: colors.muted, fontSize: 13 },
});
