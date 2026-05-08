import { Award, Compass, Orbit } from "lucide-react";
import type { Game, GameWhimsyStats } from "../../../shared/domain/types";

const formatPercent = (value: number): string => `${Math.round(value * 100)}%`;

const hasStats = (stats?: GameWhimsyStats): stats is GameWhimsyStats =>
  Boolean(stats?.mostDifferent || stats?.mostSimilar || stats?.mostExtreme);

export const FinalWhimsyStats = ({ game }: { game: Game }) => {
  const stats = game.whimsyStats;
  const imageById = new Map(game.chartSnapshot.images.map((image) => [image.id, image]));

  if (!hasStats(stats)) {
    return null;
  }

  return (
    <div className="whimsy-stats" aria-label="Game superlatives">
      {stats.mostDifferent ? (
        <article className="whimsy-stat different">
          <Orbit size={18} />
          <div>
            <span>Wildest orbit</span>
            <strong>{stats.mostDifferent.username}</strong>
            <small>{formatPercent(stats.mostDifferent.averageDistance)} average drift</small>
          </div>
        </article>
      ) : null}

      {stats.mostSimilar ? (
        <article className="whimsy-stat similar">
          <Award size={18} />
          <div>
            <span>Consensus whisperer</span>
            <strong>{stats.mostSimilar.username}</strong>
            <small>{formatPercent(stats.mostSimilar.averageDistance)} average drift</small>
          </div>
        </article>
      ) : null}

      {stats.mostExtreme ? (
        <article className="whimsy-stat extreme">
          <Compass size={18} />
          <div>
            <span>Edge cartographer</span>
            <strong>{stats.mostExtreme.username}</strong>
            <small>{imageById.get(stats.mostExtreme.imageId)?.filename ?? "mystery image"}</small>
          </div>
        </article>
      ) : null}
    </div>
  );
};
