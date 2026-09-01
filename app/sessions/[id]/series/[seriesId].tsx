import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Series } from "../../../../src/domain/series";
import { SeriesMetrics } from "../../../../src/domain/seriesMetrics";
import { useSeries } from "../../../../src/ui/SeriesProvider";
import { useImpacts } from "../../../../src/ui/ImpactProvider";
import { useSeriesMetrics } from "../../../../src/ui/SeriesMetricsProvider";
import { colors, layout, shadows } from "../../../../src/ui/theme";
import {
  isPedagogicallySignificantAtypicalImpact,
  ObservationResult,
} from "../../../../src/domain/shootingObservation";
import { observationLabelsFr } from "../../../../src/domain/observationCatalog";
import { useShootingObservations } from "../../../../src/ui/ShootingObservationProvider";
import { useTechnicalHypotheses } from "../../../../src/ui/TechnicalHypothesisProvider";
import { TechnicalHypothesis } from "../../../../src/domain/technicalHypothesis";
import { hypothesisExplanation } from "../../../../src/domain/hypothesisExplanation";
import { PEDAGOGICAL_V2_PILOT } from "../../../../src/config/featureFlags";
import { diagnosticQuestionCatalog, DiagnosticAnswerValue } from "../../../../src/domain/diagnosticQuestionCatalog";
import { useCoaching } from "../../../../src/ui/CoachingProvider";
import type { DiagnosticConfirmationResult } from "../../../../src/ui/diagnosticConfirmationFlow";
import type { ControlSeriesInterpretation } from "../../../../src/domain/controlSeriesInterpretation";
import type { CoachingCycle } from "../../../../src/domain/coachingTypes";
import { trainingDrillCatalog } from "../../../../src/domain/trainingDrillCatalog";
import { presentDrill } from "../../../../src/ui/coachingPresentation";
import { technicalHypothesisCatalog } from "../../../../src/domain/technicalHypothesisCatalog";
import {
  factualConfidenceLabels,
  partitionHypothesesForDisplay,
  seriesObservationSummary,
  userFacingHypothesisTitle,
} from "../../../../src/ui/analysisPresentation";
import { isDiagnosticQuestionApplicableForNumberOfHands, numberOfHandsFromApplicableContext } from "../../../../src/domain/numberOfHandsApplicability";

