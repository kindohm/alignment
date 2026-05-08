import { describe, expect, it } from "vitest";
import { calculateWhimsyStats } from "./calculateWhimsyStats";
import type { Round, Vote } from "./types";

const vote = (playerId: string, username: string, x: number, y: number): Vote => ({
  playerId,
  username,
  x,
  y,
  updatedAt: "2026-05-08T00:00:00.000Z"
});

const round = (id: string, imageId: string, votes: Vote[]): Round => ({
  id,
  imageId,
  roundIndex: Number(id.replace("round-", "")),
  status: "complete",
  startedAt: "2026-05-08T00:00:00.000Z",
  endedAt: "2026-05-08T00:01:00.000Z",
  votes
});

describe("calculateWhimsyStats", () => {
  it("excludes players with fewer than two votes", () => {
    const stats = calculateWhimsyStats([
      round("round-1", "img-1", [vote("p1", "Ada", 0, 0), vote("p2", "Grace", 0.5, 0.5)]),
      round("round-2", "img-2", [vote("p2", "Grace", 0.52, 0.5)])
    ]);

    expect(stats.mostDifferent).toBeUndefined();
    expect(stats.mostSimilar).toBeUndefined();
    expect(stats.mostExtreme?.playerId).toBe("p2");
  });

  it("finds players farthest and closest to everyone else", () => {
    const stats = calculateWhimsyStats([
      round("round-1", "img-1", [vote("p1", "Ada", 0.1, 0.1), vote("p2", "Grace", 0.5, 0.5), vote("p3", "Lin", 0.7, 0.7)]),
      round("round-2", "img-2", [vote("p1", "Ada", 0.1, 0.9), vote("p2", "Grace", 0.5, 0.5), vote("p3", "Lin", 0.7, 0.3)])
    ]);

    expect(stats.mostDifferent?.playerId).toBe("p1");
    expect(stats.mostSimilar?.playerId).toBe("p2");
  });

  it("finds eligible player with vote nearest outer edge", () => {
    const stats = calculateWhimsyStats([
      round("round-1", "img-1", [vote("p1", "Ada", 0.1, 0.1), vote("p2", "Grace", 0.5, 0.5)]),
      round("round-2", "img-2", [vote("p1", "Ada", 1, 1), vote("p2", "Grace", 0.6, 0.5)])
    ]);

    expect(stats.mostExtreme).toMatchObject({
      playerId: "p1",
      roundId: "round-2",
      imageId: "img-2",
      x: 1,
      y: 1
    });
  });

  it("omits stats when there are no eligible votes", () => {
    const stats = calculateWhimsyStats([round("round-1", "img-1", [vote("p1", "Ada", 0, 0)])]);

    expect(stats).toEqual({});
  });
});
