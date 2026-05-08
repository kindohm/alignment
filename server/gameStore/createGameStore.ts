import { calculatePlacement } from "../../shared/domain/calculatePlacement";
import { clampCoordinate } from "../../shared/domain/clampCoordinate";
import { getAxisLabels } from "../../shared/domain/axisLabels";
import { generateRoomSlug } from "../../shared/domain/generateRoomSlug";
import { shuffle } from "../../shared/domain/shuffle";
import type { Chart, ChartImage, Coordinate, Game, Player, RoomSummary, Vote } from "../../shared/domain/types";
import type { CreateChartInput, GameStore } from "./GameStore";
import { createId } from "./createId";
import { createSeedCharts } from "./createSeedCharts";
import { now } from "./now";

export const createGameStore = (): GameStore => {
  const charts = new Map<string, Chart>();
  const games = new Map<string, Game>();
  const slugToGameId = new Map<string, string>();

  createSeedCharts().forEach((chart) => charts.set(chart.id, chart));

  const listCharts = async (): Promise<Chart[]> => [...charts.values()].sort((a, b) => a.name.localeCompare(b.name));

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
      images: input.images.map((image, order) => ({
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

    charts.set(chart.id, chart);
    return chart;
  };

  const deleteChart = async (chartId: string): Promise<void> => {
    charts.delete(chartId);

    [...games.values()]
      .filter((game) => game.sourceChartId === chartId)
      .forEach((game) => {
        games.delete(game.id);
        slugToGameId.delete(game.roomSlug);
      });
  };

  const getGameBySlug = async (slug: string): Promise<Game | undefined> => {
    const gameId = slugToGameId.get(slug);
    return gameId ? games.get(gameId) : undefined;
  };

  const listRooms = async (): Promise<RoomSummary[]> =>
    [...games.values()].map((game) => ({
      slug: game.roomSlug,
      gameId: game.id,
      chartName: game.chartSnapshot.name,
      status: game.status,
      playerCount: game.players.length
    }));

  const createGame = async (chartId: string): Promise<Game> => {
    const chart = charts.get(chartId);

    if (!chart) {
      throw new Error("Chart not found");
    }

    const roomSlug = generateRoomSlug(new Set(slugToGameId.keys()));
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

    games.set(game.id, game);
    slugToGameId.set(roomSlug, game.id);
    return game;
  };

  const joinGame = async (slug: string, player: Pick<Player, "id" | "username">): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      throw new Error("Room not found");
    }

    const existing = game.players.find((item) => item.id === player.id);
    const timestamp = now();

    if (existing) {
      existing.lastSeenAt = timestamp;
      if (game.status !== "round_active") {
        existing.username = player.username;
      }
      return game;
    }

    game.players.push({
      id: player.id,
      username: player.username,
      joinedAt: timestamp,
      lastSeenAt: timestamp
    });

    return game;
  };

  const renamePlayer = async (slug: string, playerId: string, username: string): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      throw new Error("Room not found");
    }

    if (game.status === "round_active") {
      throw new Error("Cannot rename during active round");
    }

    const player = game.players.find((item) => item.id === playerId);

    if (player) {
      player.username = username;
      player.lastSeenAt = now();
    }

    return game;
  };

  const leaveGame = async (slug: string, playerId: string): Promise<Game | undefined> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      return undefined;
    }

    game.players = game.players.filter((player) => player.id !== playerId);
    return game;
  };

  const startNextRound = async (slug: string): Promise<Game> => {
    const game = await getGameBySlug(slug);

    if (!game) {
      throw new Error("Room not found");
    }

    if (game.status === "round_active") {
      throw new Error("Round already active");
    }

    const nextIndex = game.currentRoundIndex + 1;
    const imageId = game.imageOrder[nextIndex];

    if (!imageId) {
      game.status = "complete";
      game.completedAt = now();
      return game;
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
    return game;
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

    return game;
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

    return game;
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
