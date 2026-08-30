import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  APP_OPENING_ANIMATION_DURATION_MS,
  APP_OPENING_BRAND,
  APP_OPENING_BRAND_CHARACTERS,
  APP_OPENING_INITIAL_HOLD_MS,
  APP_OPENING_SAFETY_RULES,
  APP_OPENING_SPLIT_FLAP_SEQUENCES,
} from "./appOpeningContent";

interface AppOpeningScreenProps {
  readonly onEnter: () => void;
}

const FLAP_START_DELAY_MS = APP_OPENING_INITIAL_HOLD_MS;
const FLAP_STAGGER_MS = 170;
const FLAP_OUT_DURATION_MS = 72;
const FLAP_IN_DURATION_MS = 88;

interface SplitFlapCellProps {
  readonly character: string;
  readonly flip: Animated.Value;
}

function SplitFlapCell({ character, flip }: SplitFlapCellProps) {
  const rotateX = flip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["88deg", "0deg", "-88deg"],
  });
  const scaleY = flip.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [0.18, 1, 0.18],
  });

  return (
    <View style={styles.flapCell}>
      <View style={styles.flapCellTopShade} />
      <View style={styles.flapCellDivider} />
      <Animated.Text
        style={[
          styles.flapCharacter,
          { transform: [{ perspective: 620 }, { rotateX }, { scaleY }] },
        ]}
      >
        {character}
      </Animated.Text>
      <View style={styles.flapHingeLeft} />
      <View style={styles.flapHingeRight} />
    </View>
  );
}

