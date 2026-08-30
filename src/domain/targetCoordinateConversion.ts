export interface NormalizedPoint { x: number; y: number }
export interface LogicalPoint { x: number; y: number }
export interface PhysicalPointMm { x: number; y: number }

export interface TargetGeometry {
  version: string;
  widthMm: number | null;
  heightMm: number | null;
  centerNormalizedX: number;
  centerNormalizedY: number;
}

export const UNVERIFIED_TARGET_GEOMETRY_VERSION = "unverified-normalized-v1";

export function normalizedToLogical(
  point: NormalizedPoint,
  geometry: Pick<TargetGeometry, "centerNormalizedX" | "centerNormalizedY">,
): LogicalPoint {
  return {
    x: point.x - geometry.centerNormalizedX,
    // L’axe écran descend ; l’axe logique/physique monte.
    y: geometry.centerNormalizedY - point.y,
  };
}

export function logicalToNormalized(
  point: LogicalPoint,
  geometry: Pick<TargetGeometry, "centerNormalizedX" | "centerNormalizedY">,
): NormalizedPoint {
  return {
    x: point.x + geometry.centerNormalizedX,
    y: geometry.centerNormalizedY - point.y,
  };
}

export function logicalToPhysical(
  point: LogicalPoint,
  geometry: TargetGeometry,
): PhysicalPointMm | null {
  if (geometry.widthMm == null || geometry.heightMm == null) return null;
  return { x: point.x * geometry.widthMm, y: point.y * geometry.heightMm };
}

export function normalizedToPhysical(
  point: NormalizedPoint,
  geometry: TargetGeometry,
): PhysicalPointMm | null {
  return logicalToPhysical(normalizedToLogical(point, geometry), geometry);
}

