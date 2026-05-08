export type Coordinate = {
  x: number;
  y: number;
};

export type ChartStatus = "draft" | "published" | "archived";

export type ChartImage = {
  id: string;
  storageKey: string;
  url: string;
  filename: string;
  contentType: string;
  width?: number;
  height?: number;
  order: number;
  createdAt: string;
};

export type Chart = {
  id: string;
  name: string;
  xAxisMinLabel: string;
  xAxisMaxLabel: string;
  yAxisMinLabel: string;
  yAxisMaxLabel: string;
  status: ChartStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  images: ChartImage[];
};

export type GameStatus = "lobby" | "round_active" | "round_complete" | "complete";

export type ChartSnapshot = {
  name: string;
  xAxisMinLabel: string;
  xAxisMaxLabel: string;
  yAxisMinLabel: string;
  yAxisMaxLabel: string;
  images: ChartImage[];
};

export type Player = {
  id: string;
  username: string;
  joinedAt: string;
  lastSeenAt: string;
};

export type Vote = Coordinate & {
  playerId: string;
  username: string;
  updatedAt: string;
};

export type Round = {
  id: string;
  imageId: string;
  roundIndex: number;
  status: "active" | "complete";
  startedAt: string;
  endedAt?: string;
  result?: Coordinate;
  votes: Vote[];
};

export type GameResult = Coordinate & {
  imageId: string;
  roundId: string;
  completedAt: string;
};

export type WhimsyPlayerDistanceStat = {
  playerId: string;
  username: string;
  voteCount: number;
  comparisonCount: number;
  averageDistance: number;
};

export type WhimsyExtremeVoteStat = Coordinate & {
  playerId: string;
  username: string;
  voteCount: number;
  roundId: string;
  imageId: string;
  distanceFromCenter: number;
};

export type GameWhimsyStats = {
  mostDifferent?: WhimsyPlayerDistanceStat;
  mostSimilar?: WhimsyPlayerDistanceStat;
  mostExtreme?: WhimsyExtremeVoteStat;
};

export type Game = {
  id: string;
  roomSlug: string;
  sourceChartId: string;
  status: GameStatus;
  chartSnapshot: ChartSnapshot;
  imageOrder: string[];
  currentRoundIndex: number;
  currentRoundId?: string;
  currentImageId?: string;
  players: Player[];
  rounds: Round[];
  results: GameResult[];
  whimsyStats?: GameWhimsyStats;
  finalChartImageUrl?: string;
  finalChartStorageKey?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
};

export type RoomSummary = {
  slug: string;
  gameId: string;
  chartName: string;
  status: GameStatus;
  playerCount: number;
};
