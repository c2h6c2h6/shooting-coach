export interface Size { width: number; height: number }
export interface Point { x: number; y: number }
export interface ViewTransform { zoom: number; panX: number; panY: number }

export const IDENTITY_VIEW: ViewTransform = { zoom: 1, panX: 0, panY: 0 };

function assertSize(size: Size) {
  if (size.width <= 0 || size.height <= 0) throw new Error("Dimensions de cible invalides.");
}

export function normalizedToScreen(point: Point, size: Size, view = IDENTITY_VIEW): Point {
  assertSize(size);
  return {
    x: (point.x - 0.5) * size.width * view.zoom + size.width / 2 + view.panX,
    y: (point.y - 0.5) * size.height * view.zoom + size.height / 2 + view.panY,
  };
}

export function screenToNormalized(point: Point, size: Size, view = IDENTITY_VIEW): Point {
  assertSize(size);
  return {
    x: ((point.x - size.width / 2 - view.panX) / view.zoom) / size.width + 0.5,
    y: ((point.y - size.height / 2 - view.panY) / view.zoom) / size.height + 0.5,
  };
}

export function isInsideNormalized(point: Point) {
  return point.x >= 0 && point.x <= 1 && point.y >= 0 && point.y <= 1;
}
