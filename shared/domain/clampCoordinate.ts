import type { Coordinate } from "./types";

export const clampCoordinate = (coordinate: Coordinate): Coordinate => ({
  x: Math.max(0, Math.min(1, coordinate.x)),
  y: Math.max(0, Math.min(1, coordinate.y))
});