export default function SeriesDetailScreen() {
  const { id: sessionId, seriesId } = useLocalSearchParams<{ id: string; seriesId: string }>();
  const { getById, start, cancel } = useSeries();
  const { countBySeries } = useImpacts();
  const { calculate } = useSeriesMetrics();
  const { forSeries } = useShootingObservations();
  const hypothesesService = useTechnicalHypotheses();
  const coachingService = useCoaching();
  const [series, setSeries] = useState<Series | null>(null);
  const [impactCount, setImpactCount] = useState(0);
  const [objectiveMetrics, setObjectiveMetrics] = useState<SeriesMetrics | null>(null);
  const [observations, setObservations] = useState<ObservationResult | null>(null);
  const [hypotheses, setHypotheses] = useState<TechnicalHypothesis[]>([]);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticConfirmationResult | null>(null);
  const [controlResult, setControlResult] = useState<(ControlSeriesInterpretation&{cycle:CoachingCycle}) | null>(null);
  const [existingBiasConfirmation, setExistingBiasConfirmation] = useState<Series | null>(null);
  const [diagnosticChecked, setDiagnosticChecked] = useState(false);
  const [showDiagnosticGeneralAnalysis, setShowDiagnosticGeneralAnalysis] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async (knownSeries?: Series) => {
    const value = knownSeries ?? await getById(seriesId);
    setSeries(value);
    setImpactCount(await countBySeries(seriesId));
    if (value?.status === "completed") setDiagnosticChecked(false);

    if (value?.status !== "completed") {
      setObjectiveMetrics(null);
      setObservations(null);
      setHypotheses([]);
      setDiagnosticResult(null);
      setControlResult(null);
      setExistingBiasConfirmation(null);
      setDiagnosticChecked(true);
      return;
    }

    // Une série de contrôle répond d'abord à l'objectif de son cycle. Une série diagnostique
    // répond d'abord à sa question. Dans les deux cas, l'analyse générale reste secondaire.
    const nextControl = await coachingService.resolveControlSeries(seriesId);
    setControlResult(nextControl);
    const nextDiagnostic = nextControl?null:await coachingService.resolveBiasConfirmation(seriesId);
    setDiagnosticResult(nextDiagnostic);
    setDiagnosticChecked(true);
    try {
      // Respecter l'ordre de dépendance : mesures → observations → hypothèses.
      const metrics = await calculate(seriesId);
      setObjectiveMetrics(metrics);
      const nextObservations = await forSeries(seriesId);
      setObservations(nextObservations);
      const nextHypotheses = await hypothesesService.forSeries(seriesId);
      setHypotheses(nextHypotheses);
      setExistingBiasConfirmation(nextHypotheses[0]
        ? await coachingService.findBiasConfirmation(nextHypotheses[0]) : null);
    } catch (reason) {
      setObjectiveMetrics(null);
      setObservations(null);
      setHypotheses([]);
      setExistingBiasConfirmation(null);
      if (!nextDiagnostic&&!nextControl) throw reason;
    }
  }, [calculate, coachingService, countBySeries, forSeries, getById, hypothesesService, seriesId]);

  useFocusEffect(useCallback(() => {
    void refresh().catch(() => {
      setObjectiveMetrics(null);
      setObservations(null);
      setHypotheses([]);
      setDiagnosticChecked(true);
    });
  }, [refresh]));

  async function run(action: () => Promise<Series>) {
    try {
      const updated = await action();
      if (updated.status === "completed") await refresh(updated);
      else setSeries(updated);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Action impossible.");
    }
  }
  async function createBiasConfirmationSeries(hypothesis: TechnicalHypothesis) {
    try {
      const created = await coachingService.createBiasConfirmation(hypothesis,
        "Reproduire les mêmes conditions, sans modifier volontairement la technique ni le matériel.",
        "Le décalage du centre du groupement se reproduit-il dans les mêmes conditions ?");
      router.push(created.status === "completed"
        ? `/sessions/${sessionId}/series/${created.id}`
        : `/sessions/${sessionId}/series/${created.id}/impacts`);
    } catch {
      setError("Impossible de créer la série de confirmation. Réessayez depuis la séance.");
    }
  }

  async function openImpactEntry() {
    const currentSeries = series;
    if (!currentSeries) return;
    try {
      const available = currentSeries.status === "planned" ? await start(currentSeries.id) : currentSeries;
      router.push(`/sessions/${sessionId}/series/${available.id}/impacts`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La saisie des impacts ne peut pas être ouverte.");
    }
  }

  if (!series) return <View style={styles.container}><Text>Série introuvable.</Text></View>;
  const hasContextualResult=Boolean(controlResult||diagnosticResult);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.step}>SÉRIE {series.sequenceNumber}</Text>
      <Text style={styles.title}>{typeLabels[series.type]}</Text>
      <View style={styles.card}>
        <Text style={styles.statusBadge}>{statusLabels[series.status]}</Text>
        <View style={styles.metrics}>
          <View style={styles.metric}><Text style={styles.metricValue}>{series.expectedShotCount}</Text><Text style={styles.metricLabel}>coups prévus</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{series.recordedShotCount}</Text><Text style={styles.metricLabel}>coups déclarés</Text></View>
          <View style={styles.metric}><Text style={styles.metricValue}>{impactCount}</Text><Text style={styles.metricLabel}>impacts placés</Text></View>
        </View>
        {series.instruction ? <Text style={styles.body}>Consigne : {series.instruction}</Text> : null}
        {series.pedagogicalObjective ? <Text style={styles.body}>{series.type==="corrective"?"Travail":"Objectif"} : {series.pedagogicalObjective}</Text> : null}
        {series.cadenceType ? <Text style={styles.body}>Cadence : {cadenceLabels[series.cadenceType]}</Text> : null}
        {series.durationSeconds ? <Text style={styles.body}>Durée : {series.durationSeconds} s</Text> : null}
      </View>
      {series.status === "completed" && series.type === "diagnostic" && !diagnosticChecked
        ? <View style={styles.card}><Text style={styles.sectionTitle}>Analyse du test…</Text></View> : null}
      {series.status === "completed" && series.type === "corrective" && !diagnosticChecked
        ? <View style={styles.card}><Text style={styles.sectionTitle}>Analyse du contrôle…</Text></View> : null}
      {controlResult ? <ControlSeriesResultSection result={controlResult} /> : null}
      {diagnosticResult ? <DiagnosticConfirmationSection result={diagnosticResult}
        onContinue={()=>router.push(`/sessions/${sessionId}/series/${series.id}/coaching`)} /> : null}
      {hasContextualResult ? <Pressable onPress={()=>setShowDiagnosticGeneralAnalysis(value=>!value)}>
        <Text style={styles.link}>{showDiagnosticGeneralAnalysis?"Masquer l’analyse générale":"Voir l’analyse générale de cette série"}</Text>
      </Pressable> : null}
      {(!hasContextualResult || showDiagnosticGeneralAnalysis) && diagnosticChecked && observations
        ? <ObservationSection result={observations} /> : null}
      {(!hasContextualResult || showDiagnosticGeneralAnalysis) && diagnosticChecked && series.status === "completed"
        ? <HypothesisSection hypotheses={hypotheses}
          onConfirmBias={createBiasConfirmationSeries}
          existingBiasConfirmation={existingBiasConfirmation}
          onOpenExistingBiasConfirmation={(item)=>router.push(`/sessions/${sessionId}/series/${item.id}`)}
          allowBiasConfirmation={!hasContextualResult}
          showPrimaryAction={!hasContextualResult}
          onAnswer={(q,v)=>hypothesesService.answer(q,series.id,v).then(setHypotheses)} /> : null}
      {(!hasContextualResult || showDiagnosticGeneralAnalysis) && diagnosticChecked && objectiveMetrics
        ? <ObjectiveResults metrics={objectiveMetrics} /> : null}
      {series.status === "completed" ? (
        <Pressable style={styles.secondary} onPress={() =>
          router.push(`/sessions/${sessionId}/series/${series.id}/compare`)}>
          <Text style={styles.secondaryText}>Comparer cette série</Text>
        </Pressable>
      ) : null}
      {PEDAGOGICAL_V2_PILOT && series.status === "completed" ? (
        <Pressable style={styles.debugAction} onPress={() =>
          router.push(`/sessions/${sessionId}/series/${series.id}/pedagogical-v2-pilot` as never)}>
          <Text style={styles.debugActionText}>Pilote v2 — examiner D4</Text>
        </Pressable>
      ) : null}
      {series.status === "planned" || series.status === "active" ? (
        <Pressable style={styles.primary} onPress={() => void openImpactEntry()}>
          <Text style={styles.primaryText}>Saisir les impacts</Text>
        </Pressable>
      ) : null}
      {series.status === "completed" ? (
        <Pressable style={styles.secondary} onPress={() => void openImpactEntry()}>
          <Text style={styles.secondaryText}>Voir les impacts</Text>
        </Pressable>
      ) : null}
      {(series.status === "planned" || series.status === "active") ? (
        <Pressable style={styles.danger} onPress={() => Alert.alert(
          "Annuler la série ?",
          "Elle restera visible dans l’historique.",
          [
            { text: "Retour", style: "cancel" },
            { text: "Annuler la série", style: "destructive", onPress: () => void run(() => cancel(series.id)) },
          ],
        )}>
          <Text style={styles.dangerText}>Annuler la série</Text>
        </Pressable>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => router.replace(`/sessions/${sessionId}`)}>
        <Text style={styles.link}>Retour à la séance</Text>
      </Pressable>
    </ScrollView>
  );
}

