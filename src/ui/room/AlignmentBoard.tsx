import { useRef, useState } from "react";
import type { ChartImage, Game, Vote } from "../../../shared/domain/types";

type Props = {
  game: Game;
  image?: ChartImage;
  votes: Vote[];
  ownPlayerId: string;
  onMove: (x: number, y: number) => void;
};

export const AlignmentBoard = ({ game, image, votes, ownPlayerId, onMove }: Props) => {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const move = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const y = 1 - Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    onMove(x, y);
  };

  const pointerMove = (event: React.PointerEvent) => {
    if (!dragging || game.status !== "round_active") {
      return;
    }

    move(event.clientX, event.clientY);
  };

  const ownVote = votes.find((vote) => vote.playerId === ownPlayerId);
  const resultRound = game.rounds.find((round) => round.id === game.currentRoundId);
  const result = resultRound?.result;
  const placementMode = game.status === "round_active" ? "live" : "settled";

  return (
    <section className="board-wrap">
      <div className="axis-label x">{game.chartSnapshot.xAxisName}</div>
      <div className="axis-label y">{game.chartSnapshot.yAxisName}</div>
      <div
        ref={boardRef}
        className="board"
        onPointerDown={(event) => {
          if (game.status !== "round_active") {
            return;
          }

          setDragging(true);
          move(event.clientX, event.clientY);
        }}
        onPointerMove={pointerMove}
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        <div className="midline vertical" />
        <div className="midline horizontal" />
        {votes.map((vote) => (
          <div
            key={vote.playerId}
            className={`${vote.playerId === ownPlayerId ? "placement own" : "placement ghost"} ${placementMode}`}
            style={{ left: `${vote.x * 100}%`, top: `${(1 - vote.y) * 100}%` }}
          >
            {image ? <img src={image.url} alt="" /> : null}
            <span>{vote.username}</span>
          </div>
        ))}
        {game.status !== "round_active" && result && image ? (
          <div className="placement result" style={{ left: `${result.x * 100}%`, top: `${(1 - result.y) * 100}%` }}>
            <img src={image.url} alt="" />
          </div>
        ) : null}
        {game.status === "round_active" && image && !ownVote ? (
          <div className="prompt-piece">
            <img src={image.url} alt={image.filename} />
            <span>drag me</span>
          </div>
        ) : null}
      </div>
    </section>
  );
};
