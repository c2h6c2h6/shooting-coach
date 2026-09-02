import { router,useLocalSearchParams } from "expo-router";
import { useEffect,useState } from "react";
import { Pressable,ScrollView,StyleSheet,Text,View } from "react-native";
import { confirmationTestCatalog } from "../../../../../src/domain/confirmationTestCatalog";
import { firstStructurallyTestableHypothesis,selectConfirmationTest } from "../../../../../src/domain/confirmationTestEngine";
import { CoachingOutcome,ConfirmationOutcome,SafetyContext,SessionSafetyContext } from "../../../../../src/domain/coachingTypes";
import { trainingDrillCatalog } from "../../../../../src/domain/trainingDrillCatalog";
import { safetyBlockers } from "../../../../../src/domain/coachingSafetyRules";
import { confirmCoordinatedSafety,confirmSessionSafety,EMPTY_SAFETY_CONTEXT,invalidateDryFireConfiguration,isDryFireConfigurationValidated,
 isSessionSafetyConfirmed,SESSION_SAFETY_KEYS,specificSafetyKeys,USER_CONFIRMABLE_TEST_SAFETY_KEYS } from "../../../../../src/domain/sessionSafetyContext";
import { useCoaching } from "../../../../../src/ui/CoachingProvider";
 import { presentCoachingOutcome,presentConfirmationTest,presentDrill,presentHypothesis,presentOutcome,presentTechnicalControlTitle } from "../../../../../src/ui/coachingPresentation";
