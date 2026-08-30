import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Impact } from "../../../../../src/domain/impact";
import { isInsideNormalized, normalizedToScreen, screenToNormalized, Size, ViewTransform } from "../../../../../src/domain/targetGeometry";
import { useImpacts } from "../../../../../src/ui/ImpactProvider";
import { useSeries } from "../../../../../src/ui/SeriesProvider";
import { useSeriesMetrics } from "../../../../../src/ui/SeriesMetricsProvider";
import { calculateSeriesMetrics } from "../../../../../src/domain/seriesMetrics";
import { UNVERIFIED_TARGET_GEOMETRY_VERSION } from "../../../../../src/domain/targetCoordinateConversion";
import { impactsNear, nextOverlappingImpactId } from "../../../../../src/domain/overlappingImpacts";
import { colors, layout, shadows } from "../../../../../src/ui/theme";
import { useShootingObservations } from "../../../../../src/ui/ShootingObservationProvider";
import { useTechnicalHypotheses } from "../../../../../src/ui/TechnicalHypothesisProvider";
import {
  analyzeSeries,
  requiresRecordedShotCountConfirmation,
  suggestedRecordedShotCount,
} from "../../../../../src/ui/analyzeSeriesFlow";

type Mode = "add" | "select" | "navigate";
const targetSize: Size = { width: 1, height: 1 };

