import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  DeclaredLevel,
  Laterality,
  ShooterProfileDraft,
  SupportedWeapon,
  validateProfile,
} from "../domain/profile";
import { colors, layout } from "./theme";

export const emptyProfileDraft: ShooterProfileDraft = {
  displayName: "",
  laterality: null,
  declaredLevel: "beginner",
  primaryWeapon: "glock-19",
};

interface Props {
  initialValue?: ShooterProfileDraft;
  submitLabel: string;
  onSubmit(draft: ShooterProfileDraft): Promise<void>;
}

export function ProfileForm({ initialValue = emptyProfileDraft, submitLabel, onSubmit }: Props) {
  const [draft, setDraft] = useState(initialValue);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const errors = submitted ? validateProfile(draft) : {};

  async function submit() {
    setSubmitted(true);
    setFailure(null);
    if (Object.keys(validateProfile(draft)).length > 0) return;
    try {
      setSaving(true);
      await onSubmit(draft);
    } catch {
      setFailure("L’enregistrement a échoué. Réessayez.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Prénom ou pseudonyme</Text>
      <TextInput
        accessibilityLabel="Prénom ou pseudonyme"
        value={draft.displayName}
        onChangeText={(displayName) => setDraft((v) => ({ ...v, displayName }))}
        placeholder="Ex. Alex"
        style={styles.input}
      />
      {errors.displayName && <Text style={styles.error}>{errors.displayName}</Text>}

      <Text style={styles.label}>Latéralité obligatoire</Text>
      <View style={styles.row}>
        {(["right", "left"] as Laterality[]).map((value) => (
          <Choice
            key={value}
            label={value === "right" ? "Droitier" : "Gaucher"}
            selected={draft.laterality === value}
            onPress={() => setDraft((v) => ({ ...v, laterality: value }))}
          />
        ))}
      </View>
      {errors.laterality && <Text style={styles.error}>{errors.laterality}</Text>}

      <Text style={styles.label}>Niveau déclaré</Text>
      <View style={styles.wrap}>
        {(["beginner", "intermediate", "advanced"] as DeclaredLevel[]).map((value) => (
          <Choice
            key={value}
            label={{ beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" }[value]}
            selected={draft.declaredLevel === value}
            onPress={() => setDraft((v) => ({ ...v, declaredLevel: value }))}
          />
        ))}
      </View>

      <Text style={styles.label}>Arme principale</Text>
      <View style={styles.wrap}>
        {(["glock-19", "glock-48", "glock-43x"] as SupportedWeapon[]).map((value) => (
          <Choice
            key={value}
            label={{ "glock-19": "Glock 19", "glock-48": "Glock 48", "glock-43x": "Glock 43X" }[value]}
            selected={draft.primaryWeapon === value}
            onPress={() => setDraft((v) => ({ ...v, primaryWeapon: value }))}
          />
        ))}
      </View>

      <Pressable disabled={saving} onPress={submit} style={styles.submit}>
        <Text style={styles.submitText}>{saving ? "Enregistrement…" : submitLabel}</Text>
      </Pressable>
      {failure && <Text style={styles.error}>{failure}</Text>}
    </View>
  );
}

function Choice(props: { label: string; selected: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: props.selected }}
      onPress={props.onPress}
      style={[styles.choice, props.selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, props.selected && styles.choiceTextSelected]}>
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: layout.pagePadding, gap: 10 },
  label: { color: colors.navy, fontSize: 16, fontWeight: "800", marginTop: 12 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 17, minHeight: layout.controlHeight },
  row: { flexDirection: "row", gap: 10 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { flexGrow: 1, minHeight: 46, justifyContent: "center", padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.teal, backgroundColor: colors.tealSoft },
  choiceText: { color: colors.text, fontWeight: "600", textAlign: "center" },
  choiceTextSelected: { color: colors.teal },
  error: { color: colors.danger, fontSize: 13 },
  submit: { backgroundColor: colors.teal, borderRadius: layout.radius, padding: 15, marginTop: 16, minHeight: layout.controlHeight, justifyContent: "center" },
  submitText: { color: colors.surface, fontWeight: "800", textAlign: "center", fontSize: 16 },
});
