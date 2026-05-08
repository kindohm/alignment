import type { Chart, ChartImage, Coordinate, Game, Player, RoomSummary } from "../../shared/domain/types";

export type CreateChartInput = {
  name: string;
  xAxisMinLabel: string;
  xAxisMaxLabel: string;
  yAxisMinLabel: string;
  yAxisMaxLabel: string;
  images: Array<Pick<ChartImage, "url" | "storageKey" | "filename" | "contentType" | "width" | "height">>;
};

export type GameStore = {
  listCharts: () => Promise<Chart[]>;
  createChart: (input: CreateChartInput) => Promise<Chart>;
  createGame: (chartId: string) => Promise<Game>;
  getGameBySlug: (slug: string) => Promise<Game | undefined>;
  listRooms: () => Promise<RoomSummary[]>;
  joinGame: (slug: string, player: Pick<Player, "id" | "username">) => Promise<Game>;
  renamePlayer: (slug: string, playerId: string, username: string) => Promise<Game>;
  leaveGame: (slug: string, playerId: string) => Promise<Game | undefined>;
  startNextRound: (slug: string) => Promise<Game>;
  upsertVote: (slug: string, playerId: string, coordinate: Coordinate) => Promise<Game>;
  endRound: (slug: string) => Promise<Game>;
};
