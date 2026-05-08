import type { CSSProperties } from "react";
import type { Game } from "../../../shared/domain/types";

export const FinalChart = ({ game }: { game: Game }) => {
  const imageById = new Map(game.chartSnapshot.images.map((image) => [image.id, image]));

  return (
    <div className="final-chart">
      <div className="final-axis-labels x">
        <span className="min">{game.chartSnapshot.xAxisMinLabel}</span>
        <span className="max">{game.chartSnapshot.xAxisMaxLabel}</span>
      </div>
      <div className="final-axis-labels y">
        <span className="min">{game.chartSnapshot.yAxisMinLabel}</span>
        <span className="max">{game.chartSnapshot.yAxisMaxLabel}</span>
      </div>
      <div className="final-board">
        <div className="midline vertical" />
        <div className="midline horizontal" />
        {game.results.map((result) => {
          const image = imageById.get(result.imageId);

          return image ? (
            <div
              key={result.imageId}
              className="final-placement"
              style={
                {
                  "--x": `${result.x * 100}%`,
                  "--y": `${(1 - result.y) * 100}%`
                } as CSSProperties
              }
            >
              <img src={image.url} alt={image.filename} />
            </div>
          ) : null;
        })}
      </div>
    </div>
  );
};