function HypothesisSection({hypotheses,onAnswer,onConfirmBias,existingBiasConfirmation,onOpenExistingBiasConfirmation,
  allowBiasConfirmation=true,showPrimaryAction=true}:{hypotheses:TechnicalHypothesis[];
  onConfirmBias:(hypothesis:TechnicalHypothesis)=>Promise<void>;
  existingBiasConfirmation:Series|null;
  onOpenExistingBiasConfirmation:(series:Series)=>void;
  onAnswer:(question:string,value:DiagnosticAnswerValue)=>Promise<void>;
  allowBiasConfirmation?:boolean;
  showPrimaryAction?:boolean}){
 const [showWhy,setShowWhy]=useState(false);
 const [showAdditional,setShowAdditional]=useState(false);
 const [selectedAnswer,setSelectedAnswer]=useState<DiagnosticAnswerValue|null>(null);
 const numberOfHands=hypotheses[0]?numberOfHandsFromApplicableContext(hypotheses[0].applicableContext):null;
 const question=diagnosticQuestionCatalog.find(q=>isDiagnosticQuestionApplicableForNumberOfHands(q,numberOfHands)
  &&hypotheses.some(h=>q.hypotheses.includes(h.hypothesisCode)));
 const compactOffset=allowBiasConfirmation&&hypotheses.some(h=>h.supportingEvidence.some(e=>e.code==="SYSTEMATIC_BIAS_COMPATIBILITY"));
 const presentation=partitionHypothesesForDisplay(hypotheses);
 const primary=presentation.primary;
 const primaryExplanation=primary?hypothesisExplanation(primary):null;
 const otherHypotheses=[presentation.visibleAlternative,...presentation.additionalAlternatives].filter((item):item is TechnicalHypothesis=>Boolean(item));
 return <View style={styles.card}>
  <Text style={styles.sectionTitle}>Piste à vérifier</Text>
  {!hypotheses.length?<Text style={styles.help}>Les données actuelles ne permettent pas de dégager une piste technique utile.</Text>:null}
  {primary?<><Text style={styles.hypothesisTitle}>{userFacingHypothesisTitle(primary,primaryExplanation!.title)}</Text>
   <Pressable onPress={()=>setShowWhy(value=>!value)}><Text style={styles.link}>{showWhy?"Masquer le détail":"Pourquoi ?"}</Text></Pressable>
   {showWhy?<View style={styles.explanation}><Text style={styles.rowTitle}>Ce qui a été constaté</Text>
    {primaryExplanation!.support.map(x=><Text key={x} style={styles.help}>• {x}</Text>)}</View>:null}
   {existingBiasConfirmation&&compactOffset
    ? <Pressable style={styles.primary} onPress={()=>onOpenExistingBiasConfirmation(existingBiasConfirmation)}><Text style={styles.primaryText}>Voir le résultat du test</Text></Pressable>
    : showPrimaryAction?<Pressable style={styles.primary} onPress={()=>compactOffset?void onConfirmBias(primary):router.push(`/sessions/${primary.sessionId}/series/${primary.seriesId}/coaching`)}>
     <Text style={styles.primaryText}>Vérifier cette piste</Text>
    </Pressable>:null}</>:null}
  {otherHypotheses.length?<View style={styles.alternatives}>
   <Pressable onPress={()=>setShowAdditional(value=>!value)}><Text style={styles.link}>{showAdditional?"Masquer les autres pistes":"Autres pistes"}</Text></Pressable>
   {showAdditional?otherHypotheses.map(h=>{const explanation=hypothesisExplanation(h);return <Text key={h.id} style={styles.body}>• {userFacingHypothesisTitle(h,explanation.title)}</Text>}):null}
  </View>:null}
  {question?<View style={styles.explanation}><Text style={styles.sectionTitle}>Pour mieux comprendre</Text>
   <Text style={styles.body}>{question.textFr}</Text><View style={styles.answerRow}>
   {([["yes","Oui"],["no","Non"],["uncertain","Incertain"],...(question.code==="FELT_TENSION"?[]:[["not_observed","Non observé"] as const])] as const).map(([v,l])=>
    <Pressable key={v} style={[styles.answer,selectedAnswer===v&&styles.answerSelected]}
      onPress={()=>{setSelectedAnswer(v);void onAnswer(question.code,v)}}>
      <Text style={[styles.answerText,selectedAnswer===v&&styles.answerTextSelected]}>{selectedAnswer===v?"●":"○"} {l}</Text>
    </Pressable>)}
   </View></View>:null}
 </View>;
}

