import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MvpValidationRepository } from "../../src/application/mvpValidationRepository";
import { syntheticScenarioCatalog } from "../../src/domain/syntheticScenarioCatalog";
import { runSyntheticScenario, SyntheticRunResult } from "../../src/domain/syntheticScenarioRunner";
import { getDatabase } from "../../src/infrastructure/database/sqlite";
import { useDemoMode } from "../../src/ui/DemoModeProvider";
import { colors, layout, shadows } from "../../src/ui/theme";
export default function ValidationScreen(){
 const demo=useDemoMode(),[result,setResult]=useState<SyntheticRunResult|null>(null),[busy,setBusy]=useState(false);
 async function load(code:string){setBusy(true);try{
  const scenario=syntheticScenarioCatalog.find(s=>s.code===code)!;const run=runSyntheticScenario(scenario);const at=new Date().toISOString();
  await new MvpValidationRepository(await getDatabase()).saveDemoRun(randomUUID(),code,scenario.version,run,at);
  await demo.setDemo(true,code);setResult(run);
 }catch(e){Alert.alert("Démonstration impossible",e instanceof Error?e.message:"Erreur locale.")}finally{setBusy(false)}}
 return <ScrollView contentContainerStyle={s.container}>
  <Text style={s.eyebrow}>VALIDATION TERRAIN · MVP</Text><Text style={s.title}>Scénarios contrôlés</Text>
  <Text style={s.body}>Ces données sont simulées et restent séparées de vos séances réelles.</Text>
  {demo.enabled?<View style={s.banner}><Text style={s.bannerText}>Mode démonstration — données simulées{demo.scenarioCode?` · scénario ${demo.scenarioCode}`:""}</Text></View>:null}
  {syntheticScenarioCatalog.map(x=><Pressable disabled={busy} key={x.code} style={s.card} onPress={()=>void load(x.code)}>
   <Text style={s.cardTitle}>{x.code} — {x.title}</Text><Text style={s.help}>{x.sourceImpacts.length} impacts simulés · référentiel {x.version}</Text>
  </Pressable>)}
  {result?<View style={s.result}><Text style={s.cardTitle}>Résultat du scénario {result.scenarioCode}</Text>
   <Text style={s.body}>Faits : {result.metrics.includedImpactCount} impacts, forme {result.metrics.shapeClassification}.</Text>
   <Text style={s.body}>Observations : {result.observationCodes.join(", ")||"aucune exploitable"}.</Text>
   <Text style={s.body}>Hypothèses : {result.hypotheses.map(h=>h.hypothesisCode).join(", ")||"aucune"}.</Text>
   <Text style={s.help}>Les hypothèses restent des possibilités à vérifier. La cible seule ne démontre pas une cause.</Text>
   {result.warnings.map(x=><Text key={x} style={s.error}>{x}</Text>)}
  </View>:null}
  <Pressable style={s.secondary} onPress={()=>void demo.reset()}><Text style={s.secondaryText}>Réinitialiser les données de démonstration</Text></Pressable>
  <Pressable style={s.secondary} onPress={()=>router.push("/safety" as never)}><Text style={s.secondaryText}>Sécurité et limites</Text></Pressable>
 </ScrollView>
}
const s=StyleSheet.create({container:{padding:layout.pagePadding,gap:14},eyebrow:{color:colors.coral,fontWeight:"800"},title:{fontSize:30,fontWeight:"800",color:colors.navy},
 body:{color:colors.text,fontSize:15,lineHeight:22},banner:{backgroundColor:"#FFF1CC",padding:12,borderRadius:10,borderWidth:1,borderColor:"#E5B94D"},bannerText:{fontWeight:"800",color:"#664900"},
 card:{backgroundColor:colors.surface,padding:16,borderRadius:layout.radius,gap:5,...shadows.card},cardTitle:{fontWeight:"800",fontSize:17,color:colors.navy},
 help:{color:colors.muted,lineHeight:20},result:{backgroundColor:colors.tealSoft,padding:16,borderRadius:layout.radius,gap:8},
 error:{color:colors.danger,fontWeight:"700"},secondary:{borderWidth:1,borderColor:colors.teal,padding:14,borderRadius:12,alignItems:"center"},
 secondaryText:{color:colors.teal,fontWeight:"800"}});
