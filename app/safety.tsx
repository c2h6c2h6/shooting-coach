import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DRY_FIRE_SAFETY, LIVE_FIRE_SAFETY } from "../src/domain/coachingSafetyRules";
import { colors, layout } from "../src/ui/theme";
export default function SafetyScreen(){return <ScrollView contentContainerStyle={s.container}>
 <Text style={s.title}>Sécurité et limites</Text>
 <Text style={s.alert}>Arrêtez immédiatement en cas de doute, incident, douleur, fatigue, perte de concentration ou non-respect d’une règle de sécurité.</Text>
 <Section title="Travail à sec" values={DRY_FIRE_SAFETY}/><Section title="Tir réel" values={LIVE_FIRE_SAFETY}/>
 <Section title="Limites du produit" values={["Entraînement sportif statique uniquement, dans un stand autorisé.","Aucun tir opérationnel, dégainé, déplacement ou tir en mouvement.","Aucune modification détaillée de l’arme.","Une cible décrit un résultat ; elle ne prouve jamais seule la cause.","L’application ne remplace ni le règlement du stand ni l’observation d’un instructeur qualifié."]}/>
 </ScrollView>}
function Section({title,values}:{title:string;values:readonly string[]}){return <View style={s.card}><Text style={s.heading}>{title}</Text>{values.map(x=><Text key={x} style={s.body}>• {x}</Text>)}</View>}
const s=StyleSheet.create({container:{padding:layout.pagePadding,gap:16},title:{fontSize:30,fontWeight:"800",color:colors.navy},alert:{padding:14,borderRadius:12,backgroundColor:colors.dangerBackground,color:colors.danger,fontWeight:"700",lineHeight:21},
 card:{padding:16,borderRadius:layout.radius,backgroundColor:colors.surface,gap:8},heading:{fontWeight:"800",fontSize:20,color:colors.navy},body:{color:colors.text,lineHeight:22}});