import { useTechnicalHypotheses } from "../../../../../src/ui/TechnicalHypothesisProvider";
import { colors,layout,shadows } from "../../../../../src/ui/theme";
import { isConfirmationTestApplicableForNumberOfHands, numberOfHandsFromApplicableContext } from "../../../../../src/domain/numberOfHandsApplicability";
import { applyConfirmationOutcomeToHypothesis } from "../../../../../src/domain/confirmationOutcomeTransition";
import { TechnicalHypothesis } from "../../../../../src/domain/technicalHypothesis";
export default function CoachingScreen(){
 const {id:sessionId,seriesId}=useLocalSearchParams<{id:string;seriesId:string}>(),hypService=useTechnicalHypotheses(),service=useCoaching();
 const [hypotheses,setHypotheses]=useState<Awaited<ReturnType<typeof hypService.forSeries>>>([]),[safety,setSafety]=useState(EMPTY_SAFETY_CONTEXT);
 const [sessionSafety,setSessionSafety]=useState<SessionSafetyContext|null>(null);
 const [state,setState]=useState<Awaited<ReturnType<typeof service.start>>|null>(null),[restoredTest,setRestoredTest]=useState(false),[outcome,setOutcome]=useState<ConfirmationOutcome|null>(null),[hasWork,setHasWork]=useState(false),[error,setError]=useState("");
  const [showTechnicalEvaluation,setShowTechnicalEvaluation]=useState(false),[technicalOutcome,setTechnicalOutcome]=useState<CoachingOutcome|null>(null);
  const [showTestDetails,setShowTestDetails]=useState(false),[showSafetyDetails,setShowSafetyDetails]=useState(false),[showOutcomeDetails,setShowOutcomeDetails]=useState(false);
 const [excludedTest,setExcludedTest]=useState<{hypothesisCode:TechnicalHypothesis["hypothesisCode"];confirmationTestCode:string}|null>(null);
 const [nextHypothesisCode,setNextHypothesisCode]=useState<TechnicalHypothesis["hypothesisCode"]|null>(null);
 useEffect(()=>{void hypService.forSeries(seriesId).then(setHypotheses);
  void service.sessionSafety(sessionId).then(x=>{if(x){setSessionSafety(x);setSafety(x.conditions);}});
  void service.active(sessionId).then(x=>{if(x){setState({cycle:x.cycle,test:x.test});setRestoredTest(true);
   setOutcome(x.test.outcome);setHasWork(Boolean(x.cycle.drillCode||x.cycle.controlMode==="technical_observation"));}});
 },[hypService,seriesId,service,sessionId]);
 const rankedTestableHypothesis=firstStructurallyTestableHypothesis({hypotheses,sessionMode:"coaching_free",exclude:excludedTest??undefined});
 const h=(state?hypotheses.find(item=>item.id===state.cycle.hypothesisId):null)??rankedTestableHypothesis;
 const numberOfHands=h?numberOfHandsFromApplicableContext(h.applicableContext):null,
 selection=h?selectConfirmationTest({hypothesis:h,alternatives:hypotheses.filter(item=>item.id!==h.id),sessionMode:"coaching_free",safety,userCanPerform:true,contextKnown:true,numberOfHands,allowRankedFallback:true,
  excludeTestCode:excludedTest?.hypothesisCode===h.hypothesisCode?excludedTest.confirmationTestCode:undefined}):null;
 const test=state?confirmationTestCatalog.find(t=>t.code===state.test.testCode):selection?.primary;
 const hypothesisPresentation=h?presentHypothesis(h.hypothesisCode):null;
 const testPresentation=test?presentConfirmationTest(test):null;
 const sessionSafetyConfirmed=isSessionSafetyConfirmed(sessionSafety?.conditions??null);
 const drySafetyConfirmed=safety.rangeRulesAccepted&&safety.safeDirectionAvailable&&safety.canDryFire;
 const safetyConfirmedForTest=test?.requiresLiveFire?sessionSafetyConfirmed:drySafetyConfirmed;
 const safetyAfterGeneral=sessionSafetyConfirmed?sessionSafety!.conditions:confirmSessionSafety(safety);
 const requiredSafetyKeys=test?specificSafetyKeys(test,safetyAfterGeneral):[];
 const confirmableSafetyKeys=requiredSafetyKeys.filter(k=>USER_CONFIRMABLE_TEST_SAFETY_KEYS.includes(k));
 const pendingConfirmableSafetyKeys=confirmableSafetyKeys.filter(k=>!safety[k]);
 const dryFireAlreadyVerified=Boolean(test?.requiresDryFire&&isDryFireConfigurationValidated(safety));
 const blockers=test?safetyBlockers(test,safety):["Aucun test applicable."];
 const drill=state?.cycle.drillCode?trainingDrillCatalog.find(item=>item.code===state.cycle.drillCode):null;
 const technicalControl=state?.cycle.controlMode==="technical_observation"?state.cycle.technicalControl:null;
 const transferState=state?.cycle.transferState;
 const transferDrill=transferState?trainingDrillCatalog.find(item=>item.code===transferState.transferDrillCode):null;
 const transferBlockers=transferDrill?safetyBlockers(transferDrill,safety):["Exercice de transfert introuvable."];
 const drillBlockers=drill?safetyBlockers(drill,safety):[];
 const canStart=Boolean(test&&safetyConfirmedForTest&&blockers.length===0);
 async function validateCombinedSafety(){if(!test)return;try{
  const coordinated=confirmCoordinatedSafety(safety,test,!sessionSafetyConfirmed);
  const conditions=test.requiresLiveFire?invalidateDryFireConfiguration(coordinated.testConditions):coordinated.testConditions;
  const saved=await service.validateSessionSafety(sessionId,conditions);setSessionSafety(saved);
  setSafety(conditions);setError("");}
  catch{setError("Le contexte de sécurité n’a pas pu être enregistré. Réessayez avant de poursuivre.");}}
 async function begin(){if(!h||!test||!canStart)return;try{setError("");const started=await service.start(h,test.code,safety);
  const conditions=test.requiresLiveFire?invalidateDryFireConfiguration(safety):safety;if(test.requiresLiveFire){const saved=await service.validateSessionSafety(sessionId,conditions);setSessionSafety(saved);setSafety(conditions);}
  setRestoredTest(false);setState(started);}
  catch{setError("Le test n’a pas pu commencer. Vos données sont conservées ; revenez à la séance puis réessayez.");}}
 async function finish(observation:string){if(!state)return;try{setError("");
  const next=await service.complete(state.cycle,state.test,observation,"beginner",safety);
  const updatedHypotheses=hypotheses.map(item=>item.id===state.cycle.hypothesisId
   ?applyConfirmationOutcomeToHypothesis(item,next.outcome):item);
  const nextExcluded=next.outcome==="inconclusive"||next.outcome==="not_observed"
   ?{hypothesisCode:h!.hypothesisCode,confirmationTestCode:state.test.testCode}:null;
  setHypotheses(updatedHypotheses);setExcludedTest(nextExcluded);
  setNextHypothesisCode(firstStructurallyTestableHypothesis({hypotheses:updatedHypotheses,sessionMode:"coaching_free",exclude:nextExcluded??undefined})?.hypothesisCode??null);
  setState({cycle:next.cycle,test:next.test});setOutcome(next.outcome);setHasWork(next.hasWork);
 }catch{setError("Le résultat n’a pas pu être enregistré. Votre test est conservé ; réessayez dans un instant.");}}
 function continueDifferentialReasoning(){setState(null);setRestoredTest(false);setOutcome(null);setHasWork(false);setError("");}
 async function control(){if(!state?.cycle.drillCode||drillBlockers.length)return;const d=trainingDrillCatalog.find(x=>x.code===state.cycle.drillCode)!;const id=await service.createControl(state.cycle,d.executionSteps[0],d.title,safety);if(d.requiresLiveFire){const conditions=invalidateDryFireConfiguration(safety);const saved=await service.validateSessionSafety(sessionId,conditions);setSessionSafety(saved);setSafety(conditions);}router.replace(`/sessions/${sessionId}/series/${id}`);}
 async function completeTechnical(observationCode:string){if(!state||!technicalControl)return;try{setError("");
  const completed=await service.completeTechnicalControl(state.cycle,observationCode,safety);setState({...state,cycle:completed.cycle});
  setTechnicalOutcome(completed.outcome);setHasWork(completed.cycle.status!=="completed");setShowTechnicalEvaluation(false);
 }catch{setError("Le résultat du contrôle technique n’a pas pu être enregistré. Réessayez dans un instant.");}}
 async function beginTransfer(){if(!state||transferBlockers.length)return;try{setError("");const cycle=await service.beginTransfer(state.cycle,safety);
  const conditions=invalidateDryFireConfiguration(safety),saved=await service.validateSessionSafety(sessionId,conditions);setSessionSafety(saved);setSafety(conditions);
  setState({...state,cycle});setHasWork(true);setTechnicalOutcome(null);}catch{setError("Le transfert en tir réel ne peut pas encore commencer.");}}
  const safetyCard=test&&(!sessionSafetyConfirmed||blockers.length>0||dryFireAlreadyVerified)?<View style={styles.card}><Text style={styles.section}>Sécurité</Text>
    {sessionSafetyConfirmed&&dryFireAlreadyVerified&&blockers.length===0?<Text style={styles.inherited}>✓ Conditions à sec déjà validées.</Text>:null}
    {!sessionSafetyConfirmed?<><Text style={styles.label}>À confirmer avant de commencer</Text>
     {SESSION_SAFETY_KEYS.map(k=><Text key={k} style={styles.help}>• {labels[k]}</Text>)}</>:null}
    {(showSafetyDetails||!sessionSafetyConfirmed||blockers.length>0)?<>
     {sessionSafetyConfirmed?<Text style={styles.inherited}>✓ Conditions générales de sécurité déjà validées.</Text>:null}
     {requiredSafetyKeys.length?<><Text style={styles.label}>Conditions du test</Text>
      {requiredSafetyKeys.map(k=><Text key={k} style={safety[k]?styles.inherited:styles.help}>{safety[k]?"✓ ":"• "}{labels[k]}</Text>)}</>:null}
     <Text style={styles.label}>Consignes</Text>{test.safetyRequirements.map(x=><Text key={x} style={styles.help}>• {x}</Text>)}
    </>:<Pressable onPress={()=>setShowSafetyDetails(true)}><Text style={styles.link}>Voir les consignes</Text></Pressable>}
   {(!sessionSafetyConfirmed||pendingConfirmableSafetyKeys.length>0)?<Pressable style={styles.primary} onPress={()=>void validateCombinedSafety()}>
    <Text style={styles.primaryText}>{!sessionSafetyConfirmed&&pendingConfirmableSafetyKeys.length
     ? "Je confirme que les conditions de sécurité nécessaires à ce test sont réunies"
     : !sessionSafetyConfirmed
      ? "Je confirme que les conditions générales de sécurité sont réunies"
      : "Je confirme que les conditions de sécurité spécifiques au protocole sont réunies"}</Text>
   </Pressable>:blockers.length?<View style={styles.blocked}><Text style={styles.warning}>Le test ne peut pas encore commencer.</Text>{blockers.map(x=><Text key={x} style={styles.help}>• {x}</Text>)}</View>:null}
  </View>:null;
 if(!h)return <View style={styles.page}>
  <View style={styles.card}><Text style={styles.section}>Suite de l’analyse</Text>
   <Text style={styles.body}>Pas assez d’éléments pour identifier une cause.</Text>
   <Pressable style={styles.primary} onPress={()=>router.replace(`/sessions/${sessionId}/series/${seriesId}`)}>
    <Text style={styles.primaryText}>Retour à la série</Text>
   </Pressable>
  </View>
 </View>;
 return <ScrollView contentContainerStyle={styles.page}>
  <View style={styles.steps}><Text style={styles.stepText}>Constat  ›  Piste à vérifier  ›  Test  ›  Réponse  ›  Suivant</Text></View>
   {!state?<>{safetyCard}<View style={styles.card}><Text style={styles.section}>Hypothèse</Text>
     <Text style={styles.label}>{hypothesisPresentation!.title}</Text><Text style={styles.section}>Test</Text>
     <Text style={styles.label}>{test?.title??"Test indisponible"}</Text>
     <Text style={styles.section}>À faire</Text>{testPresentation?.instructions.slice(0,3).map(x=><Text key={x} style={styles.body}>• {x}</Text>)}
     <Pressable onPress={()=>setShowTestDetails(value=>!value)}><Text style={styles.link}>{showTestDetails?"Masquer le détail":"Pourquoi ce test ?"}</Text></Pressable>
     {showTestDetails?<><Text style={styles.help}>{testPresentation?.why}</Text><Text style={styles.help}>{testPresentation?.observationQuestion}</Text></>:null}
    {canStart?<Pressable style={styles.primary} onPress={()=>void begin()}>
     <Text style={styles.primaryText}>Commencer le test</Text>
    </Pressable>:null}
   </View></>:null}
  {state&&!outcome?
    <View style={styles.card}><Text style={styles.kicker}>{restoredTest?"REPRISE DU TEST EN COURS":"TEST EN COURS"}</Text>{restoredTest?<Text style={styles.section}>Reprise du test en cours</Text>:null}<Text style={styles.section}>Réponse</Text><Text style={styles.body}>Que voyez-vous ?</Text>
    {test&&test.observationCriteria.map(observation=><Pressable key={observation} style={styles.secondary} onPress={()=>void finish(observation)}><Text style={styles.secondaryText}>{observation}</Text></Pressable>)}
    <Pressable onPress={()=>void service.cancel(state.cycle,state.test).then(()=>router.replace(`/sessions/${sessionId}`))}><Text style={styles.link}>Interrompre ou refuser</Text></Pressable></View>:null}
   {outcome?<View style={styles.card}><Text style={styles.section}>Résultat</Text><Text style={styles.body}>{presentCoachingOutcome(outcome,state?.test.testCode,h?.hypothesisCode)}</Text>
    <Pressable onPress={()=>setShowOutcomeDetails(value=>!value)}><Text style={styles.link}>{showOutcomeDetails?"Masquer le détail":"Voir le détail"}</Text></Pressable>
    {showOutcomeDetails?<Text style={styles.help}>{presentOutcome(outcome,state?.test.testCode)}</Text>:null}
   {hasWork&&transferState?.acquisitionControlCompleted&&state?.cycle.status==="drill_pending"?<><Text style={styles.kicker}>CORRECTION OBSERVÉE À SEC</Text>
    <Text style={styles.body}>Étape suivante : valider cette correction en tir réel.</Text>
    {transferBlockers.length?<><Text style={styles.warning}>Validation en tir réel restant à effectuer.</Text>{transferBlockers.map(item=><Text key={item} style={styles.help}>• {item}</Text>)}</>
     :<><Text style={styles.label}>{transferDrill?.title}</Text>{transferDrill?.executionSteps.map((item,index)=><Text key={item} style={styles.body}>{index+1}. {item}</Text>)}
      <Pressable style={styles.primary} onPress={()=>void beginTransfer()}><Text style={styles.primaryText}>Passer au transfert en tir réel</Text></Pressable></>}
   </>:hasWork&&technicalControl?<><Text style={styles.kicker}>{technicalControl.requiresLiveFire?"VALIDER EN TIR RÉEL":"TRAVAILLER"}</Text><Text style={styles.section}>{presentTechnicalControlTitle(technicalControl)}</Text>
    {technicalControl.exerciseInstructions.map((instruction,index)=><Text key={`exercise-${index}`} style={styles.body}>{index+1}. {instruction}</Text>)}
    {!showTechnicalEvaluation?<Pressable style={styles.primary} onPress={()=>setShowTechnicalEvaluation(true)}>
     <Text style={styles.primaryText}>Vérifier le résultat du travail</Text></Pressable>:<>
     <Text style={styles.label}>Contrôle technique</Text>{technicalControl.protocol.map((instruction,index)=><Text key={`control-${index}`} style={styles.body}>{index+1}. {instruction}</Text>)}
     <Text style={styles.label}>Qu’observez-vous ?</Text>{technicalControl.observationCriteria.map(item=><Pressable key={item.code} style={styles.secondary}
      onPress={()=>void completeTechnical(item.code)}><Text style={styles.secondaryText}>{item.label}</Text></Pressable>)}</>}
   </>:hasWork&&state?.cycle.drillCode?<><Text style={styles.kicker}>TRAVAILLER</Text><Text style={styles.section}>Travail proposé</Text>{(()=>{const d=trainingDrillCatalog.find(x=>x.code===state.cycle.drillCode)!,presentation=presentDrill(d);return <>
    <Text style={styles.label}>{presentation.title}</Text><Text style={styles.label}>Objectif</Text><Text style={styles.body}>{presentation.objective}</Text>
    <Text style={styles.label}>Exercice</Text>{presentation.instructions.map((instruction,index)=><Text key={`${index}-${instruction}`} style={styles.body}>{instruction}</Text>)}
    <Text style={styles.help}>{presentation.successCriterion}</Text>
    <Text style={styles.warning}>Arrêt : {d.stopConditions[0]}</Text>{drillBlockers.length
     ?<View style={styles.blocked}><Text style={styles.warning}>Le travail ne peut pas encore commencer.</Text>{drillBlockers.map(item=><Text key={item} style={styles.help}>• {item}</Text>)}</View>
     :<Pressable style={styles.primary} onPress={()=>void control()}><Text style={styles.primaryText}>Créer la série de contrôle</Text></Pressable>}</>})()}</>
    :technicalOutcome?<><Text style={styles.kicker}>RÉSULTAT DU TRAVAIL</Text><Text style={styles.body}>{transferState?.transferStatus==="completed"&&technicalOutcome==="objective_improved"
      ?"Correction validée en tir réel.":technicalOutcomeText[technicalOutcome]}</Text></>
    :<><Text style={styles.help}>Aucune recommandation personnalisée n’est proposée avec ce résultat.</Text>
     {outcome==="does_not_support_hypothesis"||outcome==="inconclusive"||outcome==="not_observed"?<Pressable style={styles.primary} onPress={continueDifferentialReasoning}>
      <Text style={styles.primaryText}>{nextHypothesisCode?`Examiner ensuite : ${presentHypothesis(nextHypothesisCode).title}`:"Aucune autre piste testable n’est disponible"}</Text></Pressable>:null}</>}
  </View>:null}
  <Pressable onPress={()=>router.push("/safety" as never)}><Text style={styles.link}>Sécurité et limites</Text></Pressable>
  {error?<View style={styles.errorBox}><Text style={styles.warning}>{error}</Text></View>:null}
 </ScrollView>;
}
const labels:Record<keyof SafetyContext,string>={rangeRulesAccepted:"Règles du stand confirmées",safeDirectionAvailable:"Direction sûre disponible",weaponUnloadedVerified:"Arme déchargée vérifiée",magazineRemoved:"Chargeur retiré",chamberVisualPhysicalCheck:"Chambre vérifiée visuellement et physiquement",liveAmmunitionRemovedFromArea:"Aucune munition réelle dans la zone",canDryFire:"Travail à sec possible",inAuthorizedRange:"Stand autorisé",eyeAndEarProtection:"Protections oculaires et auditives",canLiveFire:"Tir réel possible",dummyRoundsAllowed:"Munitions inertes autorisées",dummyRoundProcedureKnown:"Procédure inerte maîtrisée",instructorPresent:"Instructeur présent"};
const technicalOutcomeText:Record<CoachingOutcome,string>={objective_improved:"Le contrôle technique montre une évolution favorable directement observable.",
 objective_stable:"Le comportement observé reste comparable à celui constaté avant le travail.",objective_worsened:"Le comportement observé s’est dégradé.",
 mixed_result:"Une amélioration est observable, mais la co-activation reste présente.",insufficient_data:"Le contrôle technique ne permet pas de conclure de manière fiable."};
