import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import {
  buildD4DiagnosticTestResult,
  buildD4MaintainIntervention,
  loadD4PilotCatalog,
  resolveD4PilotReferences,
  type D4PilotIntervention,
  type D4PilotReferences,
} from "../../../../../src/application/pedagogicalV2Pilot";
import { PEDAGOGICAL_V2_PILOT } from "../../../../../src/config/featureFlags";
import { observationLabelsFr } from "../../../../../src/domain/observationCatalog";
import type { ShootingObservation } from "../../../../../src/domain/shootingObservation";
import type { EvidenceEffect } from "../../../../../src/domain/pedagogical-v2/contracts";
import type { DiagnosticTestResult, DiagnosticTestResultStatus } from "../../../../../src/domain/pedagogical-v2/inputContracts";
import type { Series } from "../../../../../src/domain/series";
import { useSeries } from "../../../../../src/ui/SeriesProvider";
import { useSessions } from "../../../../../src/ui/SessionProvider";
import { useShootingObservations } from "../../../../../src/ui/ShootingObservationProvider";
import { factualConfidenceLevelLabels } from "../../../../../src/ui/analysisPresentation";
import { colors } from "../../../../../src/ui/theme";

const decisionRationale = "Maintenir le travail sur D4 afin de stabiliser une montée de pression progressive et reproductible avant toute progression supplémentaire.";
const statuses: readonly DiagnosticTestResultStatus[] = ["usable", "non_discriminating", "inconclusive"];
const effects: readonly EvidenceEffect[] = ["strengthens", "weakens", "contradicts", "neutral"];
const statusLabels: Record<DiagnosticTestResultStatus, string> = {
  usable: "Le test apporte une information",
  non_discriminating: "Le test ne permet pas de départager",
  inconclusive: "Impossible de conclure",
};
const effectLabels: Record<EvidenceEffect, string> = {
  strengthens: "Renforce l’incertitude examinée",
  weakens: "Affaiblit l’incertitude examinée",
  contradicts: "Apporte un élément contradictoire",
  neutral: "N’apporte pas de changement",
};

