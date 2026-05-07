import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { GameStore } from "../gameStore/createGameStore";

type Client = {
  socket: WebSocket;
  slug?: string;
  playerId?: string;
};

export const createRoomSocketServer = (server: Server, store: GameStore) => {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<Client>();
  const playerConnections = new Map<string, number>();

  const playerConnectionKey = (slug: string, playerId: string): string => `${slug}:${playerId}`;

  const addPlayerConnection = (slug: string, playerId: string) => {
    const key = playerConnectionKey(slug, playerId);
    playerConnections.set(key, (playerConnections.get(key) ?? 0) + 1);
  };

  const removePlayerConnection = (slug: string, playerId: string): number => {
    const key = playerConnectionKey(slug, playerId);
    const nextCount = Math.max(0, (playerConnections.get(key) ?? 0) - 1);

    if (nextCount === 0) {
      playerConnections.delete(key);
    } else {
      playerConnections.set(key, nextCount);
    }

    return nextCount;
  };

  const send = (socket: WebSocket, type: string, payload: unknown) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify({ type, payload }));
    }
  };

  const broadcast = (slug: string, type: string, payload: unknown) => {
    clients.forEach((client) => {
      if (client.slug === slug) {
        send(client.socket, type, payload);
      }
    });
  };

  wss.on("connection", (socket) => {
    const client: Client = { socket };
    clients.add(client);

    socket.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as {
        type: string;
        payload: Record<string, unknown>;
      };

      if (message.type === "join_room") {
        const slug = String(message.payload.slug);
        const playerId = String(message.payload.playerId);
        const username = String(message.payload.username);
        client.slug = slug;
        client.playerId = playerId;
        addPlayerConnection(slug, playerId);
        const game = store.joinGame(slug, { id: playerId, username });
        broadcast(slug, "game_updated", game);
      }

      if (message.type === "placement_moved" && client.slug && client.playerId) {
        const x = Number(message.payload.x);
        const y = Number(message.payload.y);

        try {
          const game = store.upsertVote(client.slug, client.playerId, { x, y });
          broadcast(client.slug, "placement_moved", {
            playerId: client.playerId,
            x,
            y,
            username: game.players.find((player) => player.id === client.playerId)?.username ?? "Player"
          });
        } catch (error) {
          send(client.socket, "placement_rejected", {
            reason: error instanceof Error ? error.message : "Placement rejected"
          });
        }
      }
    });

    socket.on("close", () => {
      clients.delete(client);

      if (client.slug && client.playerId) {
        const activeConnections = removePlayerConnection(client.slug, client.playerId);
        const game = activeConnections === 0 ? store.leaveGame(client.slug, client.playerId) : store.getGameBySlug(client.slug);
        broadcast(client.slug, "game_updated", game);
      }
    });
  });

  return {
    broadcast
  };
};
