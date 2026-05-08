import type { Firestore } from "firebase-admin/firestore";
import { calculatePlacement } from "../../shared/domain/calculatePlacement";
import { clampCoordinate } from "../../shared/domain/clampCoordinate";
import { getAxisLabels } from "../../shared/domain/axisLabels";
import { generateRoomSlug } from "../../shared/domain/generateRoomSlug";
import { shuffle } from "../../shared/domain/shuffle";
import type { Chart, ChartImage, Coordinate, Game, Player, Vote } from "../../shared/domain/types";
import { createFirestoreChartRepository } from "../firestore/createFirestoreChartRepository";
import { createFirestoreGameRepository } from "../firestore/createFirestoreGameRepository";
import { createObjectStorage } from "../storage/createObjectStorage";
import type { CreateChartInput, GameStore } from "./GameStore";
import { createId } from "./createId";
import { now } from "./now";

export const createPersistentGameStore = (db: Firestore): GameStore => {
  const chartRepository = createFirestoreChartRepository(db);
  const gameRepository = createFirestoreGameRepository(db);
  const objectStorage = createObjectStorage();

  const listCharts = async () => chartRepository.listCharts();

  const createChart = async (input: CreateChartInput): Promise<Chart> => {
    const timestamp = now();
    const chart: Chart = {
      id: createId("chart"),
      name: input.name,
      xAxisMinLabel: input.xAxisMinLabel,
      xAxisMaxLabel: input.xAxisMaxLabel,
      yAxisMinLabel: input.yAxisMinLabel,
      yAxisMaxLabel: input.yAxisMaxLabel,
      status: "published",
      createdBy: "local-admin",
      createdAt: timestamp,
      updatedAt: timestamp,
      images: input.images.map((image, order): ChartImage => ({
        id: createId("img"),
        storageKey: image.storageKey,
        url: image.url,
        filename: image.filename,
        contentType: image.contentType,
        width: image.width,
        height: image.height,
        order,
        createdAt: timestamp
      }))
    };

    return chartRepository.saveChart(chart);
  };

  const deleteChart = async (chartId: string): Promise<void> => {
    const chart = await chartRepository.readChart(chartId);
    const images = chart?.images ?? [];

    if (objectStorage.configured) {
      await Promise.all(images.map((image) => objectStorage.deleteObject(image.storageKey)));
    }

    await gameRepository.deleteGamesBySourceChartId(chartId);
    await chartRepository.deleteChart(chartId);
  };

  const createGame = async (chartId: string): Promise<Game> => {
    const chart = await chartRepository.readChart(chartId);

    if (!chart) {
      throw new Error("Chart not found");
    }

    const rooms = await gameRepository.listRooms();
    const roomSlug = generateRoomSlug(new Set(rooms.map((room) => room.slug)));
    const images = chart.images.map((image) => ({ ...image }));
    const axisLabels = getAxisLabels(chart);
    const game: Game = {
      id: createId("game"),
      roomSlug,
      sourceChartId: chart.id,
      status: "lobby",
      chartSnapshot: {
        name: chart.name,
        ...axisLabels,
        images
      },
      imageOrder: shuffle(images.map((image) => image.id)),
      currentRoundIndex: -1,
      players: [],
      rounds: [],
      results: [],
      createdBy: "local-admin",
      createdAt: now()
    };

    return gameRepository.saveGame(game);
  };

  const getGameBySlug = async (slug: string) => gameRepository.readGameBySlug(slug);

  const listRooms = async () => gameRepository.listRooms();

  const loadGame = async (slug: string): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      throw new Error("Room not found");
    }

    return game;
  };

  const joinGame = async (slug: string, player: Pick<Player, "id" | "username">): Promise<Game> => {
    const game = await loadGame(slug);
    const existing = game.players.find((item) => item.id === player.id);
    const timestamp = now();

    if (existing) {
      existing.lastSeenAt = timestamp;
      if (game.status !== "round_active") {
        existing.username = player.username;
      }
    } else {
      game.players.push({
        id: player.id,
        username: player.username,
        joinedAt: timestamp,
        lastSeenAt: timestamp
      });
    }

    return gameRepository.saveGame(game);
  };

  const renamePlayer = async (slug: string, playerId: string, username: string): Promise<Game> => {
    const game = await loadGame(slug);

    if (game.status === "round_active") {
      throw new Error("Cannot rename during active round");
    }

    const player = game.players.find((item) => item.id === playerId);

    if (player) {
      player.username = username;
      player.lastSeenAt = now();
    }

    return gameRepository.saveGame(game);
  };

  const leaveGame = async (slug: string, playerId: string): Promise<Game | undefined> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      return undefined;
    }

    game.players = game.players.filter((player) => player.id !== playerId);
    return gameRepository.saveGame(game);
  };

  const startNextRound = async (slug: string): Promise<Game> => {
    const game = await loadGame(slug);

    if (game.status === "round_active") {
      throw new Error("Round already active");
    }

    const nextIndex = game.currentRoundIndex + 1;
    const imageId = game.imageOrder[nextIndex];

    if (!imageId) {
      game.status = "complete";
      game.completedAt = now();
      return gameRepository.saveGame(game);
    }

    const round = {
      id: createId("round"),
      imageId,
      roundIndex: nextIndex,
      status: "active" as const,
      startedAt: now(),
      votes: []
    };

    game.currentRoundIndex = nextIndex;
    game.currentRoundId = round.id;
    game.currentImageId = imageId;
    game.status = "round_active";
    game.rounds.push(round);
    return gameRepository.saveGame(game);
  };

  const upsertVote = async (slug: string, playerId: string, coordinate: Coordinate): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game || game.status !== "round_active" || !game.currentRoundId) {
      throw new Error("No active round");
    }

    const round = game.rounds.find((item) => item.id === game.currentRoundId);
    const player = game.players.find((item) => item.id === playerId);

    if (!round || !player) {
      throw new Error("Round or player not found");
    }

    const nextVote: Vote = {
      playerId,
      username: player.username,
      ...clampCoordinate(coordinate),
      updatedAt: now()
    };
    const existingIndex = round.votes.findIndex((vote) => vote.playerId === playerId);

    if (existingIndex >= 0) {
      round.votes[existingIndex] = nextVote;
    } else {
      round.votes.push(nextVote);
    }

    return gameRepository.saveGame(game);
  };

  const endRound = async (slug: string): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game || game.status !== "round_active" || !game.currentRoundId || !game.currentImageId) {
      throw new Error("No active round");
    }

    const round = game.rounds.find((item) => item.id === game.currentRoundId);

    if (!round) {
      throw new Error("Round not found");
    }

    const result = calculatePlacement(round.votes) ?? { x: 0.5, y: 0.5 };
    const timestamp = now();

    round.status = "complete";
    round.endedAt = timestamp;
    round.result = result;
    game.results.push({
      imageId: game.currentImageId,
      roundId: round.id,
      ...result,
      completedAt: timestamp
    });
    game.status = game.currentRoundIndex >= game.imageOrder.length - 1 ? "complete" : "round_complete";

    if (game.status === "complete") {
      game.completedAt = timestamp;
      game.finalChartImageUrl = `/api/rooms/${game.roomSlug}/final.svg`;
      game.finalChartStorageKey = `generated/${game.roomSlug}/final.svg`;
    }

    return gameRepository.saveGame(game);
  };

  return {
    listCharts,
    createChart,
    deleteChart,
    createGame,
    getGameBySlug,
    listRooms,
    joinGame,
    renamePlayer,
    leaveGame,
    startNextRound,
    upsertVote,
    endRound
  };
};
