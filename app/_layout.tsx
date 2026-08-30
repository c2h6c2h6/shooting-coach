import { Stack } from "expo-router";
import { ProfileProvider } from "../src/ui/ProfileProvider";
import { SessionProvider } from "../src/ui/SessionProvider";
import { SeriesProvider } from "../src/ui/SeriesProvider";
import { ImpactProvider } from "../src/ui/ImpactProvider";
import { SeriesMetricsProvider } from "../src/ui/SeriesMetricsProvider";
import { SeriesComparisonProvider } from "../src/ui/SeriesComparisonProvider";
import { ShootingObservationProvider } from "../src/ui/ShootingObservationProvider";
import { TechnicalHypothesisProvider } from "../src/ui/TechnicalHypothesisProvider";
import { CoachingProvider } from "../src/ui/CoachingProvider";
import { colors } from "../src/ui/theme";
import { DemoModeProvider, useDemoMode } from "../src/ui/DemoModeProvider";
import { Text } from "react-native";

export default function RootLayout() {
  return (
    <DemoModeProvider>
    <ProfileProvider>
    <SessionProvider>
    <SeriesProvider>
    <ImpactProvider>
    <SeriesMetricsProvider>
    <SeriesComparisonProvider>
    <ShootingObservationProvider>
    <TechnicalHypothesisProvider>
    <CoachingProvider>
    <AppStack />
    </CoachingProvider>
    </TechnicalHypothesisProvider>
    </ShootingObservationProvider>
    </SeriesComparisonProvider>
    </SeriesMetricsProvider>
    </ImpactProvider>
    </SeriesProvider>
    </SessionProvider>
    </ProfileProvider>
    </DemoModeProvider>
  );
}
function AppStack(){
 const demo=useDemoMode();
 return <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: colors.surface,
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: colors.background },
        headerRight:()=>demo.enabled?<Text style={{color:"#FFD56A",fontWeight:"800",fontSize:11}}>DÉMO · SIMULÉ</Text>:null,
      }}
    >
      <Stack.Screen name="index" options={{ title: "Coach Tir" }} />
      <Stack.Screen name="profiles/new" options={{ title: "Nouveau profil" }} />
      <Stack.Screen name="profiles/index" options={{ title: "Profils" }} />
      <Stack.Screen name="profiles/[id]/edit" options={{ title: "Modifier le profil" }} />
      <Stack.Screen name="sessions/new" options={{ title: "Nouvelle séance" }} />
      <Stack.Screen name="sessions/review" options={{ title: "Récapitulatif" }} />
      <Stack.Screen name="sessions/[id]/index" options={{ title: "Séance" }} />
      <Stack.Screen name="sessions/[id]/series/new" options={{ title: "Nouvelle série" }} />
      <Stack.Screen name="sessions/[id]/series/[seriesId]" options={{ title: "Série" }} />
      <Stack.Screen name="sessions/[id]/series/[seriesId]/impacts" options={{ title: "Saisie des impacts" }} />
      <Stack.Screen name="sessions/[id]/series/[seriesId]/compare" options={{ title: "Comparer les séries" }} />
      <Stack.Screen name="sessions/[id]/series/[seriesId]/coaching" options={{ title: "Cycle de coaching" }} />
      <Stack.Screen name="sessions/[id]/series/[seriesId]/pedagogical-v2-pilot" options={{ title: "Pilote pédagogique v2" }} />
      <Stack.Screen name="sessions/[id]/feedback" options={{ title: "Retour terrain" }} />
      <Stack.Screen name="validation/index" options={{ title: "Validation du MVP" }} />
      <Stack.Screen name="safety" options={{ title: "Sécurité et limites" }} />
    </Stack>
}
