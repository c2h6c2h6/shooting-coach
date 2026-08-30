import { NumericMetricKey, SeriesComparison } from "./seriesComparison";

const labels: Record<NumericMetricKey, string> = {
  horizontalOffset: "Le décalage horizontal du centre moyen",
  verticalOffset: "Le décalage vertical du centre moyen",
  centroidDistanceToTargetCenter: "La distance du centre moyen au centre de la cible",
  spreadWidth: "La largeur", spreadHeight: "La hauteur",
  extremeSpread: "Le diamètre maximal", meanRadius: "Le rayon moyen",
  meanDistanceToTargetCenter: "La distance moyenne des impacts au centre",
};
const amount = (value: number, unit: SeriesComparison["unit"]) =>
  unit === "mm" ? `${Math.abs(value).toFixed(1)} mm` : `${(Math.abs(value) * 100).toFixed(1)} % de la zone`;

export function buildComparisonSummary(comparison: SeriesComparison): string[] {
  if (comparison.status === "not_comparable") return ["Comparaison indisponible : les contextes ne sont pas compatibles."];
  const keys: NumericMetricKey[] = ["centroidDistanceToTargetCenter", "extremeSpread", "spreadWidth", "spreadHeight", "meanRadius"];
  return keys.flatMap((key) => {
    const item = comparison.differences[key];
    if (!item) return [];
    if (item.variation === "stable") return [`${labels[key]} reste très proche.`];
    return [`${labels[key]} ${item.delta < 0 ? "diminue" : "augmente"} de ${amount(item.delta, comparison.unit)}.`];
  }).slice(0, 4);
}
