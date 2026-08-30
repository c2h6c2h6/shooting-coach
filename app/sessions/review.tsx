import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatDistance, provisionalSkills } from "../../src/domain/session";
import { useProfiles } from "../../src/ui/ProfileProvider";
import { savePendingSession } from "../../src/ui/savePendingSession";
import { useSessions } from "../../src/ui/SessionProvider";

export default function ReviewSessionScreen() {
  const { activeProfile } = useProfiles();
  const { pendingDraft, getReferences, createPending, setPendingDraft } = useSessions();
  const [weaponName, setWeaponName] = useState("");
  const [targetName, setTargetName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const saveLock = useRef(false);

  useEffect(() => {
    if (saveLock.current) return;
    if (!pendingDraft || !activeProfile) {
      router.replace(activeProfile ? "/sessions/new" : "/profiles");
      return;
    }
    void getReferences().then(({ weapons, targetTypes }) => {
      setWeaponName(weapons.find((item) => item.id === pendingDraft.weaponId)?.name ?? "");
      setTargetName(targetTypes.find((item) => item.id === pendingDraft.targetTypeId)?.name ?? "");
    });
  }, [activeProfile, getReferences, pendingDraft]);

  if (!pendingDraft || !activeProfile || pendingDraft.distanceMm === null) return null;
  const skill = provisionalSkills.find((item) => item.id === pendingDraft.selectedSkillId);

  async function save() {
    setSaving(true);
    setError("");
    try {
      await savePendingSession({
        lock: saveLock,
        createPending,
        clearPendingDraft: () => setPendingDraft(null),
        replace: (path) => router.replace(path),
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.step}>ÉTAPE 2 SUR 2</Text>
      <Text style={styles.title}>Vérifier avant d’enregistrer</Text>
      <View style={styles.card}>
        <Line label="Tireur" value={activeProfile.displayName} />
        <Line label="Mode" value={pendingDraft.mode === "coaching_free" ? "Coaching libre" : "Entraînement"} />
        <Line label="Arme" value={weaponName} />
        <Line label="Distance" value={formatDistance(pendingDraft.distanceMm)} />
        <Line label="Cible" value={targetName} />
        {pendingDraft.mode === "training" && (
          <Line label="Objectif" value={pendingDraft.objectiveLabel || skill?.label || "—"} />
        )}
      </View>
      <Text style={styles.help}>L’enregistrement crée un brouillon. La séance ne devient active qu’au démarrage.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void save()} disabled={saving}>
        <Text style={styles.primaryText}>{saving ? "Enregistrement…" : "Enregistrer le brouillon"}</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => router.back()}>
        <Text style={styles.secondaryText}>Modifier</Text>
      </Pressable>
    </View>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return <View style={styles.line}><Text style={styles.lineLabel}>{label}</Text><Text style={styles.lineValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 22, gap: 16 },
  step: { color: "#E07A5F", fontWeight: "800", letterSpacing: 1 },
  title: { color: "#14213D", fontSize: 30, fontWeight: "800" },
  card: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, gap: 15 },
  line: { gap: 3 },
  lineLabel: { color: "#657786", fontSize: 13, fontWeight: "700" },
  lineValue: { color: "#14213D", fontSize: 17, fontWeight: "700" },
  help: { color: "#657786", lineHeight: 20 },
  error: { color: "#B42318", fontWeight: "700" },
  primary: { backgroundColor: "#2A9D8F", borderRadius: 12, padding: 16, alignItems: "center" },
  primaryText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  secondary: { padding: 12, alignItems: "center" },
  secondaryText: { color: "#14213D", fontWeight: "800" },
});