function DiagnosticConfirmationSection({result,onContinue}:{result:DiagnosticConfirmationResult;onContinue():void}){
 return <View style={styles.diagnosticResult}>
  <Text style={styles.sectionTitle}>Résultat du test</Text>
  <Text style={styles.observationPrimary}>{result.headline}</Text>
  <Text style={result.conclusion==="strengthened"?styles.ready:result.conclusion==="weakened"?styles.warning:styles.help}>
   {result.interpretation}
  </Text>
  {result.conclusion==="strengthened"
   ? <Text style={styles.help}>Ce résultat ne constitue pas un diagnostic certain.</Text> : null}
  <Text style={styles.help}>Comparaison : série source et série diagnostique, dans le même contexte de séance.</Text>
  {result.conclusion==="strengthened"?<View style={styles.explanation}>
   <Text style={styles.rowTitle}>Causes possibles à départager</Text>
   <Text style={styles.body}>• {technicalHypothesisCatalog.EQUIPMENT_OR_SIGHT_ISSUE.titleFr}</Text>
   <Text style={styles.body}>• {technicalHypothesisCatalog.LATERAL_TRIGGER_PRESSURE.titleFr}</Text>
   <Text style={styles.help}>La reproduction du biais ne permet pas, à elle seule, de choisir entre ces causes.</Text>
  </View>:null}
  {result.conclusion==="strengthened"?<Text style={styles.body}>Le décalage est reproductible. Nous allons maintenant vérifier ses causes possibles.</Text>:null}
  <Pressable style={styles.primary} onPress={onContinue}><Text style={styles.primaryText}>
   {result.conclusion==="strengthened"?"Examiner la première cause testable":
    result.conclusion==="weakened"?"Examiner une autre piste":"Continuer avec le coach"}
  </Text></Pressable>
 </View>;
}

