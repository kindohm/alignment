import { clampCoordinate } from "./clampCoordinate";
import type { GameWhimsyStats, Round, Vote, WhimsyPlayerDistanceStat, WhimsyExtremeVoteStat } from "./types";

type PlayerVoteSummary = {
  playerId: string;
  username: string;
  voteCount: number;
};

type PlayerDistanceSummary = PlayerVoteSummary & {
  distanceTotal: number;
  comparisonCount: number;
};

const minimumVoteCount = 2;

const distance = (a: Vote, b: Vote): number => {
  const clampedA = clampCoordinate(a);
  const clampedB = clampCoordinate(b);
  const dx = clampedA.x - clampedB.x;
  const dy = clampedA.y - clampedB.y;

  return Math.sqrt(dx * dx + dy * dy);
};

const centerDistance = (vote: Vote): number => {
  const clamped = clampCoordinate(vote);
  const dx = clamped.x - 0.5;
  const dy = clamped.y - 0.5;

  return Math.sqrt(dx * dx + dy * dy);
};

const updatePlayerVoteCount = (summaries: Map<string, PlayerVoteSummary>, vote: Vote) => {
  const existing = summaries.get(vote.playerId);

  if (existing) {
    existing.voteCount += 1;
    existing.username = vote.username;
    return;
  }

  summaries.set(vote.playerId, {
    playerId: vote.playerId,
    username: vote.username,
    voteCount: 1
  });
};

const toDistanceStat = (summary: PlayerDistanceSummary): WhimsyPlayerDistanceStat | null =>
  summary.comparisonCount > 0
    ? {
        playerId: summary.playerId,
        username: summary.username,
        voteCount: summary.voteCount,
        comparisonCount: summary.comparisonCount,
        averageDistance: summary.distanceTotal / summary.comparisonCount
      }
    : null;

export const calculateWhimsyStats = (rounds: Round[]): GameWhimsyStats => {
  const voteSummaries = new Map<string, PlayerVoteSummary>();

  rounds.forEach((round) => {
    round.votes.forEach((vote) => updatePlayerVoteCount(voteSummaries, vote));
  });

  const eligiblePlayerIds = new Set(
    [...voteSummaries.values()].filter((summary) => summary.voteCount >= minimumVoteCount).map((summary) => summary.playerId)
  );

  const distanceSummaries = new Map<string, PlayerDistanceSummary>();
  let mostExtreme: WhimsyExtremeVoteStat | undefined;

  const getDistanceSummary = (vote: Vote): PlayerDistanceSummary => {
    const existing = distanceSummaries.get(vote.playerId);

    if (existing) {
      existing.username = vote.username;
      return existing;
    }

    const voteCount = voteSummaries.get(vote.playerId)?.voteCount ?? 0;
    const next = {
      playerId: vote.playerId,
      username: vote.username,
      voteCount,
      distanceTotal: 0,
      comparisonCount: 0
    };

    distanceSummaries.set(vote.playerId, next);
    return next;
  };

  rounds.forEach((round) => {
    round.votes.forEach((vote, index) => {
      if (!eligiblePlayerIds.has(vote.playerId)) {
        return;
      }

      const extremeDistance = centerDistance(vote);

      if (!mostExtreme || extremeDistance > mostExtreme.distanceFromCenter) {
        const clamped = clampCoordinate(vote);

        mostExtreme = {
          playerId: vote.playerId,
          username: vote.username,
          voteCount: voteSummaries.get(vote.playerId)?.voteCount ?? 0,
          roundId: round.id,
          imageId: round.imageId,
          x: clamped.x,
          y: clamped.y,
          distanceFromCenter: extremeDistance
        };
      }

      round.votes.forEach((otherVote, otherIndex) => {
        if (index === otherIndex || !eligiblePlayerIds.has(otherVote.playerId)) {
          return;
        }

        const summary = getDistanceSummary(vote);
        summary.distanceTotal += distance(vote, otherVote);
        summary.comparisonCount += 1;
      });
    });
  });

  const distanceStats = [...distanceSummaries.values()].map(toDistanceStat).filter((stat): stat is WhimsyPlayerDistanceStat => Boolean(stat));

  return {
    mostDifferent: distanceStats.reduce<WhimsyPlayerDistanceStat | undefined>(
      (best, stat) => (!best || stat.averageDistance > best.averageDistance ? stat : best),
      undefined
    ),
    mostSimilar: distanceStats.reduce<WhimsyPlayerDistanceStat | undefined>(
      (best, stat) => (!best || stat.averageDistance < best.averageDistance ? stat : best),
      undefined
    ),
    mostExtreme
  };
};