export default function ImpactEntryScreen() {
  const { id: sessionId, seriesId } =
    useLocalSearchParams<{ id: string; seriesId: string }>();
  const impactsService = useImpacts();
  const { getById, complete } = useSeries();
  const { invalidate, calculate } = useSeriesMetrics();
  const observationsService = useShootingObservations();
  const hypothesesService = useTechnicalHypotheses();
  const [series, setSeries] = useState<Awaited<ReturnType<typeof getById>>>(null);
  const [impacts, setImpacts] = useState<Impact[]>([]);
  const [history, setHistory] = useState<Impact[][]>([]);
  const [future, setFuture] = useState<Impact[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("add");
  const [size, setSize] = useState<Size>(targetSize);
  const [view, setView] = useState<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const [error, setError] = useState("");
  const [confirmShotCount, setConfirmShotCount] = useState(false);
  const [recordedShotCount, setRecordedShotCount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const isEditable = series?.status === "active";

  useEffect(() => {
    void Promise.all([getById(seriesId), impactsService.listBySeries(seriesId)]).then(([s, saved]) => {
      setSeries(s); setImpacts(saved);
    });
  }, [getById, impactsService, seriesId]);

  function change(next: Impact[]) {
    setHistory((items) => [...items, impacts]); setFuture([]); setImpacts(next);
  }
  function undo() {
    const previous = history.at(-1); if (!previous) return;
    setFuture((items) => [impacts, ...items]); setImpacts(previous); setHistory((items) => items.slice(0, -1));
  }
  function redo() {
    const next = future[0]; if (!next) return;
    setHistory((items) => [...items, impacts]); setImpacts(next); setFuture((items) => items.slice(1));
  }
  function targetPress(x: number, y: number) {
    if (!series || !isEditable || mode === "navigate") return;
    const point = screenToNormalized({ x, y }, size, view);
    if (!isInsideNormalized(point)) return;
    if (mode === "add") {
      addImpact(point.x, point.y);
    } else if (selectedId) {
      change(impacts.map((item) => item.id === selectedId ?
        { ...item, normalizedX: point.x, normalizedY: point.y, updatedAt: new Date().toISOString() } : item));
    }
  }
  function addImpact(normalizedX: number, normalizedY: number) {
    const sequenceNumber = impacts.reduce((max, item) => Math.max(max, item.sequenceNumber), 0) + 1;
    const timestamp = new Date().toISOString();
    change([...impacts, {
      id: randomUUID(), seriesId, sequenceNumber, normalizedX, normalizedY,
      source: "manual", confidence: null, physicalXmm: null, physicalYmm: null,
      targetX: null, targetY: null, isExcluded: false, exclusionReason: null,
      createdAt: timestamp, updatedAt: timestamp,
    }]);
  }
  function impactPress(impact: Impact, localX: number, localY: number) {
    if (!isEditable) return;
    const center = normalizedToScreen({ x: impact.normalizedX, y: impact.normalizedY }, size, view);
    if (mode === "add") {
      const point = screenToNormalized({
        x: center.x + localX - 17,
        y: center.y + localY - 17,
      }, size, view);
      if (isInsideNormalized(point)) addImpact(point.x, point.y);
      return;
    }
    if (mode === "select") {
      const normalizedRadius = 12 / Math.max(1, size.width * view.zoom);
      const candidates = impactsNear(
        impacts,
        impact.normalizedX,
        impact.normalizedY,
        normalizedRadius,
      );
      setSelectedId(nextOverlappingImpactId(candidates, selectedId));
    }
  }
  function removeSelected() {
    if (!selectedId) return;
    change(impacts.filter((item) => item.id !== selectedId)); setSelectedId(null);
  }
  function toggleExcluded() {
    if (!selectedId) return;
    change(impacts.map((item) => item.id === selectedId
      ? {
        ...item,
        isExcluded: !item.isExcluded,
        exclusionReason: item.isExcluded ? null : "Exclusion manuelle confirmée par l’utilisateur",
        updatedAt: new Date().toISOString(),
      }
      : item));
  }
  async function finishAndAnalyze(count: number) {
    if (!series) return;
    if (!Number.isInteger(count) || count < 0 || count > 50) {
      setError("Indiquez un nombre de coups réellement tirés compris entre 0 et 50.");
      return;
    }
    setAnalyzing(true);
    setError("");
    try {
      await analyzeSeries({ series, impacts, recordedShotCount: count }, {
        saveImpacts: impactsService.replaceForEditableSeries,
        invalidateMetrics: invalidate,
        completeSeries: complete,
        calculateMetrics: calculate,
        generateObservations: observationsService.forSeries,
        generateHypotheses: hypothesesService.forSeries,
      });
      router.replace(`/sessions/${sessionId}/series/${seriesId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La série n’a pas pu être analysée.");
      setAnalyzing(false);
    }
  }
  function requestAnalysis() {
    if (!series) return;
    if (requiresRecordedShotCountConfirmation(series, impacts)) {
      setRecordedShotCount(String(suggestedRecordedShotCount(series, impacts)));
      setConfirmShotCount(true);
      setError("");
      return;
    }
    void finishAndAnalyze(series.expectedShotCount);
  }
  if (!series) return <View style={styles.page}><Text>Série introuvable.</Text></View>;
  const difference = impacts.length - series.expectedShotCount;
  const previewMetrics = calculateSeriesMetrics({
    impacts,
    expectedShotCount: series.expectedShotCount,
    recordedShotCount: series.recordedShotCount,
    geometry: {
      version: UNVERIFIED_TARGET_GEOMETRY_VERSION,
      widthMm: null, heightMm: null, centerNormalizedX: .5, centerNormalizedY: .5,
    },
  });
  const centroid = previewMetrics.normalized.centroidX == null ? null : normalizedToScreen({
    x: previewMetrics.normalized.centroidX + .5,
    y: .5 - (previewMetrics.normalized.centroidY ?? 0),
  }, size, view);
  return <ScrollView contentContainerStyle={styles.page}>
    <Text style={styles.eyebrow}>SÉRIE {series.sequenceNumber} · {typeLabels[series.type]}</Text>
    <Text style={styles.title}>Placement manuel</Text>
    <View style={styles.counterCard}>
      <Text style={styles.counter}>{impacts.length} / {series.expectedShotCount}</Text>
      <Text style={styles.counterLabel}>impacts placés / coups prévus</Text>
      <Text style={styles.declared}>Les coups réellement tirés seront enregistrés lors de l’analyse.</Text>
    </View>
    {difference !== 0 ? <View style={styles.warningBox}><Text style={styles.warning}>
      {difference > 0 ? `${difference} impact(s) de plus que prévu.` : `${Math.abs(difference)} impact(s) encore manquant(s).`} Le nombre de coups réellement tirés devra être confirmé.
    </Text></View> : null}
    {isEditable ? <View style={styles.modes}>
      {(["add", "select", "navigate"] as Mode[]).map((item) =>
        <Pressable key={item} style={[styles.mode, mode === item && styles.modeActive]} onPress={() => setMode(item)}>
          <Text style={mode === item ? styles.modeActiveText : styles.modeText}>
            {item === "add" ? "Ajouter" : item === "select" ? "Sélectionner/déplacer" : "Naviguer"}
          </Text>
        </Pressable>)}
    </View> : null}
    <Pressable
      style={styles.target}
      onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
      onPress={(event) => targetPress(event.nativeEvent.locationX, event.nativeEvent.locationY)}>
      {[0.82, 0.62, 0.42, 0.22].map((ratio) => <View key={ratio} pointerEvents="none" style={[
        styles.ring, { width: size.width * ratio * view.zoom, height: size.width * ratio * view.zoom,
          borderRadius: size.width * ratio, transform: [{ translateX: view.panX }, { translateY: view.panY }] }]} />)}
      <View pointerEvents="none" style={[styles.crossH, { transform: [{ translateX: view.panX }, { translateY: view.panY }] }]} />
      <View pointerEvents="none" style={[styles.crossV, { transform: [{ translateX: view.panX }, { translateY: view.panY }] }]} />
      {impacts.map((impact) => {
        const point = normalizedToScreen({ x: impact.normalizedX, y: impact.normalizedY }, size, view);
        return <Pressable key={impact.id} onPress={(event) =>
          impactPress(impact, event.nativeEvent.locationX, event.nativeEvent.locationY)}
          style={[styles.impact, impact.isExcluded && styles.excluded,
            previewMetrics.potentiallyAtypicalImpactIds.includes(impact.id) && styles.atypical,
            { left: point.x - 14, top: point.y - 14 }, selectedId === impact.id && styles.selected]}>
          <Text style={styles.impactText}>{impact.sequenceNumber}</Text>
        </Pressable>;
      })}
      {centroid ? <View pointerEvents="none" style={[styles.centroid, { left: centroid.x - 8, top: centroid.y - 8 }]} /> : null}
    </Pressable>
    {isEditable ? <Text style={styles.help}>{mode === "add" ? "Touchez la cible, même sur un impact existant, pour en ajouter un autre." :
      mode === "select" ? "Touchez plusieurs fois des impacts superposés pour les parcourir, puis touchez leur nouvelle position." :
      "Navigation séparée : aucun impact ne peut être créé."}</Text> :
      <Text style={styles.help}>Consultation uniquement : une série terminée ne peut plus être modifiée.</Text>}
    {isEditable ? <View style={styles.controls}>
      <Pressable style={styles.smallButton} disabled={history.length === 0} onPress={undo}><Text>Annuler</Text></Pressable>
      <Pressable style={styles.smallButton} disabled={future.length === 0} onPress={redo}><Text>Rétablir</Text></Pressable>
      <Pressable style={styles.smallButton} onPress={() => setView({ zoom: 1, panX: 0, panY: 0 })}><Text>Recentrer</Text></Pressable>
      <Pressable disabled={!selectedId} style={[styles.smallButton, !selectedId && styles.disabled]} onPress={removeSelected}><Text style={styles.smallButtonText}>Supprimer l’impact</Text></Pressable>
      <Pressable disabled={!selectedId} style={[styles.smallButton, !selectedId && styles.disabled]} onPress={toggleExcluded}>
        <Text style={styles.smallButtonText}>{impacts.find((item) => item.id === selectedId)?.isExcluded ? "Réintégrer" : "Exclure des mesures"}</Text>
      </Pressable>
    </View> : null}
    {isEditable && mode === "navigate" ? <View style={styles.controls}>
      <Pressable style={styles.smallButton} onPress={() => setView((v) => ({ ...v, zoom: Math.min(4, v.zoom + 0.5) }))}><Text>Zoom +</Text></Pressable>
      <Pressable style={styles.smallButton} onPress={() => setView((v) => ({ ...v, zoom: Math.max(1, v.zoom - 0.5) }))}><Text>Zoom −</Text></Pressable>
      {([["←", -25, 0], ["→", 25, 0], ["↑", 0, -25], ["↓", 0, 25]] as const).map(([label, x, y]) =>
        <Pressable key={label} style={styles.smallButton} onPress={() => setView((v) => ({ ...v, panX: v.panX + x, panY: v.panY + y }))}><Text>{label}</Text></Pressable>)}
    </View> : null}
    {!isEditable ? <Text style={styles.warning}>Cette série est en lecture seule.</Text> : null}
    {isEditable && confirmShotCount ? <View style={styles.confirmationCard}>
      <Text style={styles.confirmationTitle}>Confirmez le nombre de coups réellement tirés</Text>
      <Text style={styles.help}>Les {impacts.length} impacts placés ne suffisent pas à lever l’ambiguïté, notamment en présence d’un impact exclu ou d’un tir hors cible.</Text>
      <TextInput style={styles.input} value={recordedShotCount} onChangeText={setRecordedShotCount}
        keyboardType="number-pad" accessibilityLabel="Nombre de coups réellement tirés" />
      <Pressable disabled={analyzing} style={[styles.confirm, analyzing && styles.disabled]}
        onPress={() => void finishAndAnalyze(Number(recordedShotCount))}>
        <Text style={styles.confirmText}>{analyzing ? "Analyse…" : "Valider et analyser"}</Text>
      </Pressable>
      <Pressable onPress={() => setConfirmShotCount(false)}><Text style={styles.link}>Revenir aux impacts</Text></Pressable>
    </View> : null}
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {isEditable && !confirmShotCount ? <Pressable disabled={analyzing} style={[styles.confirm, analyzing && styles.disabled]}
      onPress={requestAnalysis}>
      <Text style={styles.confirmText}>{analyzing ? "Analyse…" : "Analyser la série"}</Text>
    </Pressable> : null}
    <Pressable onPress={() => router.replace(`/sessions/${sessionId}/series/${seriesId}`)}>
      <Text style={styles.link}>{isEditable ? "Annuler les modifications" : "Retour"}</Text>
    </Pressable>
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, padding: 14, gap: 12 },
  eyebrow: { color: colors.coral, fontWeight: "800", fontSize: 12, letterSpacing: 0.8 }, title: { fontSize: 28, fontWeight: "800", color: colors.navy },
  counterCard: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 12, alignItems: "center", ...shadows.card },
  counter: { fontSize: 28, fontWeight: "900", color: colors.navy },
  counterLabel: { color: colors.muted, fontWeight: "700" },
  declared: { color: colors.text, marginTop: 5, fontSize: 13 },
  confirmationCard: { backgroundColor: colors.warningBackground, borderRadius: layout.radius, padding: 14, gap: 10 },
  confirmationTitle: { color: colors.navy, fontSize: 18, fontWeight: "900" },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 17 },
  warningBox: { backgroundColor: colors.warningBackground, borderRadius: 10, padding: 11 },
  warning: { color: colors.warning, fontWeight: "700", lineHeight: 19 },
  modes: { flexDirection: "row", gap: 6 }, mode: { flex: 1, minHeight: 48, justifyContent: "center", padding: 7, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  modeActive: { backgroundColor: colors.navy, borderColor: colors.navy }, modeText: { color: colors.text, fontSize: 11, textAlign: "center", fontWeight: "700" },
  modeActiveText: { color: "white", fontSize: 11, fontWeight: "800", textAlign: "center" },
  target: { width: "100%", aspectRatio: 1, minHeight: 320, backgroundColor: colors.target, borderWidth: 3, borderColor: colors.navy, borderRadius: 8, overflow: "hidden" },
  ring: { position: "absolute", alignSelf: "center", top: "50%", marginTop: "-41%", borderWidth: 2, borderColor: "#63717D" },
  crossH: { position: "absolute", top: "50%", left: "42%", width: "16%", height: 1, backgroundColor: "#14213D" },
  crossV: { position: "absolute", left: "50%", top: "42%", height: "16%", width: 1, backgroundColor: "#14213D" },
  impact: { position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: "#C84B5A", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.surface },
  selected: { borderColor: colors.teal, borderWidth: 5, transform: [{ scale: 1.12 }] }, impactText: { color: colors.surface, fontWeight: "900" },
  excluded: { opacity: .38, borderStyle: "dashed" },
  atypical: { borderColor: colors.warning },
  centroid: { position: "absolute", width: 16, height: 16, borderRadius: 8, backgroundColor: colors.teal, borderWidth: 3, borderColor: colors.surface },
  help: { color: colors.text, textAlign: "center", lineHeight: 20 }, controls: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallButton: { minHeight: 44, justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  smallButtonText: { color: colors.text, fontWeight: "700" },
  confirm: { backgroundColor: colors.teal, borderRadius: layout.radius, padding: 16, alignItems: "center", minHeight: layout.controlHeight },
  confirmText: { color: colors.surface, fontWeight: "800", fontSize: 16 }, link: { textAlign: "center", color: colors.teal, fontWeight: "800" },
  disabled: { opacity: 0.4 },
  error: { color: colors.danger, backgroundColor: colors.dangerBackground, borderRadius: 10, padding: 12, fontWeight: "700" },
});

const typeLabels = {
  reference: "RÉFÉRENCE", diagnostic: "DIAGNOSTIC", corrective: "CORRECTIVE",
  consolidation: "CONSOLIDATION", progression: "PROGRESSION",
} as const;
