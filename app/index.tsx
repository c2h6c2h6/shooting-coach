import { Link, router, Stack, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { formatDistance, Session } from "../src/domain/session";
import { useProfiles } from "../src/ui/ProfileProvider";
import { useSessions } from "../src/ui/SessionProvider";
import {
  buildQuickSessionDraft,
  type QuickSessionReferences,
} from "../src/ui/quickSessionFlow";
import { colors, layout, shadows } from "../src/ui/theme";
import { AppOpeningScreen } from "../src/ui/AppOpeningScreen";

let openingSeenThisLaunch = false;

export default function HomeScreen() {
  const { activeProfile, loading } = useProfiles();
  const { listByProfile, getReferences } = useSessions();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [references, setReferences] = useState<QuickSessionReferences | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [showOpening, setShowOpening] = useState(!openingSeenThisLaunch);
  useFocusEffect(useCallback(() => {
    let mounted = true;
    if (!activeProfile) {
      setSessions([]);
      return () => { mounted = false; };
    }
    setHistoryError("");
    void Promise.all([listByProfile(activeProfile.id), getReferences()])
      .then(([values, nextReferences]) => { if (mounted) {
        setSessions(values);
        setReferences(nextReferences);
      } })
      .catch(() => {
        if (mounted) {
          setSessions([]);
          setHistoryError("L’historique n’a pas pu être chargé. Réessayez.");
        }
      });
    return () => { mounted = false; };
  }, [activeProfile, getReferences, listByProfile]));
  const quickDraft = useMemo(() => activeProfile && references
    ? buildQuickSessionDraft(activeProfile, references, sessions)
    : null, [activeProfile, references, sessions]);
  const quickWeapon = references?.weapons.find((weapon) => weapon.id === quickDraft?.weaponId)?.name ?? "";

  if (showOpening) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AppOpeningScreen onEnter={() => {
          openingSeenThisLaunch = true;
          setShowOpening(false);
        }} />
      </>
    );
  }

  if (loading) return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Coach Tir" }} />
      <ActivityIndicator style={styles.loading} size="large" />
    </>
  );
  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Coach Tir" }} />
      <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>COACH TIR · VERSION DE TEST</Text>
      <Text style={styles.title}>Votre séance, coup après coup.</Text>
      <Text style={styles.intro}>Préparez une séance et placez vos impacts sur une cible numérique.</Text>
      {activeProfile ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>PROFIL ACTIF</Text>
          <Text style={styles.cardTitle}>{activeProfile.displayName}</Text>
          {quickDraft ? <>
            <Text style={styles.body}>{quickWeapon} · {formatDistance(quickDraft.distanceMm!)}</Text>
            <Text style={styles.body}>Coaching libre</Text>
            <Link href="/sessions/new" style={styles.modifyLink}>Modifier</Link>
          </> : <Text style={styles.body}>Paramètres de séance indisponibles.</Text>}
        </View>
      ) : (
        <Text style={styles.body}>Créez un premier profil pour commencer.</Text>
      )}
      <Link href="/profiles" style={styles.button}>
        {activeProfile ? "Gérer les profils" : "Créer un profil tireur"}
      </Link>
      {activeProfile ? (
        <Pressable disabled={!quickDraft} style={[styles.primaryButton, !quickDraft && styles.disabled]}
          onPress={() => router.push("/sessions/new")}>
          <Text style={styles.primaryButtonText}>Démarrer une séance</Text>
        </Pressable>
      ) : null}
      {activeProfile ? (
        <View style={styles.historyCard}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Historique des séances</Text>
            <Link href="/profiles" style={styles.historyLink}>Tout voir</Link>
          </View>
          {sessions.length === 0 && !historyError ? (
            <Text style={styles.historyEmpty}>Aucune séance enregistrée pour ce profil.</Text>
          ) : null}
          {sessions.slice(0, 3).map((session) => (
            <Pressable key={session.id} style={styles.sessionRow} onPress={() => router.push(`/sessions/${session.id}`)}>
              <Text style={styles.sessionTitle}>
                {session.completedAt
                  ? new Date(session.completedAt).toLocaleDateString("fr-FR")
                  : session.startedAt
                    ? new Date(session.startedAt).toLocaleDateString("fr-FR")
                    : "Séance en préparation"}{" "}
                · {session.weaponName}
              </Text>
              <Text style={styles.sessionMeta}>
                {formatDistance(session.distanceMm)} · {session.status === "completed"
                  ? "Terminée"
                  : session.status === "active"
                    ? "En cours"
                    : "Brouillon"}
              </Text>
            </Pressable>
          ))}
          {historyError ? <Text style={styles.error}>{historyError}</Text> : null}
        </View>
      ) : null}
      <Link href={"/validation" as never} style={styles.button}>Mode démonstration et validation</Link>
      <Link href={"/safety" as never} style={styles.button}>Sécurité et limites</Link>
      <View style={styles.noticeBox}><Text style={styles.notice}>
        En stand, respectez toujours les consignes de sécurité et le règlement local.
      </Text></View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: layout.pagePadding, justifyContent: "center", gap: 16 },
  loading: { flex: 1 },
  eyebrow: { color: colors.coral, fontWeight: "800", letterSpacing: 1.1, fontSize: 12 },
  title: { color: colors.navy, fontSize: 32, lineHeight: 38, fontWeight: "800" },
  intro: { color: colors.text, fontSize: 17, lineHeight: 24 },
  body: { color: colors.text, fontSize: 16, lineHeight: 23 },
  card: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 18, gap: 5, ...shadows.card },
  cardLabel: { color: colors.muted, fontSize: 12, fontWeight: "800", letterSpacing: 0.8 },
  cardTitle: { color: colors.navy, fontSize: 20, fontWeight: "800" },
  button: {
    backgroundColor: colors.surface,
    color: colors.navy,
    fontWeight: "700",
    fontSize: 17,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: layout.radius,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: colors.teal,
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: layout.radius,
    overflow: "hidden",
    alignItems: "center",
  },
  primaryButtonText: { color: colors.surface, fontWeight: "800", fontSize: 17 },
  modifyLink: { color: colors.teal, fontWeight: "800", marginTop: 5 },
  disabled: { opacity: 0.45 },
  noticeBox: { backgroundColor: "#E8EEF3", borderRadius: 12, padding: 14, marginTop: 6 },
  notice: { color: colors.text, fontSize: 13, lineHeight: 19 },
  historyCard: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 16, gap: 9, ...shadows.card },
  historyHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  historyTitle: { color: colors.navy, fontSize: 18, fontWeight: "800" },
  historyLink: { color: colors.teal, fontWeight: "800" },
  historyEmpty: { color: colors.muted, lineHeight: 20 },
  sessionRow: { backgroundColor: colors.background, borderRadius: 10, padding: 11, gap: 3 },
  sessionTitle: { color: colors.navy, fontWeight: "700" },
  sessionMeta: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, backgroundColor: colors.dangerBackground, borderRadius: 10, padding: 12, fontWeight: "700" },
});
