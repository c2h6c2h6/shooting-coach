import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  provisionalSkills,
  NumberOfHands,
  SessionMode,
  STANDARD_DISTANCES_MM,
  TargetTypeReference,
  validateSessionDraft,
  WeaponReference,
} from "../../src/domain/session";
import { useProfiles } from "../../src/ui/ProfileProvider";
import { useSessions } from "../../src/ui/SessionProvider";
import { useSeries } from "../../src/ui/SeriesProvider";
import {
  buildQuickSessionDraft,
  startSessionAndOpenUsefulScreen,
} from "../../src/ui/quickSessionFlow";

export default function NewSessionScreen() {
  const { activeProfile, loading } = useProfiles();
  const { getReferences, createAndStart, listByProfile } = useSessions();
  const { listBySession, start: startSeries } = useSeries();
  const [mode, setMode] = useState<SessionMode>("coaching_free");
  const [weapons, setWeapons] = useState<WeaponReference[]>([]);
  const [targets, setTargets] = useState<TargetTypeReference[]>([]);
  const [weaponId, setWeaponId] = useState<string | null>(null);
  const [targetTypeId, setTargetTypeId] = useState<string | null>(null);
  const [distanceMm, setDistanceMm] = useState<number>(7000);
  const [numberOfHands, setNumberOfHands] = useState<NumberOfHands>(2);
  const [customDistance, setCustomDistance] = useState("");
  const [objectiveLabel, setObjectiveLabel] = useState("");
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!loading && !activeProfile) router.replace("/profiles");
  }, [activeProfile, loading]);

  useEffect(() => {
    if (!activeProfile) return;
    void Promise.all([getReferences(), listByProfile(activeProfile.id)])
      .then(([nextReferences, previousSessions]) => {
        const draft = buildQuickSessionDraft(activeProfile, nextReferences, previousSessions);
        setWeapons(nextReferences.weapons);
        setTargets(nextReferences.targetTypes);
        if (!draft) return;
        setMode(draft.mode);
        setWeaponId(draft.weaponId);
        setTargetTypeId(draft.targetTypeId);
        setDistanceMm(draft.distanceMm ?? 7000);
        setNumberOfHands(draft.numberOfHands);
      });
  }, [activeProfile, getReferences, listByProfile]);

  async function startConfiguredSession() {
    const customMm = customDistance.trim() ? Number(customDistance.replace(",", ".")) * 1000 : null;
    const finalDistance = customMm ?? distanceMm;
    const draft = {
      shooterProfileId: activeProfile?.id ?? null,
      mode,
      weaponId,
      distanceMm: Number.isInteger(finalDistance) ? finalDistance : null,
      numberOfHands,
      targetTypeId,
      objectiveLabel: mode === "training" ? objectiveLabel : null,
      selectedSkillId: mode === "training" ? selectedSkillId : null,
    };
    const errors = validateSessionDraft(draft);
    if (Object.keys(errors).length > 0) {
      setError(Object.values(errors)[0] ?? "Configuration invalide.");
      return;
    }
    setStarting(true);
    setError("");
    try {
      const outcome = await startSessionAndOpenUsefulScreen(draft, {
        createAndStart,
        listBySession,
        startSeries,
      });
      router.replace(outcome.destination as never);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La séance n’a pas pu démarrer.");
      setStarting(false);
    }
  }

  if (!activeProfile) return null;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>UNE SEULE ÉTAPE AVANT DE TIRER</Text>
      <Text style={styles.title}>Préparer la séance</Text>
      <Text style={styles.profile}>Tireur : {activeProfile.displayName}</Text>

      <Text style={styles.label}>Mode</Text>
      <View style={styles.row}>
        <Choice label="Coaching libre" selected={mode === "coaching_free"} onPress={() => setMode("coaching_free")} />
        <Choice label="Entraînement" selected={mode === "training"} onPress={() => setMode("training")} />
      </View>

      <Text style={styles.label}>Arme</Text>
      <View style={styles.wrap}>
        {weapons.map((weapon) => (
          <Choice key={weapon.id} label={weapon.name} selected={weaponId === weapon.id} onPress={() => setWeaponId(weapon.id)} />
        ))}
      </View>

      <Text style={styles.label}>Distance</Text>
      <View style={styles.wrap}>
        {STANDARD_DISTANCES_MM.map((value) => (
          <Choice key={value} label={`${value / 1000} m`} selected={!customDistance && distanceMm === value} onPress={() => { setCustomDistance(""); setDistanceMm(value); }} />
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={customDistance}
        onChangeText={setCustomDistance}
        keyboardType="decimal-pad"
        placeholder="Distance personnalisée en mètres"
      />

      <Text style={styles.label}>Nombre de mains</Text>
      <View style={styles.row}>
        <Choice label="1 main" selected={numberOfHands === 1} onPress={() => setNumberOfHands(1)} />
        <Choice label="2 mains" selected={numberOfHands === 2} onPress={() => setNumberOfHands(2)} />
      </View>

      <Text style={styles.label}>Type de cible</Text>
      <View style={styles.wrap}>
        {targets.map((target) => (
          <Choice key={target.id} label={target.name} selected={targetTypeId === target.id} onPress={() => setTargetTypeId(target.id)} />
        ))}
      </View>

      {mode === "training" && (
        <>
          <Text style={styles.label}>Objectif d’entraînement</Text>
          <TextInput style={styles.input} value={objectiveLabel} onChangeText={setObjectiveLabel} placeholder="Intitulé libre" />
          <Text style={styles.help}>Ou choisir une compétence provisoire :</Text>
          <View style={styles.wrap}>
            {provisionalSkills.map((skill) => (
              <Choice key={skill.id} label={skill.label} selected={selectedSkillId === skill.id} onPress={() => setSelectedSkillId(selectedSkillId === skill.id ? null : skill.id)} />
            ))}
          </View>
        </>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable disabled={starting} style={[styles.primary, starting && styles.disabled]}
        onPress={() => void startConfiguredSession()}>
        <Text style={styles.primaryText}>{starting ? "Démarrage…" : "Démarrer la séance"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 22, gap: 14 },
  step: { color: "#E07A5F", fontWeight: "800", letterSpacing: 1 },
  title: { color: "#14213D", fontSize: 30, fontWeight: "800" },
  profile: { color: "#405163", fontSize: 17 },
  label: { color: "#14213D", fontSize: 17, fontWeight: "800", marginTop: 8 },
  row: { flexDirection: "row", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { borderWidth: 1, borderColor: "#AAB5BF", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11 },
  choiceSelected: { backgroundColor: "#2A9D8F", borderColor: "#2A9D8F" },
  choiceText: { color: "#405163", fontWeight: "600" },
  choiceTextSelected: { color: "#FFF" },
  input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#CAD2D9", borderRadius: 10, padding: 13, fontSize: 16 },
  help: { color: "#657786" },
  error: { color: "#B42318", fontWeight: "700" },
  primary: { backgroundColor: "#14213D", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  disabled: { opacity: 0.45 },
});