function ControlSeriesResultSection({result}:{result:ControlSeriesInterpretation&{cycle:CoachingCycle}}){
 const drill=result.cycle.drillCode?trainingDrillCatalog.find(item=>item.code===result.cycle.drillCode):null;
 const drillPresentation=drill?presentDrill(drill):null;
 return <View style={styles.diagnosticResult}>
  <Text style={styles.sectionTitle}>Résultat du travail</Text>
  {drill?<View style={styles.explanation}>
   <Text style={styles.rowTitle}>Travail évalué</Text><Text style={styles.body}>{drill.title}</Text>
   <Text style={styles.rowTitle}>Objectif du cycle</Text><Text style={styles.body}>{drillPresentation!.objective}</Text>
  </View>:null}
  <Text style={styles.observationPrimary}>{result.headline}</Text>
  <Text style={result.outcome==="objective_improved"?styles.ready:
   result.outcome==="insufficient_data"||result.outcome==="mixed_result"?styles.help:styles.warning}>
   {result.interpretation}
  </Text>
  <Text style={styles.help}>{result.caution}</Text>
  <View style={styles.explanation}>
   <Text style={styles.rowTitle}>Suite proposée</Text>
   <Text style={styles.body}>{result.nextAction}</Text>
  </View>
 </View>;
}

function ObservationSection({ result }: { result: ObservationResult }) {
  const [expanded, setExpanded] = useState(false);
  const all = [result.primary, ...result.secondary].filter((item) => item !== null);
  const outlier = all.find((item) => item?.observationCode === "OUTLIER_TO_VERIFY") ?? null;
  const otherSecondary = result.secondary.filter((item) => item.observationCode !== "OUTLIER_TO_VERIFY");
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>Constat</Text>
    {result.primary ? <Text style={styles.observationPrimary}>
      {seriesObservationSummary(result)}
    </Text> : null}
    {outlier && outlier !== result.primary ? <View style={styles.outlierNotice}>
      <Text style={styles.outlierTitle}>Impact isolé à vérifier</Text>
      <Text style={styles.body}>{observationLabelsFr[outlier.observationCode]} Il reste inclus dans les mesures.</Text>
    </View> : null}
    {outlier === result.primary
      ? <Text style={styles.help}>L’impact atypique reste inclus dans les mesures globales.</Text>
      : null}
    {result.primary ? <Text style={styles.help}>{factualConfidenceLabels[result.primary.confidenceLevel]}</Text> : null}
    <Pressable onPress={() => setExpanded((value) => !value)}>
      <Text style={styles.link}>{expanded ? "Masquer les autres constats" : "Voir les autres constats"}</Text>
    </Pressable>
    {expanded ? <>
      {otherSecondary.map((item) => <Text key={item.observationCode} style={styles.body}>
        • {observationLabelsFr[item.observationCode]}
      </Text>)}
      {result.limitations.map((item) => <Text key={item.observationCode} style={styles.help}>
        • {observationLabelsFr[item.observationCode]}
      </Text>)}
      {all.map((item) => <View key={`${item.rank}-${item.observationCode}`} style={styles.explanation}>
        {item.limitingFactors.map((factor) => <Text key={factor} style={styles.help}>• {factor}</Text>)}
      </View>)}
    </> : null}
  </View>;
}

