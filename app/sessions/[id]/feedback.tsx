import { randomUUID } from "expo-crypto";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MvpValidationRepository } from "../../../src/application/mvpValidationRepository";
import { FeedbackAnswer, HumanHypothesisVerdict, IssueCategory, Severity } from "../../../src/domain/mvpValidationTypes";
import { getDatabase } from "../../../src/infrastructure/database/sqlite";
import { colors, layout } from "../../../src/ui/theme";
const answers:FeedbackAnswer[]=["yes","rather_yes","uncertain","rather_no","no"];
export default function FeedbackScreen(){
 const{id,cycleId,hypothesisId}=useLocalSearchParams<{id:string;cycleId:string;hypothesisId:string}>();
 const[answer,setAnswer]=useState<FeedbackAnswer>("uncertain"),[comment,setComment]=useState(""),[saved,setSaved]=useState("");
 async function repo(){return new MvpValidationRepository(await getDatabase())}
 async function saveShooter(){const at=new Date().toISOString();await(await repo()).saveShooterFeedback({id:randomUUID(),cycleId,sessionId:id,
  clarity:answer,testFeasibility:answer,drillFit:answer,feltDifference:answer,shotCountFit:answer,nextChoice:"free_training",comment:comment.trim()||null,createdAt:at});setSaved("Retour du tireur enregistré localement.")}
 async function saveInstructor(){const at=new Date().toISOString();await(await repo()).saveInstructorFeedback({id:randomUUID(),cycleId,sessionId:id,
  observationRelevant:answer,hypothesisRelevant:answer,missingHypothesis:null,rankingAssessment:"uncertain",testAssessment:"uncertain",
  recommendationAssessment:"uncertain",resultCoherent:answer,comment:comment.trim()||null,createdAt:at});setSaved("Retour de l’instructeur enregistré séparément.")}
 async function review(verdict:HumanHypothesisVerdict){const at=new Date().toISOString();await(await repo()).saveHumanReview({id:randomUUID(),cycleId,hypothesisId,
  engineSnapshot:{preserved:true},verdict,evaluatorRole:"instructeur déclaré",comment:comment.trim()||null,createdAt:at});setSaved("Avis humain enregistré sans modifier la sortie du moteur.")}
 async function issue(category:IssueCategory,severity:Severity){const at=new Date().toISOString();await(await repo()).saveIssue({id:randomUUID(),sessionId:id,seriesId:null,cycleId,
  screen:"Retour terrain",rulesetVersions:{validation:"mvp-validation-v1"},category,description:comment.trim()||"Signalement sans commentaire.",severity,dataPartition:"real",createdAt:at});
  setSaved("Signalement enregistré localement.")}
 async function act(task:()=>Promise<void>){try{await task()}catch(e){Alert.alert("Enregistrement impossible",e instanceof Error?e.message:"Erreur locale.")}}
 return <ScrollView contentContainerStyle={s.container}><Text style={s.title}>Retour terrain</Text>
  <Text style={s.help}>La sortie automatique et l’avis humain restent séparés.</Text>
  <View style={s.card}><Text style={s.heading}>Réponse structurée</Text><View style={s.row}>{answers.map(x=><Pressable key={x} style={[s.choice,answer===x&&s.selected]} onPress={()=>setAnswer(x)}><Text>{labels[x]}</Text></Pressable>)}</View>
  <TextInput multiline value={comment} onChangeText={setComment} placeholder="Commentaire facultatif" style={s.input}/></View>
  <Pressable style={s.button} onPress={()=>void act(saveShooter)}><Text style={s.buttonText}>Enregistrer le retour du tireur</Text></Pressable>
  <Pressable style={s.button} onPress={()=>void act(saveInstructor)}><Text style={s.buttonText}>Enregistrer le retour instructeur</Text></Pressable>
  <View style={s.card}><Text style={s.heading}>Validation humaine de l’hypothèse</Text>{(["coherent","possible_unverified","unlikely","incorrect","impossible_to_evaluate"] as HumanHypothesisVerdict[]).map(x=><Pressable key={x} style={s.link} onPress={()=>void act(()=>review(x))}><Text>{verdictLabels[x]}</Text></Pressable>)}</View>
  <View style={s.card}><Text style={s.heading}>Signaler un problème</Text><Pressable style={s.link} onPress={()=>void act(()=>issue("dangerous_instruction","critical"))}><Text>Consigne dangereuse</Text></Pressable><Pressable style={s.link} onPress={()=>void act(()=>issue("unsuitable_hypothesis","medium"))}><Text>Hypothèse inadaptée</Text></Pressable><Pressable style={s.link} onPress={()=>void act(()=>issue("navigation_block","high"))}><Text>Blocage de navigation</Text></Pressable><Pressable style={s.link} onPress={()=>void act(()=>issue("other","low"))}><Text>Autre problème</Text></Pressable></View>
  {saved?<Text style={s.saved}>{saved}</Text>:null}
 </ScrollView>
}
const labels:Record<FeedbackAnswer,string>={yes:"Oui",rather_yes:"Plutôt oui",uncertain:"Incertain",rather_no:"Plutôt non",no:"Non"};
const verdictLabels:Record<HumanHypothesisVerdict,string>={coherent:"Cohérente",possible_unverified:"Possible, non vérifiée",unlikely:"Peu probable",incorrect:"Incorrecte",impossible_to_evaluate:"Impossible à évaluer"};
const s=StyleSheet.create({container:{padding:layout.pagePadding,gap:14},title:{fontSize:30,fontWeight:"800",color:colors.navy},help:{color:colors.muted,lineHeight:21},
 card:{backgroundColor:colors.surface,borderRadius:layout.radius,padding:15,gap:10},heading:{fontSize:18,fontWeight:"800",color:colors.navy},row:{flexDirection:"row",flexWrap:"wrap",gap:7},
 choice:{padding:9,borderRadius:9,backgroundColor:"#EEF1F3"},selected:{backgroundColor:colors.tealSoft,borderWidth:1,borderColor:colors.teal},input:{minHeight:80,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:10,textAlignVertical:"top"},
 button:{backgroundColor:colors.teal,borderRadius:12,padding:14,alignItems:"center"},buttonText:{color:colors.surface,fontWeight:"800"},link:{padding:10,borderWidth:1,borderColor:colors.border,borderRadius:9},saved:{color:colors.teal,fontWeight:"800"}});
