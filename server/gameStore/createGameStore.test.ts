import { describe, expect, it } from "vitest";
import { createGameStore } from "./createGameStore";

describe("createGameStore", () => {
  it("snapshots chart data when room starts", () => {
    const store = createGameStore();
    const chart = store.listCharts()[0];
    const game = store.createGame(chart.id);

    expect(game.sourceChartId).toBe(chart.id);
    expect(game.chartSnapshot.name).toBe(chart.name);
    expect(game.chartSnapshot.images).not.toBe(chart.images);
    expect(game.imageOrder.sort()).toEqual(chart.images.map((image) => image.id).sort());
  });

  it("blocks username changes during active rounds", () => {
    const store = createGameStore();
    const game = store.createGame(store.listCharts()[0].id);

    store.joinGame(game.roomSlug, { id: "p1", username: "Ada" });
    store.startNextRound(game.roomSlug);

    expect(() => store.renamePlayer(game.roomSlug, "p1", "Grace")).toThrow("Cannot rename during active round");
  });

  it("finalizes latest votes when round ends", () => {
    const store = createGameStore();
    const game = store.createGame(store.listCharts()[0].id);

    store.joinGame(game.roomSlug, { id: "p1", username: "Ada" });
    store.joinGame(game.roomSlug, { id: "p2", username: "Grace" });
    store.startNextRound(game.roomSlug);
    store.upsertVote(game.roomSlug, "p1", { x: 0.2, y: 0.8 });
    store.upsertVote(game.roomSlug, "p1", { x: 0.4, y: 0.6 });
    store.upsertVote(game.roomSlug, "p2", { x: 0.6, y: 0.4 });

    const ended = store.endRound(game.roomSlug);

    expect(ended.status).toBe("round_complete");
    expect(ended.results[0]).toMatchObject({ x: 0.5, y: 0.5 });
    expect(ended.rounds[0].votes).toHaveLength(2);
  });

  it("removes active players without deleting completed votes", () => {
    const store = createGameStore();
    const game = store.createGame(store.listCharts()[0].id);

    store.joinGame(game.roomSlug, { id: "p1", username: "Ada" });
    store.startNextRound(game.roomSlug);
    store.upsertVote(game.roomSlug, "p1", { x: 0.2, y: 0.8 });
    store.endRound(game.roomSlug);

    const left = store.leaveGame(game.roomSlug, "p1");

    expect(left?.players).toEqual([]);
    expect(left?.rounds[0].votes).toHaveLength(1);
  });
});