export default function PedagogicalV2PilotScreen() {
  const { id: sessionId, seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const { getById: getSeries } = useSeries();
  const { getById: getSession } = useSessions();
  const observationsService = useShootingObservations();
  const [series, setSeries] = useState<Series | null>(null);
  const [observations, setObservations] = useState<ShootingObservation[]>([]);
  const [references, setReferences] = useState<D4PilotReferences | null>(null);
  const [selectedObservationId, setSelectedObservationId] = useState<string | null>(null);
  const [d4Confirmed, setD4Confirmed] = useState(false);
  const [supervisionConfirmed, setSupervisionConfirmed] = useState(false);
  const [status, setStatus] = useState<DiagnosticTestResultStatus | null>(null);
  const [effect, setEffect] = useState<EvidenceEffect | null>(null);
  const [strength, setStrength] = useState("");
  const [reliability, setReliability] = useState("");
  const [rationale, setRationale] = useState("");
  const [inconclusiveReason, setInconclusiveReason] = useState("");
  const [testResult, setTestResult] = useState<DiagnosticTestResult | null>(null);
  const [maintainConfirmed, setMaintainConfirmed] = useState(false);
  const [techniqueConfirmed, setTechniqueConfirmed] = useState(false);
  const [exerciseConfirmed, setExerciseConfirmed] = useState(false);
  const [finalRationale, setFinalRationale] = useState(decisionRationale);
  const [intervention, setIntervention] = useState<D4PilotIntervention | null>(null);
  const [error, setError] = useState("");

  const selectedObservation = useMemo(
    () => observations.find((item) => item.id === selectedObservationId) ?? null,
    [observations, selectedObservationId],
  );
  const resultBlockingReasons = useMemo(() => {
    const reasons: string[] = [];
    if (!supervisionConfirmed) reasons.push("confirmer la supervision instructeur");
    if (!status) reasons.push("choisir le résultat du test");
    if (status === "usable") {
      if (!effect) reasons.push("choisir l’effet de l’observation");
      const parsedStrength = Number(strength.replace(",", "."));
      const parsedReliability = Number(reliability.replace(",", "."));
      if (!strength.trim()) reasons.push("renseigner la force");
      else if (!Number.isFinite(parsedStrength) || parsedStrength < 0 || parsedStrength > 1)
        reasons.push("utiliser une force comprise entre 0 et 1");
      if (!reliability.trim()) reasons.push("renseigner la fiabilité");
      else if (!Number.isFinite(parsedReliability) || parsedReliability < 0 || parsedReliability > 1)
        reasons.push("utiliser une fiabilité comprise entre 0 et 1");
      if (!rationale.trim()) reasons.push("expliquer l’observation");
    }
    if (status === "inconclusive" && !inconclusiveReason.trim()) reasons.push("indiquer pourquoi il est impossible de conclure");
    return reasons;
  }, [effect, inconclusiveReason, rationale, reliability, status, strength, supervisionConfirmed]);

  function resetExplicitResultAndDecision() {
    setSupervisionConfirmed(false);
    setStatus(null);
    setEffect(null);
    setStrength("");
    setReliability("");
    setRationale("");
    setInconclusiveReason("");
    setTestResult(null);
    setMaintainConfirmed(false);
    setTechniqueConfirmed(false);
    setExerciseConfirmed(false);
    setIntervention(null);
  }

  useEffect(() => {
    if (!PEDAGOGICAL_V2_PILOT) return;
    void Promise.all([getSeries(seriesId), getSession(sessionId), observationsService.listBySeries(seriesId)])
      .then(([nextSeries, session, nextObservations]) => {
        if (!nextSeries || nextSeries.sessionId !== sessionId || nextSeries.status !== "completed" || !session) {
          setError("Cette série n’est pas disponible pour le pilote v2.");
          return;
        }
        const catalog = loadD4PilotCatalog();
        if (!catalog.success) { setError(catalog.errors[0].message); return; }
        const resolved = resolveD4PilotReferences(catalog.data);
        if (!resolved.success) { setError(resolved.errors[0].message); return; }
        setSeries(nextSeries);
        setObservations(nextObservations);
        setReferences(resolved.data);
        if (nextObservations.length === 0) setError("Aucune observation réelle n’est disponible pour cette série.");
      })
      .catch(() => setError("Le pilote v2 ne peut pas charger les données de la série."));
  }, [getSeries, getSession, observationsService, seriesId, sessionId]);

  function submitResult() {
    if (!selectedObservation || !references || !status) { setError("Sélectionnez une observation et renseignez le résultat."); return; }
    if (status === "usable" && (!effect || !strength.trim() || !reliability.trim() || !rationale.trim())) {
      setError("Ce résultat exige un effet, une force, une fiabilité et une explication renseignés par l’instructeur.");
      return;
    }
    const explicitEvidence = status === "usable" && effect ? {
      id: randomUUID(), effect,
      strength: Number(strength.replace(",", ".")),
      reliability: Number(reliability.replace(",", ".")),
      rationale,
    } : null;
    const result = buildD4DiagnosticTestResult({
      id: randomUUID(), recordVersion: "1.0.0", performedAt: new Date().toISOString(),
      observation: selectedObservation, references, status, supervisionConfirmed,
      evidence: explicitEvidence,
      inconclusiveReason: status === "inconclusive" ? inconclusiveReason : null,
      provenance: { sourceType: "pedagogical_v2_pilot", sourceId: seriesId,
        actorType: "instructor", actorId: null },
    });
    if (!result.success) { setError(result.errors[0].message); return; }
    setTestResult(result.data);
    setIntervention(null);
    setError("");
  }

  function confirmIntervention() {
    if (!selectedObservation || !references || !testResult || !maintainConfirmed ||
      !techniqueConfirmed || !exerciseConfirmed) {
      setError("Confirmez la poursuite du travail, la technique et l’exercice proposés.");
      return;
    }
    const result = buildD4MaintainIntervention({
      id: randomUUID(), createdAt: new Date().toISOString(), observation: selectedObservation,
      references, diagnosticTestResult: testResult, decisionType: "MAINTAIN",
      rationale: finalRationale,
      confirmedCompetenceId: references.competence.id,
      confirmedTechniqueId: references.technique.id,
      confirmedExerciseId: references.exercise.id,
    });
    if (!result.success) { setError("La proposition ne peut pas être construite. Vérifiez toutes les confirmations et le texte saisi."); return; }
    setIntervention(result.data);
    setError("");
  }

  if (!PEDAGOGICAL_V2_PILOT) return <View style={styles.page}>
    <Text style={styles.title}>Pilote v2 désactivé</Text>
    <Text style={styles.body}>Ce parcours n’est disponible que dans un build pilote explicitement configuré.</Text>
  </View>;

  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.kicker}>PILOTE PÉDAGOGIQUE V2 — NON HISTORISÉ</Text>
    <Text style={styles.title}>Examiner la progressivité de l’action</Text>
    <Text style={styles.warning}>Pilote non historisé : ces résultats ne seront pas conservés après fermeture.</Text>
    {series ? <Text style={styles.body}>Série {series.sequenceNumber} · {series.recordedShotCount} coups déclarés</Text> : null}

    <Card title="1. Observation factuelle v1">
      {observations.map((item) => <Choice key={item.id} selected={selectedObservationId === item.id}
        label={`${observationLabelsFr[item.observationCode]} · Confiance : ${factualConfidenceLevelLabels[item.confidenceLevel]}`}
        onPress={() => { setSelectedObservationId(item.id); setD4Confirmed(false); resetExplicitResultAndDecision(); }} />)}
      {selectedObservation ? <Pressable style={styles.primary} onPress={() => setD4Confirmed(true)}>
        <Text style={styles.primaryText}>Examiner D4</Text>
      </Pressable> : <Text style={styles.help}>Sélectionnez explicitement une observation. Elle ne choisit jamais D4 automatiquement.</Text>}
    </Card>

    {d4Confirmed && references ? <>
      <Card title="2. Incertitude choisie par l’instructeur">
        <Text style={styles.label}>{references.competence.name}</Text>
        <Text style={styles.help}>La perturbation observée est-elle compatible avec une progressivité insuffisante de l’action sur la détente ? D4 n’est pas diagnostiquée.</Text>
      </Card>
      <Card title={`3. Test — ${references.diagnosticTest.name}`}>
        <Text style={styles.label}>Objectif</Text><Text style={styles.body}>{references.diagnosticTest.objective}</Text>
        <Lines title="Conditions" values={references.diagnosticTest.conditionsOfUse} />
        <Lines title="Limites" values={references.diagnosticTest.interpretationLimits} />
        <Lines title="Arrêt" values={references.diagnosticTest.stopCriteria} />
        <Lines title="Supervision" values={references.diagnosticTest.supervisionRequirements} />
        <Choice selected={supervisionConfirmed} label="Test réalisé sous supervision instructeur"
          onPress={() => setSupervisionConfirmed((value) => !value)} />
      </Card>
      <Card title="4. Résultat saisi par l’instructeur">
        <Text style={styles.label}>Statut</Text>
        {statuses.map((value) => <Choice key={value} selected={status === value} label={statusLabels[value]} exclusive
          onPress={() => {
            setStatus(value); setTestResult(null); setMaintainConfirmed(false);
            setTechniqueConfirmed(false); setExerciseConfirmed(false); setIntervention(null);
          }} />)}
        {status === "usable" ? <>
          <Text style={styles.label}>Effet de l’observation</Text>
          {effects.map((value) => <Choice key={value} selected={effect === value} label={effectLabels[value]} exclusive onPress={() => setEffect(value)} />)}
          <Text style={styles.label}>Force de l’indice (0 à 1)</Text>
          <Text style={styles.help}>0 signifie très faible ; 1 signifie très fort. Cette appréciation est saisie par l’instructeur.</Text>
          <TextInput style={styles.input} value={strength} onChangeText={setStrength} keyboardType="decimal-pad" />
          <Text style={styles.label}>Fiabilité de l’observation (0 à 1)</Text>
          <Text style={styles.help}>Évaluez la qualité des conditions d’observation, sans calcul automatique.</Text>
          <TextInput style={styles.input} value={reliability} onChangeText={setReliability} keyboardType="decimal-pad" />
          <Text style={styles.label}>Explication obligatoire</Text><TextInput style={[styles.input, styles.multiline]} value={rationale} onChangeText={setRationale} multiline />
        </> : null}
        {status === "inconclusive" ? <>
          <Text style={styles.label}>Raison obligatoire</Text><TextInput style={[styles.input, styles.multiline]}
            value={inconclusiveReason} onChangeText={setInconclusiveReason} multiline />
        </> : null}
        {resultBlockingReasons.length ? <Text style={styles.missing}>Pour continuer : {resultBlockingReasons.join(" ; ")}.</Text> : null}
        <Pressable disabled={resultBlockingReasons.length > 0} style={[styles.primary, resultBlockingReasons.length > 0 && styles.disabled]}
          onPress={submitResult}><Text style={styles.primaryText}>Valider ce résultat explicite</Text></Pressable>
      </Card>
    </> : null}

    {testResult ? <Card title="Résultat v2 construit et validé">
      <Text style={styles.body}>Résultat : {statusLabels[testResult.status]}</Text>
      {testResult.inconclusiveReason ? <Text style={styles.body}>Raison : {testResult.inconclusiveReason}</Text> : null}
      {testResult.status !== "usable" ? <Text style={styles.warning}>Ce résultat ne permet pas de poursuivre vers une intervention. Aucune technique, aucun exercice et aucune décision ne sont construits.</Text> : null}
    </Card> : null}

    {testResult?.status === "usable" && references ? <Card title="5. Confirmations d’intervention">
      <Choice selected={maintainConfirmed} label="Confirmer la poursuite du travail sur la progressivité"
        onPress={() => setMaintainConfirmed((value) => !value)} />
      <Text style={styles.label}>Rationale de décision</Text>
      <TextInput style={[styles.input, styles.multiline]} value={finalRationale} onChangeText={setFinalRationale} multiline />
      <Choice selected={techniqueConfirmed} label={`Utiliser la technique : ${references.technique.name}`}
        onPress={() => setTechniqueConfirmed((value) => !value)} />
      <Choice selected={exerciseConfirmed} label={`Utiliser l’exercice : ${references.exercise.name}`}
        onPress={() => setExerciseConfirmed((value) => !value)} />
      <Pressable style={styles.primary} onPress={confirmIntervention}><Text style={styles.primaryText}>Construire la décision explicite</Text></Pressable>
    </Card> : null}

    {intervention ? <>
      <Card title={`Exercice — ${intervention.exercise.name}`}>
        <Lines title="Consigne" values={intervention.exercise.instructions} />
        <Text style={styles.label}>Objectif</Text><Text style={styles.body}>{intervention.exercise.pedagogicalObjective}</Text>
        <Lines title="Réussite" values={intervention.exercise.successCriteria} />
        <UsefulDefaultVariables values={intervention.exercise.defaultVariables} />
        <Details title="Voir les précautions et détails">
          <Lines title="Arrêt" values={intervention.exercise.stopCriteria} />
          <Lines title="Ne pas utiliser lorsque" values={intervention.exercise.doNotUseWhen} />
        </Details>
      </Card>
      <Card title={`Technique — ${intervention.technique.name}`}>
        <Text style={styles.body}>{intervention.technique.principle}</Text>
        <Text style={styles.warning}>Supervision par un instructeur {intervention.technique.instructorRequired ? "requise" : "non requise"}.</Text>
        <Details title="Voir les indications et précautions">
          <Lines title="Indications" values={intervention.technique.indications} />
          <Lines title="Conditions de non-utilisation" values={intervention.technique.contraindications} />
        </Details>
      </Card>
    </> : null}

    {error ? <Text style={styles.error}>{error}</Text> : null}
    <Pressable onPress={() => router.replace(`/sessions/${sessionId}/series/${seriesId}`)}><Text style={styles.link}>Quitter le pilote et revenir à la série</Text></Pressable>
  </ScrollView>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={styles.card}><Text style={styles.section}>{title}</Text>{children}</View>;
}
function Lines({ title, values }: { title: string; values: readonly string[] }) {
  return <><Text style={styles.label}>{title}</Text>{values.map((value) => <Text key={value} style={styles.body}>• {value}</Text>)}</>;
}
function Choice({ selected, label, onPress, exclusive = false }: { selected: boolean; label: string; onPress(): void; exclusive?: boolean }) {
  return <Pressable style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}>
    <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{exclusive ? selected ? "●" : "○" : selected ? "☑" : "☐"} {label}</Text>
  </Pressable>;
}
function Details({ title, children }: { title: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  return <View style={styles.details}>
    <Pressable onPress={() => setExpanded((value) => !value)}><Text style={styles.link}>{expanded ? "Masquer les détails" : title}</Text></Pressable>
    {expanded ? children : null}
  </View>;
}
function UsefulDefaultVariables({ values }: { values: D4PilotIntervention["exercise"]["defaultVariables"] }) {
  if (values.supervision !== "instructor") return null;
  return <Text style={styles.help}>Conditions prévues : supervision par un instructeur.</Text>;
}

const styles = StyleSheet.create({
  page: { padding: 22, gap: 14, backgroundColor: colors.background },
  kicker: { color: colors.coral, fontWeight: "900", letterSpacing: 1 },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  section: { color: colors.navy, fontSize: 19, fontWeight: "900" },
  card: { backgroundColor: colors.surface, borderRadius: 14, padding: 16, gap: 10 },
  label: { color: colors.navy, fontWeight: "800", marginTop: 4 },
  body: { color: colors.text, lineHeight: 21 },
  help: { color: colors.muted, lineHeight: 20 },
  warning: { color: colors.coral, fontWeight: "700", lineHeight: 20 },
  error: { color: "#A92525", fontWeight: "800" },
  missing: { color: colors.warning, backgroundColor: colors.warningBackground, borderRadius: 10, padding: 10, lineHeight: 19 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11, color: colors.text, backgroundColor: "#FFF" },
  multiline: { minHeight: 74, textAlignVertical: "top" },
  choice: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 11 },
  choiceSelected: { borderColor: colors.teal, backgroundColor: "#E8F5F2" },
  choiceText: { color: colors.text, fontWeight: "600" },
  choiceTextSelected: { color: colors.navy, fontWeight: "800" },
  primary: { backgroundColor: colors.teal, borderRadius: 10, padding: 13, alignItems: "center" },
  primaryText: { color: "#FFF", fontWeight: "900" },
  disabled: { opacity: 0.4 },
  link: { color: colors.teal, fontWeight: "800", textAlign: "center", padding: 10 },
  details: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
});