const styles=StyleSheet.create({page:{padding:layout.pagePadding,gap:14},steps:{backgroundColor:"#E8EEF3",padding:11,borderRadius:10},stepText:{fontSize:12,lineHeight:18,color:colors.navy,fontWeight:"700"},kicker:{color:colors.coral,fontWeight:"900"},title:{fontSize:28,fontWeight:"900",color:colors.navy},card:{backgroundColor:colors.surface,borderRadius:layout.radius,padding:17,gap:10,...shadows.card},section:{fontSize:20,fontWeight:"900",color:colors.navy},label:{fontWeight:"800",color:colors.navy},body:{fontSize:15,lineHeight:21,color:colors.text},help:{color:colors.muted,lineHeight:19},warning:{color:colors.warning,fontWeight:"700"},inherited:{color:colors.teal,fontWeight:"700"},ready:{color:colors.teal,fontWeight:"800"},blocked:{backgroundColor:"#FFF4E8",padding:12,borderRadius:10,gap:5},errorBox:{backgroundColor:"#FFF4E8",padding:12,borderRadius:10},primary:{backgroundColor:colors.teal,padding:14,borderRadius:12,alignItems:"center"},disabled:{opacity:.45},primaryText:{color:colors.surface,fontWeight:"800"},secondary:{borderColor:colors.teal,borderWidth:1,padding:11,borderRadius:10,alignItems:"center"},secondaryText:{color:colors.teal,fontWeight:"800"},link:{textAlign:"center",color:colors.teal,fontWeight:"800"}});
