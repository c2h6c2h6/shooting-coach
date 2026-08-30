import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  CadenceType,
  SeriesType,
  validateSeriesDraft,
} from "../../../../src/domain/series";
import { useSeries } from "../../../../src/ui/SeriesProvider";
import { useSessions } from "../../../../src/ui/SessionProvider";

const types: { value: SeriesType; label: string }[] = [
  { value: "reference", label: "Référence" },
  { value: "diagnostic", label: "Diagnostic" },
  { value: "corrective", label: "Corrective" },
  { value: "consolidation", label: "Consolidation" },
  { value: "progression", label: "Progression" },
];
const cadences: { value: CadenceType; label: string }[] = [
  { value: "free", label: "Libre" },
  { value: "timed", label: "Chronométrée" },
  { value: "fixed_interval", label: "Intervalle fixe" },
  { value: "unknown", label: "Non précisée" },
];

export default function NewSeriesScreen() {
  const { id: sessionId } = useLocalSearchParams<{ id: string }>();
  const { getById: getSession } = useSessions();
  const { create, getNextSequenceNumber } = useSeries();
  const [sequenceNumber, setSequenceNumber] = useState(1);
  const [type, setType] = useState<SeriesType>("diagnostic");
  const [expected, setExpected] = useState("5");
  const [instruction, setInstruction] = useState("");
  const [objective, setObjective] = useState("");
  const [duration, setDuration] = useState("");
  const [cadence, setCadence] = useState<CadenceType>("free");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void Promise.all([getSession(sessionId), getNextSequenceNumber(sessionId)]).then(
      ([session, next]) => {
        if (!session || session.status !== "active") {
          router.replace(`/sessions/${sessionId}`);
          return;
        }
        setSequenceNumber(next);
        if (session.mode === "training") {
          setObjective(session.objectiveLabel ?? "");
        }
      },
    );
  }, [getNextSequenceNumber, getSession, sessionId]);

  async function save() {
    const draft = {
      sessionId,
      sequenceNumber,
      type,
      expectedShotCount: Number(expected),
      instruction,
      pedagogicalObjective: objective,
      durationSeconds: duration ? Number(duration) : null,
      cadenceType: cadence,
      notes,
    };
    const errors = validateSeriesDraft(draft);
    if (Object.keys(errors).length) {
      setError(Object.values(errors)[0] ?? "Série invalide.");
      return;
    }
    try {
      const created = await create(draft);
      router.replace(`/sessions/${sessionId}/series/${created.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Création impossible.");
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>SÉRIE {sequenceNumber}</Text>
      <Text style={styles.title}>Créer une série</Text>
      <Text style={styles.label}>Type</Text>
      <View style={styles.wrap}>{types.map((item) => (
        <Choice key={item.value} label={item.label} selected={type === item.value} onPress={() => setType(item.value)} />
      ))}</View>
      <Text style={styles.label}>Nombre de coups prévus</Text>
      <TextInput style={styles.input} value={expected} onChangeText={setExpected} keyboardType="number-pad" />
      <Text style={styles.label}>Consigne facultative</Text>
      <TextInput style={styles.input} value={instruction} onChangeText={setInstruction} />
      <Text style={styles.label}>Objectif facultatif</Text>
      <TextInput style={styles.input} value={objective} onChangeText={setObjective} />
      <Text style={styles.label}>Cadence</Text>
      <View style={styles.wrap}>{cadences.map((item) => (
        <Choice key={item.value} label={item.label} selected={cadence === item.value} onPress={() => setCadence(item.value)} />
      ))}</View>
      <Text style={styles.label}>Durée manuelle en secondes (facultatif)</Text>
      <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="number-pad" />
      <Text style={styles.label}>Notes facultatives</Text>
      <TextInput style={[styles.input, styles.multiline]} value={notes} onChangeText={setNotes} multiline />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={() => void save()}>
        <Text style={styles.primaryText}>Créer la série</Text>
      </Pressable>
    </ScrollView>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress(): void }) {
  return <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { padding: 22, gap: 12 },
  step: { color: "#E07A5F", fontWeight: "800", letterSpacing: 1 },
  title: { color: "#14213D", fontSize: 30, fontWeight: "800" },
  label: { color: "#14213D", fontWeight: "800", fontSize: 16, marginTop: 6 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { borderWidth: 1, borderColor: "#AAB5BF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  choiceSelected: { backgroundColor: "#2A9D8F", borderColor: "#2A9D8F" },
  choiceText: { color: "#405163", fontWeight: "600" },
  choiceTextSelected: { color: "#FFF" },
  input: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#CAD2D9", borderRadius: 10, padding: 13, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  primary: { backgroundColor: "#14213D", borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#FFF", fontWeight: "800", fontSize: 16 },
  error: { color: "#B42318", fontWeight: "700" },
});
