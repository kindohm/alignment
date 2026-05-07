import { clampCoordinate } from "./clampCoordinate";
import type { Coordinate, Vote } from "./types";

export const calculatePlacement = (votes: Vote[]): Coordinate | null => {
  if (votes.length === 0) {
    return null;
  }

  const total = votes.reduce(
    (acc, vote) => ({
      x: acc.x + clampCoordinate(vote).x,
      y: acc.y + clampCoordinate(vote).y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / votes.length,
    y: total.y / votes.length
  };
};
