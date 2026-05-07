import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createGameStore } from "./gameStore/createGameStore";
import { renderFinalChartSvg } from "./render/renderFinalChartSvg";
import { createRoomSocketServer } from "./ws/createRoomSocketServer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT ?? 3000);
const store = createGameStore();

app.use(express.json({ limit: "25mb" }));
app.use("/seed", express.static(path.join(__dirname, "../src/assets/seed")));

app.get("/api/admin/session", (_request, response) => {
  const firebaseConfigured = Boolean(process.env.FIREBASE_PROJECT_ID);

  response.json({
    localMode: !firebaseConfigured,
    isAdmin: !firebaseConfigured,
    email: firebaseConfigured ? undefined : "local-admin"
  });
});

app.get("/api/admin/login/google", (_request, response) => {
  response.status(501).json({
    error:
      "Google login will be handled server-side. Use Google Identity/OAuth callback, verify ID token with firebase-admin, then create an HTTP-only admin session."
  });
});

app.get("/api/charts", (_request, response) => {
  response.json(store.listCharts());
});

app.post("/api/charts", (request, response) => {
  response.status(201).json(store.createChart(request.body));
});

app.get("/api/rooms", (_request, response) => {
  response.json(store.listRooms());
});

app.post("/api/games", (request, response) => {
  response.status(201).json(store.createGame(String(request.body.chartId)));
});

app.get("/api/rooms/:slug", (request, response) => {
  const game = store.getGameBySlug(request.params.slug);

  if (!game) {
    response.status(404).json({ error: "Room not found" });
    return;
  }

  response.json(game);
});

app.post("/api/rooms/:slug/join", (request, response) => {
  response.json(
    store.joinGame(request.params.slug, {
      id: String(request.body.playerId),
      username: String(request.body.username)
    })
  );
});

app.post("/api/rooms/:slug/rename", (request, response) => {
  response.json(store.renamePlayer(request.params.slug, String(request.body.playerId), String(request.body.username)));
});

app.post("/api/rooms/:slug/start-round", (request, response) => {
  const game = store.startNextRound(request.params.slug);
  response.json(game);
  roomSocket.broadcast(request.params.slug, "game_updated", game);
});

app.post("/api/rooms/:slug/end-round", (request, response) => {
  const game = store.endRound(request.params.slug);
  response.json(game);
  roomSocket.broadcast(request.params.slug, "game_updated", game);
});

app.get("/api/rooms/:slug/final.svg", (request, response) => {
  const game = store.getGameBySlug(request.params.slug);

  if (!game) {
    response.status(404).send("Not found");
    return;
  }

  response.setHeader("Content-Type", "image/svg+xml");
  response.send(renderFinalChartSvg(game));
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));
  app.get("*", (_request, response) => {
    response.sendFile(path.join(__dirname, "../dist/index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: {
      middlewareMode: true
    },
    appType: "spa"
  });

  app.use(vite.middlewares);
}

const server = app.listen(port, () => {
  console.log(`alignment listening on http://localhost:${port}`);
});

const roomSocket = createRoomSocketServer(server, store);
