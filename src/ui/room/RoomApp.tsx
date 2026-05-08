import { Clipboard, Home, LogIn, Play, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { canEditUsername } from "../../../shared/domain/canEditUsername";
import type { Game, Vote } from "../../../shared/domain/types";
import { useAdminGate } from "../../admin/useAdminGate";
import { requestJson } from "../../api/requestJson";
import { getStoredPlayer, saveStoredUsername } from "../../player/getStoredPlayer";
import { AlignmentBoard } from "./AlignmentBoard";
import { FinalChart } from "./FinalChart";
import { FinalWhimsyStats } from "./FinalWhimsyStats";

export const RoomApp = ({ slug }: { slug: string }) => {
  const adminGate = useAdminGate();
  const storedPlayer = useMemo(() => getStoredPlayer(), []);
  const [game, setGame] = useState<Game | null>(null);
  const [username, setUsername] = useState(storedPlayer.username);
  const [liveVotes, setLiveVotes] = useState<Vote[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const lastPlacementSentAtRef = useRef(0);
  const pendingPlacementRef = useRef<{ x: number; y: number } | null>(null);
  const placementSendTimeoutRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setGame(await requestJson<Game>(`/api/rooms/${slug}`));
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const join = async () => {
    saveStoredUsername(username);
    const joined = await requestJson<Game>(`/api/rooms/${slug}/join`, {
      method: "POST",
      body: JSON.stringify({ playerId: storedPlayer.id, username })
    });
    setGame(joined);
  };

  useEffect(() => {
    if (!username || socketRef.current) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socketRef.current = socket;

    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({ type: "join_room", payload: { slug, playerId: storedPlayer.id, username } }));
    });

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as { type: string; payload: Game | Vote };

      if (message.type === "game_updated") {
        setGame(message.payload as Game);
      }

      if (message.type === "placement_moved") {
        const vote = message.payload as Vote;

        if (vote.playerId === storedPlayer.id) {
          return;
        }

        setLiveVotes((current) => [...current.filter((item) => item.playerId !== vote.playerId), vote]);
      }
    });

    return () => {
      if (placementSendTimeoutRef.current) {
        window.clearTimeout(placementSendTimeoutRef.current);
      }
      socket.close();
      socketRef.current = null;
    };
  }, [slug, storedPlayer.id, username]);

  const currentRound = game?.rounds.find((round) => round.id === game.currentRoundId);
  const currentImage = game?.chartSnapshot.images.find((image) => image.id === game.currentImageId);
  const displayedVotes = game?.status === "round_active" ? liveVotes : currentRound?.votes ?? [];

  const flushPlacement = () => {
    const placement = pendingPlacementRef.current;

    if (!placement || socketRef.current?.readyState !== WebSocket.OPEN) {
      return;
    }

    pendingPlacementRef.current = null;
    lastPlacementSentAtRef.current = performance.now();
    socketRef.current.send(JSON.stringify({ type: "placement_moved", payload: placement }));
  };

  const sendPlacement = (x: number, y: number) => {
    setLiveVotes((current) => [
      ...current.filter((vote) => vote.playerId !== storedPlayer.id),
      {
        playerId: storedPlayer.id,
        username: username || "Player",
        x,
        y,
        updatedAt: new Date().toISOString()
      }
    ]);

    pendingPlacementRef.current = { x, y };

    if (performance.now() - lastPlacementSentAtRef.current > 80) {
      flushPlacement();
      return;
    }

    if (placementSendTimeoutRef.current) {
      window.clearTimeout(placementSendTimeoutRef.current);
    }

    placementSendTimeoutRef.current = window.setTimeout(flushPlacement, 80);
  };

  const rename = async () => {
    saveStoredUsername(username);
    setGame(
      await requestJson<Game>(`/api/rooms/${slug}/rename`, {
        method: "POST",
        body: JSON.stringify({ playerId: storedPlayer.id, username })
      })
    );
  };

  const startRound = async () => {
    setLiveVotes([]);
    setGame(await requestJson<Game>(`/api/rooms/${slug}/start-round`, { method: "POST" }));
  };

  const endRound = async () => {
    setGame(await requestJson<Game>(`/api/rooms/${slug}/end-round`, { method: "POST" }));
  };

  if (!game) {
    return <main className="shell">Loading room...</main>;
  }

  const visiblePlayers = game.players.slice(0, 4);
  const hiddenPlayerCount = Math.max(0, game.players.length - visiblePlayers.length);

  return (
    <main className="shell room-shell">
      <header className="room-header">
        <div>
          <p className="kicker">{game.roomSlug}</p>
          <h1>{game.chartSnapshot.name}</h1>
        </div>
        <div className="room-header-actions">
          <div className="players-chip" title={game.players.map((player) => player.username).join(", ")}>
            <span>Players</span>
            <strong>
              {visiblePlayers.length > 0 ? visiblePlayers.map((player) => player.username).join(", ") : "none"}
              {hiddenPlayerCount > 0 ? ` +${hiddenPlayerCount}` : ""}
            </strong>
          </div>
          {username ? <div className="username-chip">{username}</div> : null}
          <a className="icon-button" href="/" title="Home">
            <Home size={18} />
          </a>
          <button className="icon-button" title="Copy room URL" onClick={() => void navigator.clipboard.writeText(location.href)}>
            <Clipboard size={18} />
          </button>
        </div>
      </header>

      <section className="room-controls">
        <label>
          Username
          <input
            value={username}
            disabled={!canEditUsername(game.status)}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>
        <button className="button" disabled={!username || !canEditUsername(game.status)} onClick={username ? rename : join}>
          <LogIn size={16} />
          Save
        </button>
        {adminGate.isAdmin ? (
          <>
            <button
              className="button primary"
              disabled={game.status === "round_active" || game.status === "complete"}
              onClick={startRound}
            >
              <Play size={16} />
              Start round
            </button>
            <button className="button danger" disabled={game.status !== "round_active"} onClick={endRound}>
              <Square size={16} />
              End round
            </button>
          </>
        ) : null}
      </section>

      {game.status !== "complete" ? (
        <AlignmentBoard
          game={game}
          image={currentImage}
          votes={displayedVotes}
          ownPlayerId={storedPlayer.id}
          onMove={sendPlacement}
        />
      ) : null}

      {game.status === "complete" ? (
        <section className="panel final-panel">
          <div className="final-panel-header">
            <h2>Final chart</h2>
            <a className="button" href={`/api/rooms/${game.roomSlug}/final.png?download=1`} download={`${game.roomSlug}-final-chart.png`}>
              Download PNG
            </a>
          </div>
          <FinalWhimsyStats game={game} />
          <FinalChart game={game} />
        </section>
      ) : null}
    </main>
  );
};
