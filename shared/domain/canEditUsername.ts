import type { GameStatus } from "./types";

export const canEditUsername = (status: GameStatus): boolean => status !== "round_active";