export function AppOpeningScreen({ onEnter }: AppOpeningScreenProps) {
  const flips = useRef(APP_OPENING_SPLIT_FLAP_SEQUENCES.map(() => new Animated.Value(0))).current;
  const finalOpacity = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const animationCancelled = useRef(false);
  const [flapCharacters, setFlapCharacters] = useState<string[]>(
    APP_OPENING_SPLIT_FLAP_SEQUENCES.map((sequence) => sequence[0]),
  );
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    animationCancelled.current = false;

    const runStep = (cellIndex: number, sequenceIndex: number) => {
      if (animationCancelled.current) return;
      const sequence = APP_OPENING_SPLIT_FLAP_SEQUENCES[cellIndex];
      if (sequenceIndex >= sequence.length) return;

      Animated.timing(flips[cellIndex], {
        toValue: 1,
        duration: FLAP_OUT_DURATION_MS,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || animationCancelled.current) return;
        setFlapCharacters((current) => current.map((value, index) => (
          index === cellIndex ? sequence[sequenceIndex] : value
        )));
        flips[cellIndex].setValue(-1);
        Animated.timing(flips[cellIndex], {
          toValue: 0,
          duration: FLAP_IN_DURATION_MS,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(({ finished: flapFinished }) => {
          if (flapFinished) runStep(cellIndex, sequenceIndex + 1);
        });
      });
    };

    APP_OPENING_SPLIT_FLAP_SEQUENCES.forEach((_, cellIndex) => {
      timers.current.push(setTimeout(
        () => runStep(cellIndex, 1),
        FLAP_START_DELAY_MS + cellIndex * FLAP_STAGGER_MS,
      ));
    });
    timers.current.push(setTimeout(
      () => { if (!animationCancelled.current) setAnimationComplete(true); },
      APP_OPENING_ANIMATION_DURATION_MS,
    ));

    return () => {
      animationCancelled.current = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      flips.forEach((flip) => flip.stopAnimation());
    };
  }, [flips]);

  useEffect(() => {
    if (!animationComplete) return;
    Animated.timing(finalOpacity, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [animationComplete, finalOpacity]);

  const showFinalState = () => {
    animationCancelled.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    flips.forEach((flip) => {
      flip.stopAnimation();
      flip.setValue(0);
    });
    setAnimationComplete(true);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.ambientTop} />
      <View style={styles.ambientBottom} />
      {!animationComplete ? (
        <View style={styles.animationStage} accessibilityLabel="Animation C2H6 vers ACDC">
          <Text style={styles.overline}>COACH DE TIR</Text>
          <View style={styles.flapBoard}>
            {flapCharacters.map((character, index) => (
              <SplitFlapCell
                key={index}
                character={character}
                flip={flips[index]}
              />
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Passer l’animation"
            onPress={showFinalState}
            style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          >
            <Text style={styles.skipText}>Passer</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.View style={[styles.finalState, { opacity: finalOpacity }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.identityBlock}>
              <Text style={styles.overline}>COACH DE TIR</Text>
              <View
                accessible
                accessibilityLabel={APP_OPENING_BRAND}
                style={styles.brandTiles}
              >
                {APP_OPENING_BRAND_CHARACTERS.map((character, index) => (
                  <View
                    key={`${character}-${index}`}
                    style={[styles.brandTile, character === "/" && styles.brandSlashTile]}
                  >
                    <Text style={styles.brandTileText}>{character}</Text>
                    <View style={styles.brandTileDivider} />
                  </View>
                ))}
              </View>
              <View style={styles.brandRule} />
              <Text style={styles.safetyTitle}>Les quatre règles de sécurité</Text>
            </View>

            <View style={styles.rules}>
              {APP_OPENING_SAFETY_RULES.map((rule, index) => (
                <View key={rule.keyword} style={styles.ruleCard}>
                  <Text style={styles.ruleIndex}>{String(index + 1).padStart(2, "0")}</Text>
                  <View style={styles.ruleCopy}>
                    <Text style={styles.ruleKeyword}>{rule.keyword}</Text>
                    <Text style={styles.ruleStatement}>{rule.statement}</Text>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Entrer dans l’application"
              onPress={onEnter}
              style={({ pressed }) => [styles.enterButton, pressed && styles.pressed]}
            >
              <Text style={styles.enterButtonText}>Entrer dans l’application</Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#07141F",
    overflow: "hidden",
  },
  ambientTop: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "#123C46",
    opacity: 0.32,
    top: -130,
    right: -110,
  },
  ambientBottom: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#5A3328",
    opacity: 0.18,
    bottom: -140,
    left: -100,
  },
  animationStage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 22,
  },
  overline: {
    color: "#73D4C8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2.4,
  },
  flapBoard: {
    width: "100%",
    maxWidth: 330,
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#36515D",
    borderRadius: 18,
    backgroundColor: "#091923",
  },
  flapCell: {
    width: 50,
    height: 84,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#405965",
    backgroundColor: "#132833",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  flapCellTopShade: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.035)",
  },
  flapCellDivider: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 2,
    backgroundColor: "#07141F",
    zIndex: 2,
  },
  flapCharacter: {
    color: "#F8FAFC",
    fontSize: 40,
    fontWeight: "900",
  },
  flapHingeLeft: {
    position: "absolute",
    left: 2,
    top: "50%",
    width: 4,
    height: 8,
    marginTop: -4,
    borderRadius: 2,
    backgroundColor: "#526A75",
    zIndex: 3,
  },
  flapHingeRight: {
    position: "absolute",
    right: 2,
    top: "50%",
    width: 4,
    height: 8,
    marginTop: -4,
    borderRadius: 2,
    backgroundColor: "#526A75",
    zIndex: 3,
  },
  skipButton: { position: "absolute", top: 22, right: 20, padding: 12 },
  skipText: { color: "#AFC2CC", fontSize: 14, fontWeight: "700" },
  finalState: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    paddingTop: 34,
    paddingBottom: 26,
    gap: 22,
  },
  identityBlock: { alignItems: "center", gap: 10 },
  brandTiles: { flexDirection: "row", justifyContent: "center", gap: 4 },
  brandTile: {
    width: 24,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#36515D",
    backgroundColor: "#10242F",
    overflow: "hidden",
  },
  brandSlashTile: { marginHorizontal: 4, borderColor: "#58707A" },
  brandTileText: { color: "#F8FAFC", fontSize: 18, fontWeight: "900" },
  brandTileDivider: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 1,
    backgroundColor: "#07141F",
  },
  brandRule: { width: 42, height: 3, borderRadius: 2, backgroundColor: "#D97958" },
  safetyTitle: {
    color: "#CFDBE1",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  rules: { gap: 10 },
  ruleCard: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#29424E",
  },
  ruleIndex: {
    color: "#73D4C8",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1,
  },
  ruleCopy: { flex: 1, gap: 2 },
  ruleKeyword: { color: "#F8FAFC", fontSize: 16, fontWeight: "800" },
  ruleStatement: { color: "#B8C7CF", fontSize: 14, lineHeight: 19 },
  enterButton: {
    minHeight: 52,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 20,
    backgroundColor: "#0F8B80",
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  enterButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
