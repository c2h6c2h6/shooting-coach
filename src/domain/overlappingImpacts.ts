import { Impact } from "./impact";

export function impactsNear(
  impacts: Impact[],
  normalizedX: number,
  normalizedY: number,
  normalizedRadius: number,
): Impact[] {
  const radiusSquared = normalizedRadius * normalizedRadius;
  return impacts
    .filter((impact) => {
      const dx = impact.normalizedX - normalizedX;
      const dy = impact.normalizedY - normalizedY;
      return dx * dx + dy * dy <= radiusSquared;
    })
    .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

export function nextOverlappingImpactId(
  candidates: Impact[],
  selectedId: string | null,
): string | null {
  if (candidates.length === 0) return null;
  const currentIndex = candidates.findIndex((impact) => impact.id === selectedId);
  return candidates[(currentIndex + 1) % candidates.length].id;
}