function ObjectiveResults({ metrics }: { metrics: SeriesMetrics }) {
  const [expanded, setExpanded] = useState(false);
  const values = metrics.physicalMm;
  const unit = values ? "mm" : "%";
  const scale = values ? 1 : 100;
  const format = (value: number | null) =>
    value == null ? "Indisponible" : `${Math.round(Math.abs(value) * scale)} ${unit}`;
  const horizontal = values?.horizontalOffset ?? metrics.normalized.horizontalOffset;
  const vertical = values?.verticalOffset ?? metrics.normalized.verticalOffset;
  const offset = horizontal == null || vertical == null
    ? "Données insuffisantes."
    : `Centre du groupement : ${format(horizontal)} ${horizontal < 0 ? "à gauche" : horizontal > 0 ? "à droite" : "horizontalement au centre"} et ${format(vertical)} ${vertical < 0 ? "en dessous" : vertical > 0 ? "au-dessus" : "verticalement au centre"}.`;
  return <View style={styles.card}>
    <Text style={styles.sectionTitle}>Mesures</Text>
    <Pressable onPress={() => setExpanded((value) => !value)}>
      <Text style={styles.link}>{expanded ? "Masquer les mesures détaillées" : "Voir les mesures détaillées"}</Text>
    </Pressable>
    {expanded ? <>
      <Text style={styles.body}>{metrics.includedImpactCount} impact(s) analysé(s) · {metrics.excludedImpactCount} exclu(s)</Text>
      <Text style={styles.body}>{offset}</Text>
    {metrics.includedImpactCount < 2 ? <Text style={styles.help}>Données insuffisantes pour évaluer la dispersion.</Text> : <>
      <Text style={styles.body}>Largeur : {format(values?.spreadWidth ?? metrics.normalized.spreadWidth)}</Text>
      <Text style={styles.body}>Hauteur : {format(values?.spreadHeight ?? metrics.normalized.spreadHeight)}</Text>
      <Text style={styles.body}>Diamètre maximal : {format(values?.extremeSpread ?? metrics.normalized.extremeSpread)}</Text>
      <Text style={styles.body}>Rayon moyen : {format(values?.meanRadius ?? metrics.normalized.meanRadius)}</Text>
      <Text style={styles.body}>Distance moyenne au centre : {format(values?.meanDistanceToTargetCenter ?? metrics.normalized.meanDistanceToTargetCenter)}</Text>
    </>}
    {metrics.shapeClassification !== "indeterminate"
      ? <Text style={styles.body}>Forme : {shapeLabels[metrics.shapeClassification]}</Text>
      : <Text style={styles.help}>Forme indéterminée avec les données disponibles.</Text>}
    {metrics.potentiallyAtypicalImpactIds.length
      ? isPedagogicallySignificantAtypicalImpact(metrics)
        ? <Text style={styles.warning}>Impact(s) potentiellement atypique(s) à vérifier : {metrics.potentiallyAtypicalImpactIds.length}. Ils restent inclus.</Text>
        : <Text style={styles.help}>Une légère variation statistique, compatible avec la précision limitée de la saisie manuelle, reste incluse dans les mesures.</Text>
      : null}
      {!metrics.physicalMm
      ? <Text style={styles.help}>Géométrie physique non vérifiée : valeurs exprimées en proportion de la zone, pas en millimètres.</Text>
      : null}
    </> : null}
  </View>;
}

