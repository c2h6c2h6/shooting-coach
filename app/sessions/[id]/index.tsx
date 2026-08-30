import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { lateralityLabels } from "../../../src/domain/profile";
import { Series } from "../../../src/domain/series";
import { SeriesMetrics } from "../../../src/domain/seriesMetrics";
import { formatDistance, Session } from "../../../src/domain/session";
import { useSeries } from "../../../src/ui/SeriesProvider";
import { useSessions } from "../../../src/ui/SessionProvider";
import { useSeriesMetrics } from "../../../src/ui/SeriesMetricsProvider";
import { colors, layout, shadows } from "../../../src/ui/theme";
import { ShootingObservation } from "../../../src/domain/shootingObservation";
import { observationLabelsFr } from "../../../src/domain/observationCatalog";
import { useShootingObservations } from "../../../src/ui/ShootingObservationProvider";
import { useCoaching } from "../../../src/ui/CoachingProvider";
import { CoachingCycle } from "../../../src/domain/coachingTypes";
import { exportFullBackup, exportSessionJson } from "../../../src/application/localExportService";
import { getDatabase } from "../../../src/infrastructure/database/sqlite";
import { loadSessionEvolutionMetrics } from "../../../src/ui/sessionEvolutionMetrics";
import { repeatedObservationRows } from "../../../src/ui/repeatedObservationPresentation";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getById, start, complete } = useSessions();
  const { listBySession, start: startSeries } = useSeries();
  const { calculate, getLatest } = useSeriesMetrics();
  const { repeated } = useShootingObservations();
  const coaching = useCoaching();
  const [session, setSession] = useState<Session | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [metrics, setMetrics] = useState<Record<string, SeriesMetrics>>({});
  const [repeatedObservations, setRepeatedObservations] = useState<ShootingObservation[]>([]);
  const [coachingCycle, setCoachingCycle] = useState<CoachingCycle | null>(null);
  const [showDataTools, setShowDataTools] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const nextSession = await getById(id);
      setSession(nextSession);
      if (nextSession) {
        const nextSeries = await listBySession(id);
        setSeries(nextSeries);
        setMetrics(await loadSessionEvolutionMetrics(nextSeries, { calculate, getLatest }));
        setRepeatedObservations(await repeated(id));
        setCoachingCycle((await coaching.active(id))?.cycle ?? null);
      }
      setError("");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(`Chargement de la séance impossible : ${message}`);
    }
  }, [calculate, coaching, getById, getLatest, id, listBySession, repeated]);
  useEffect(() => { void load(); }, [load]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  if (!session) return <ActivityIndicator style={{ flex: 1 }} size="large" />;

  async function startSession() {
    const currentSession = session;
    if (!currentSession) return;
    try {
      const active = await start(currentSession.id);
      const nextSeries = await listBySession(currentSession.id);
      setSession(active);
      setSeries(nextSeries);
      const reference = nextSeries.find((item) => item.type === "reference");
      if (reference) {
        const available = reference.status === "planned" ? await startSeries(reference.id) : reference;
        router.replace(`/sessions/${currentSession.id}/series/${available.id}/impacts`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Démarrage impossible.");
    }
  }

  async function openSeries(item: Series) {
    const currentSession = session;
    if (!currentSession) return;
    try {
      if (item.status === "planned") {
        const started = await startSeries(item.id);
        router.push(`/sessions/${currentSession.id}/series/${started.id}/impacts`);
        return;
      }
      if (item.status === "active") {
        router.push(`/sessions/${currentSession.id}/series/${item.id}/impacts`);
        return;
      }
      router.push(`/sessions/${currentSession.id}/series/${item.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La série ne peut pas être ouverte.");
    }
  }

  async function completeSession() {
    if (!session) return;
    try {
      await complete(session.id);
      router.dismissTo("/");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "";
      setError(
        message.includes("série en cours")
          ? "Terminez d’abord la série en cours."
          : message.includes("Séance introuvable")
            ? "Cette séance est introuvable. Revenez à l’historique puis réessayez."
            : "La séance n’a pas pu être clôturée. Vos données restent enregistrées ; réessayez depuis l’historique.",
      );
    }
  }

  function confirmComplete() {
    Alert.alert(
      "Terminer la séance ?",
      "La séance et toutes ses séries resteront enregistrées dans l’historique du profil.",
      [
        { text: "Continuer la séance", style: "cancel" },
        { text: "Terminer", onPress: () => void completeSession() },
      ],
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.status}>{session.status === "draft" ? "SÉANCE EN PRÉPARATION" : session.status === "completed" ? "SÉANCE TERMINÉE" : "SÉANCE EN COURS"}</Text>
      <Text style={styles.title}>{session.mode === "coaching_free" ? "Coaching libre" : "Entraînement"}</Text>
      <View style={styles.card}>
        <Text style={styles.value}>{session.shooterDisplayName}</Text>
        <Text style={styles.body}>{lateralityLabels[session.shooterLaterality]}</Text>
        <Text style={styles.value}>{session.weaponName} · {formatDistance(session.distanceMm)}</Text>
        <Text style={styles.body}>Nombre de mains : {session.numberOfHands === null ? "non renseigné" : session.numberOfHands === 1 ? "1 main" : "2 mains"}</Text>
        <Text style={styles.body}>{session.targetTypeName}</Text>
        {session.objectiveLabel ? <Text style={styles.body}>Objectif : {session.objectiveLabel}</Text> : null}
      </View>
      {session.status === "draft" ? (
        <Pressable style={styles.primary} onPress={() => void startSession()}>
          <Text style={styles.primaryText}>Démarrer la séance</Text>
        </Pressable>
      ) : (
        <>
          <View style={styles.seriesHeader}>
            <Text style={styles.sectionTitle}>Séries</Text>
            {session.status === "active" ? <Pressable
              style={styles.secondary}
              onPress={() => router.push(`/sessions/${session.id}/series/new`)}
            >
              <Text style={styles.secondaryText}>Ajouter</Text>
            </Pressable> : null}
          </View>
          {series.length === 0 ? <Text style={styles.help}>Aucune série pour le moment. Ajoutez-en une pour commencer.</Text> : null}
          {series.map((item) => (
            <Pressable
              key={item.id}
              style={styles.seriesCard}
              onPress={() => void openSeries(item)}
            >
              <Text style={styles.value}>Série {item.sequenceNumber} · {typeLabels[item.type]}</Text>
              <View style={styles.seriesMeta}>
                <Text style={[styles.badge, badgeStyle[item.status]]}>{statusLabels[item.status]}</Text>
                <Text style={styles.body}>{item.recordedShotCount} tiré(s) sur {item.expectedShotCount} prévu(s)</Text>
              </View>
              {item.status === "planned" || item.status === "active"
                ? <Text style={styles.seriesAction}>Saisir les impacts</Text>
                : null}
            </Pressable>
          ))}
          {coachingCycle ? <Pressable style={styles.card} onPress={() =>
            router.push(`/sessions/${session.id}/series/${coachingCycle.sourceSeriesId}/coaching`)}>
            <Text style={styles.sectionTitle}>Cycle de coaching en cours</Text>
            <Text style={styles.body}>Étape actuelle : {cycleLabels[coachingCycle.status]}</Text>
            <Text style={styles.help}>Touchez pour reprendre la prochaine action.</Text>
          </Pressable> : null}
          {coachingCycle ? <Pressable style={styles.secondary} onPress={() =>
            router.push({pathname:"/sessions/[id]/feedback" as never,params:{id:session.id,cycleId:coachingCycle.id,hypothesisId:coachingCycle.hypothesisId}} as never)}>
            <Text style={styles.secondaryText}>Retour tireur / instructeur / signalement</Text>
          </Pressable> : null}
          <Evolution series={series} metrics={metrics} />
          {repeatedObservations.length ? <View style={styles.card}>
            <Text style={styles.sectionTitle}>Observations répétées pendant cette séance</Text>
            {repeatedObservationRows(repeatedObservations).map((item) => <Text key={item.observationCode} style={styles.body}>
              • {observationLabelsFr[item.observationCode]} ({item.seriesCount} séries)
            </Text>)}
            <Text style={styles.help}>Constats limités à cette séance, sans interprétation technique.</Text>
          </View> : null}
          <Pressable style={styles.dataToggle} onPress={() => setShowDataTools((value) => !value)}>
            <Text style={styles.dataToggleText}>{showDataTools ? "Masquer les données et exports" : "Données et exports"}</Text>
          </Pressable>
          {showDataTools ? <View style={styles.dataTools}>
            <Pressable style={styles.secondary} onPress={async()=>{try{await exportSessionJson(await getDatabase(),session.id)}catch(reason){setError(reason instanceof Error?reason.message:"Export impossible.")}}}>
              <Text style={styles.secondaryText}>Exporter le rapport JSON de la séance</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={async()=>{try{await exportFullBackup(await getDatabase())}catch(reason){setError(reason instanceof Error?reason.message:"Sauvegarde impossible.")}}}>
              <Text style={styles.secondaryText}>Sauvegarder toutes les données locales</Text>
            </Pressable>
          </View> : null}
          {session.status === "active" ? <Pressable style={styles.completeButton} onPress={confirmComplete}>
            <Text style={styles.completeText}>Terminer la séance</Text>
          </Pressable> : <Pressable style={styles.primary} onPress={() => router.dismissTo("/")}>
            <Text style={styles.primaryText}>Retour au menu principal</Text>
          </Pressable>}
        </>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

function Evolution({ series, metrics }: { series: Series[]; metrics: Record<string, SeriesMetrics> }) {
  const completed = series.filter((item) => item.status === "completed");
  if (!completed.length) return <View style={styles.card}>
    <Text style={styles.sectionTitle}>Évolution des séries</Text>
    <Text style={styles.help}>Aucune comparaison disponible : aucune série achevée.</Text>
  </View>;
  const reference = completed.find((item) => item.type === "reference");
  const format = (value: number | null | undefined) => value == null ? "—" : `${(value * 100).toFixed(1)} %`;
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>Évolution des séries</Text>
    {completed.map((item) => {
      const value = metrics[item.id];
      return <View key={item.id} style={styles.evolutionRow}>
        <Text style={styles.value}>Série {item.sequenceNumber} · {typeLabels[item.type]}</Text>
        {value ? <>
          <Text style={styles.body}>{value.includedImpactCount} impact(s) inclus</Text>
          <Text style={styles.body}>Centre : {format(value.normalized.centroidDistanceToTargetCenter)} · diamètre : {format(value.normalized.extremeSpread)} · rayon : {format(value.normalized.meanRadius)}</Text>
        </> : <Text style={styles.help}>Métriques indisponibles pour cette série.</Text>}
        <Text style={styles.help}>{reference && item.id !== reference.id ? "Comparaison avec la référence disponible" : item.id === reference?.id ? "Référence initiale" : "Comparaison avec la référence indisponible"}</Text>
      </View>;
    })}
    <Text style={styles.help}>Valeurs en proportions de la zone tant que la géométrie physique n’est pas vérifiée.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: layout.pagePadding, gap: layout.sectionGap },
  status: { color: colors.coral, fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  title: { color: colors.navy, fontSize: 30, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 18, gap: 7, ...shadows.card },
  value: { color: colors.navy, fontWeight: "800", fontSize: 18 },
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  primary: { backgroundColor: colors.teal, borderRadius: layout.radius, padding: 16, alignItems: "center", minHeight: layout.controlHeight },
  primaryText: { color: colors.surface, fontWeight: "800", fontSize: 16 },
  help: { color: colors.muted, lineHeight: 21, backgroundColor: colors.surface, borderRadius: 12, padding: 16 },
  seriesHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.navy, fontSize: 22, fontWeight: "800" },
  secondary: { borderWidth: 1, borderColor: colors.teal, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: colors.teal, fontWeight: "800" },
  seriesCard: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 16, gap: 9, ...shadows.card },
  seriesMeta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9 },
  seriesAction: { color: colors.teal, fontWeight: "800" },
  badge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4, fontWeight: "800", fontSize: 12, overflow: "hidden" },
  badgePlanned: { color: colors.navySoft, backgroundColor: "#E8EEF3" },
  badgeActive: { color: colors.teal, backgroundColor: colors.tealSoft },
  badgeCompleted: { color: "#3D5A40", backgroundColor: "#E7F1E8" },
  badgeCancelled: { color: colors.danger, backgroundColor: colors.dangerBackground },
  error: { color: colors.danger, backgroundColor: colors.dangerBackground, borderRadius: 10, padding: 12, fontWeight: "700" },
  completeButton: { borderWidth: 1, borderColor: colors.coral, borderRadius: layout.radius, padding: 16, alignItems: "center" },
  completeText: { color: colors.coral, fontWeight: "800", fontSize: 16 },
  evolutionRow: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 2 },
  dataToggle: { paddingVertical: 8, alignItems: "center" },
  dataToggleText: { color: colors.muted, fontWeight: "700" },
  dataTools: { gap: 8 },
});

const typeLabels = {
  reference: "Référence",
  diagnostic: "Diagnostic",
  corrective: "Corrective",
  consolidation: "Consolidation",
  progression: "Progression",
} as const;

const statusLabels = {
  planned: "Planifiée",
  active: "Active",
  completed: "Terminée",
  cancelled: "Annulée",
} as const;

const badgeStyle = {
  planned: styles.badgePlanned,
  active: styles.badgeActive,
  completed: styles.badgeCompleted,
  cancelled: styles.badgeCancelled,
} as const;
const cycleLabels:Record<CoachingCycle["status"],string>={proposed:"proposé",test_pending:"test à réaliser",
 test_completed:"test terminé",drill_pending:"travail proposé",drill_in_progress:"exercice en cours",
 control_series_pending:"série de contrôle à réaliser",evaluation_pending:"évaluation en attente",
 completed:"terminé",cancelled:"annulé"};
