import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ComparisonOption } from "../../../../../src/application/seriesComparisonRepository";
import { buildComparisonSummary } from "../../../../../src/domain/comparisonSummary";
import { NumericMetricKey, SeriesComparison } from "../../../../../src/domain/seriesComparison";
import { useSeries } from "../../../../../src/ui/SeriesProvider";
import { useSeriesComparisons } from "../../../../../src/ui/SeriesComparisonProvider";
import { colors, layout, shadows } from "../../../../../src/ui/theme";
import { ObservationResult } from "../../../../../src/domain/shootingObservation";
import { observationLabelsFr } from "../../../../../src/domain/observationCatalog";
import { useShootingObservations } from "../../../../../src/ui/ShootingObservationProvider";

const metricLabels: Record<NumericMetricKey, string> = {
  horizontalOffset: "Décalage horizontal", verticalOffset: "Décalage vertical",
  centroidDistanceToTargetCenter: "Centre moyen → centre cible",
  spreadWidth: "Largeur", spreadHeight: "Hauteur", extremeSpread: "Diamètre maximal",
  meanRadius: "Rayon moyen", meanDistanceToTargetCenter: "Distance moyenne au centre",
};
export default function CompareSeriesScreen() {
  const { seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const { options, compare } = useSeriesComparisons();
  const { getById } = useSeries();
  const { forComparison } = useShootingObservations();
  const [choices, setChoices] = useState<ComparisonOption[]>([]);
  const [result, setResult] = useState<SeriesComparison | null>(null);
  const [observations, setObservations] = useState<ObservationResult | null>(null);
  const [numbers, setNumbers] = useState({ baseline: 0, compared: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useFocusEffect(useCallback(() => {
    setLoading(true);
    void Promise.all([options(seriesId), getById(seriesId)]).then(([next, current]) => {
      setChoices(next); setNumbers((value) => ({ ...value, compared: current?.sequenceNumber ?? 0 }));
    }).finally(() => setLoading(false));
  }, [getById, options, seriesId]));

  async function run(choice: ComparisonOption) {
    setLoading(true);
    try {
      const comparison = await compare(choice.baselineSeriesId, seriesId, choice.type);
      setResult(comparison);
      setObservations(await forComparison(comparison.id));
      setNumbers({ baseline: choice.baselineSequenceNumber, compared: numbers.compared });
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Comparaison impossible.");
    } finally { setLoading(false); }
  }
  if (loading && !result) return <ActivityIndicator style={{ flex: 1 }} size="large" />;
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.step}>COMPARAISON FACTUELLE</Text>
    <Text style={styles.title}>Qu’est-ce qui a changé ?</Text>
    {!result ? <View style={styles.card}>
      <Text style={styles.sectionTitle}>Choisir la référence</Text>
      {!choices.length ? <Text style={styles.help}>Comparaison indisponible : aucune série terminée antérieure exploitable.</Text> : null}
      {choices.map((choice) => <Pressable key={choice.type} style={styles.primary} onPress={() => void run(choice)}>
        <Text style={styles.primaryText}>{choice.type === "reference" ? "Comparer à la série de référence" : "Comparer à la série précédente"} · série {choice.baselineSequenceNumber}</Text>
      </Pressable>)}
    </View> : <ComparisonResult result={result} baseline={numbers.baseline}
      compared={numbers.compared} observations={observations} />}
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </ScrollView>;
}

function ComparisonResult({ result, baseline, compared, observations }: {
  result: SeriesComparison; baseline: number; compared: number; observations: ObservationResult | null;
}) {
  const format = (value: number) => result.unit === "mm" ? `${value.toFixed(1)} mm` : `${(value * 100).toFixed(1)} %`;
  return <>
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Série {baseline} → série {compared}</Text>
      <Text style={styles.body}>Écart calculé : série comparée − série de référence.</Text>
      <Text style={styles.body}>Statut : {statusLabels[result.status]} · Fiabilité factuelle : {reliabilityLabels[result.reliability]}</Text>
      <Text style={styles.body}>Impacts inclus : {result.counts.includedImpactCount.baselineValue} → {result.counts.includedImpactCount.comparedValue}</Text>
      <Text style={styles.body}>Impacts exclus : {result.counts.excludedImpactCount.baselineValue} → {result.counts.excludedImpactCount.comparedValue}</Text>
    </View>
    {result.reasons.length || result.limitations.length ? <View style={styles.card}>
      <Text style={styles.sectionTitle}>Limites</Text>
      {[...result.reasons, ...result.limitations].map((item) => <Text key={item} style={styles.help}>• {item}</Text>)}
    </View> : null}
    {result.status !== "not_comparable" ? <View style={styles.card}>
      <Text style={styles.sectionTitle}>Centres moyens</Text>
      <View style={styles.targets}>
        <TargetMini label={`Série ${baseline} · référence`}
          x={result.differences.horizontalOffset?.baselineValue}
          y={result.differences.verticalOffset?.baselineValue} color={colors.coral} />
        <TargetMini label={`Série ${compared} · comparée`}
          x={result.differences.horizontalOffset?.comparedValue}
          y={result.differences.verticalOffset?.comparedValue} color={colors.teal} />
      </View>
    </View> : null}
    {result.status !== "not_comparable" ? <View style={styles.card}>
      <Text style={styles.sectionTitle}>Valeurs et écarts</Text>
      {(Object.keys(metricLabels) as NumericMetricKey[]).map((key) => {
        const item = result.differences[key];
        if (!item) return null;
        return <View key={key} style={styles.row}>
          <Text style={styles.rowTitle}>{metricLabels[key]}</Text>
          <Text style={styles.body}>{format(item.baselineValue)} → {format(item.comparedValue)}</Text>
          <Text style={styles.delta}>Δ {item.delta >= 0 ? "+" : ""}{format(item.delta)} · {variationLabels[item.variation]}</Text>
          <Text style={styles.help}>{item.relativePercent == null ? item.percentageLimitation : `${item.relativePercent >= 0 ? "+" : ""}${item.relativePercent.toFixed(0)} % relatif`}</Text>
        </View>;
      })}
      <Text style={styles.body}>Forme : {result.shape.baselineValue} → {result.shape.comparedValue}</Text>
    </View> : null}
    <View style={styles.card}><Text style={styles.sectionTitle}>Synthèse factuelle</Text>
      {buildComparisonSummary(result).map((line) => <Text key={line} style={styles.body}>{line}</Text>)}
    </View>
    {observations ? <ComparisonObservations result={observations} /> : null}
  </>;
}

function ComparisonObservations({ result }: { result: ObservationResult }) {
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>Ce qui a changé</Text>
    {result.primary ? <Text style={styles.rowTitle}>{observationLabelsFr[result.primary.observationCode]}</Text> : null}
    {result.secondary.map((item) => <Text key={item.observationCode} style={styles.body}>
      • {observationLabelsFr[item.observationCode]}
    </Text>)}
    {result.limitations.map((item) => <Text key={item.observationCode} style={styles.help}>
      • {observationLabelsFr[item.observationCode]}
    </Text>)}
  </View>;
}
function TargetMini({ label, x, y, color }: { label: string; x?: number; y?: number; color: string }) {
  const left = `${Math.max(0, Math.min(100, ((x ?? 0) + .5) * 100))}%` as `${number}%`;
  const top = `${Math.max(0, Math.min(100, (.5 - (y ?? 0)) * 100))}%` as `${number}%`;
  return <View style={styles.targetColumn}>
    <View style={styles.target}>
      <View style={styles.horizontalAxis} /><View style={styles.verticalAxis} />
      {x != null && y != null ? <View style={[styles.centroid, { left, top, backgroundColor: color }]} /> : null}
    </View>
    <Text style={styles.help}>{label}</Text>
  </View>;
}
const statusLabels = { comparable: "comparable", partially_comparable: "partiellement comparable", not_comparable: "non comparable" };
const reliabilityLabels = { limited: "limitée", acceptable: "acceptable", reinforced: "renforcée" };
const variationLabels = { stable: "stable", slight: "légère", notable: "notable" };
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: layout.pagePadding, gap: 15 },
  step: { color: colors.coral, fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  title: { color: colors.navy, fontSize: 28, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 18, gap: 12, ...shadows.card },
  sectionTitle: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  body: { color: colors.text, fontSize: 15, lineHeight: 21 },
  help: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  primary: { backgroundColor: colors.teal, borderRadius: layout.radius, padding: 15 },
  primaryText: { color: colors.surface, fontWeight: "800", textAlign: "center" },
  row: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, gap: 3 },
  rowTitle: { color: colors.navy, fontWeight: "800" },
  delta: { color: colors.teal, fontWeight: "800" },
  error: { color: colors.danger, backgroundColor: colors.dangerBackground, borderRadius: 10, padding: 12 },
  targets: { flexDirection: "row", gap: 16 },
  targetColumn: { flex: 1, alignItems: "center", gap: 6 },
  target: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, position: "relative", overflow: "hidden" },
  horizontalAxis: { position: "absolute", left: 0, right: 0, top: 59, height: 1, backgroundColor: colors.border },
  verticalAxis: { position: "absolute", top: 0, bottom: 0, left: 59, width: 1, backgroundColor: colors.border },
  centroid: { position: "absolute", width: 12, height: 12, borderRadius: 6, marginLeft: -6, marginTop: -6 },
});
