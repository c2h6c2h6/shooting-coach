export const OBSERVATION_THRESHOLDS_VERSION = "observation-thresholds-v2";

// Seuils provisoires, descriptifs et non pédagogiques. 0,01 = 1 % de la zone.
export const observationThresholds = {
  normalized: {
    centered: .025,
    directionUncertainMargin: .005,
    diagonalComponent: .035,
    offsetMagnitude: [.025, .07, .14] as const,
    // Seuil pilote : un groupement occupant au plus 20 % de la zone sur chaque
    // axe reste décrit comme resserré. La qualification est descriptive et ne
    // signifie pas, à elle seule, que la technique est maîtrisée.
    compactAxis: .20,
    wideAxis: .25,
    wideExtremeSpread: .30,
  },
  physicalMm: {
    centered: 5,
    directionUncertainMargin: 1,
    diagonalComponent: 7,
    offsetMagnitude: [5, 15, 30] as const,
    compactAxis: 40,
    wideAxis: 50,
    wideExtremeSpread: 60,
  },
  axisRatio: 1.5,
  minimum: { position: 1, dispersion: 2, shape: 5, cautiousShape: 3, outlier: 5 },
} as const;