const typeLabels = {
  reference: "Série de référence", diagnostic: "Série diagnostique",
  corrective: "Série corrective", consolidation: "Série de consolidation",
  progression: "Série de progression",
} as const;
const statusLabels = {
  planned: "Planifiée", active: "Active", completed: "Terminée", cancelled: "Annulée",
} as const;
const cadenceLabels = {
  free: "Libre", timed: "Chronométrée", fixed_interval: "Intervalle fixe", unknown: "Non précisée",
} as const;
const shapeLabels = {
  compact: "plutôt compacte",
  horizontal: "plus étendue horizontalement",
  vertical: "plus étendue verticalement",
  both_axes: "étendue dans les deux axes",
} as const;
const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: layout.pagePadding, gap: 15 },
  step: { color: colors.coral, fontWeight: "800", letterSpacing: 1, fontSize: 12 },
  title: { color: colors.navy, fontSize: 30, fontWeight: "800" },
  card: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 18, gap: 12, ...shadows.card },
  statusBadge: { alignSelf: "flex-start", color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, overflow: "hidden", fontWeight: "800" },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 10, alignItems: "center" },
  metricValue: { color: colors.navy, fontSize: 22, fontWeight: "900" },
  metricLabel: { color: colors.muted, fontSize: 11, lineHeight: 15, textAlign: "center" },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  sectionTitle: { color: colors.navy, fontSize: 21, fontWeight: "900" },
  help: { color: colors.muted, fontSize: 14, lineHeight: 19 },
  warning: { color: colors.warning, fontWeight: "700", lineHeight: 19 },
  ready: { color: colors.teal, fontWeight: "800", lineHeight: 20 },
  diagnosticResult: { backgroundColor: colors.surface, borderRadius: layout.radius, padding: 18, gap: 12, borderWidth: 2, borderColor: colors.teal, ...shadows.card },
  observationPrimary: { color: colors.navy, fontSize: 18, lineHeight: 24, fontWeight: "800" },
  explanation: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, gap: 4 },
  biasNotice: { backgroundColor: colors.background, borderRadius: 12, padding: 12, gap: 9 },
  alternatives: { gap: 9, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  outlierNotice: { backgroundColor: colors.warningBackground, borderRadius: 12, padding: 12, gap: 5 },
  outlierTitle: { color: colors.warning, fontWeight: "900", fontSize: 17 },
  answerRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  answer: { borderWidth: 1, borderColor: colors.teal, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  answerSelected: { backgroundColor: colors.teal },
  answerText: { color: colors.teal, fontWeight: "800" },
  answerTextSelected: { color: colors.surface },
  rowTitle: { color: colors.navy, fontWeight: "800" },
  hypothesisTitle: { color: colors.navy, fontSize: 18, fontWeight: "900" },
  plausibility: { alignSelf: "flex-start", color: colors.teal, backgroundColor: colors.tealSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4, overflow: "hidden", fontWeight: "800" },
  label: { color: colors.navy, fontWeight: "800", fontSize: 16 },
  primary: { backgroundColor: colors.teal, borderRadius: layout.radius, padding: 16, alignItems: "center" },
  primaryText: { color: colors.surface, fontWeight: "800", fontSize: 16 },
  secondary: { borderWidth: 2, borderColor: colors.teal, borderRadius: layout.radius, padding: 15, alignItems: "center" },
  secondaryText: { color: colors.teal, fontWeight: "800", fontSize: 16 },
  confirmAction: { borderWidth: 2, borderColor: colors.teal, borderRadius: layout.radius, padding: 13, alignItems: "center" },
  confirmActionText: { color: colors.teal, fontWeight: "800" },
  debugAction: { borderWidth: 1, borderColor: colors.border, borderRadius: layout.radius, padding: 11, alignItems: "center" },
  debugActionText: { color: colors.muted, fontWeight: "700", fontSize: 13 },
  danger: { borderWidth: 1, borderColor: colors.danger, borderRadius: layout.radius, padding: 14, alignItems: "center" },
  dangerText: { color: colors.danger, fontWeight: "800" },
  link: { color: colors.teal, textAlign: "center", fontWeight: "800" },
  error: { color: colors.danger, backgroundColor: colors.dangerBackground, borderRadius: 10, padding: 12, fontWeight: "700" },
});
