import { describe, expect, it } from "vitest";
import { calculatePlacement } from "./calculatePlacement";
import type { Vote } from "./types";

const vote = (x: number, y: number): Vote => ({
  playerId: `${x}-${y}`,
  username: "mike",
  x,
  y,
  updatedAt: "2026-05-07T00:00:00.000Z"
});

describe("calculatePlacement", () => {
  it("returns null with no votes", () => {
    expect(calculatePlacement([])).toBeNull();
  });

  it("uses the single vote", () => {
    expect(calculatePlacement([vote(0.25, 0.75)])).toEqual({ x: 0.25, y: 0.75 });
  });

  it("averages votes", () => {
    expect(calculatePlacement([vote(0, 0), vote(1, 1), vote(0.5, 0.5)])).toEqual({
      x: 0.5,
      y: 0.5
    });
  });

  it("clamps votes before averaging", () => {
    expect(calculatePlacement([vote(-1, 2), vote(1, 0)])).toEqual({ x: 0.5, y: 0.5 });
  });
});
