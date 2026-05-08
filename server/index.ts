import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { createAdminAccess } from "./admin/createAdminAccess";
import { clearAdminSession, readAdminSession, setAdminSession } from "./admin/adminSession";
import { createGoogleLoginUrl, hasGoogleOAuthConfig, readVerifiedGoogleEmail } from "./admin/googleOAuth";
import { loadServerEnv } from "./env/loadServerEnv";
import { createFirestoreDb } from "./firestore/createFirestoreDb";
import { createGameStore } from "./gameStore/createGameStore";
import { createPersistentGameStore } from "./gameStore/createPersistentGameStore";
import { renderFinalChartSvg } from "./render/renderFinalChartSvg";
import { createObjectStorage } from "./storage/createObjectStorage";
import { createRoomSocketServer } from "./ws/createRoomSocketServer";

loadServerEnv();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = Number(process.env.PORT ?? 3000);
const firestoreDb = createFirestoreDb();
const store = firestoreDb ? createPersistentGameStore(firestoreDb) : createGameStore();
const adminAccess = createAdminAccess(firestoreDb);
const objectStorage = createObjectStorage();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,
    files: 1
  }
});

app.use(express.json({ limit: "25mb" }));
app.use("/seed", express.static(path.join(__dirname, "../src/assets/seed")));

const isAdminRequest = async (request: express.Request): Promise<boolean> => {
  const firebaseConfigured = Boolean(firestoreDb);
  const localAdminEmail = process.env.LOCAL_ADMIN_EMAIL ?? "local-admin@example.com";
  const session = readAdminSession(request);

  if (session && (await adminAccess.isAdminEmail(session.email))) {
    return true;
  }

  return !firebaseConfigured && (await adminAccess.isAdminEmail(localAdminEmail));
};

app.get("/api/admin/session", async (request, response) => {
  const firebaseConfigured = Boolean(firestoreDb);
  const localAdminEmail = process.env.LOCAL_ADMIN_EMAIL ?? "local-admin@example.com";
  const session = readAdminSession(request);
  const isSessionAdmin = session ? await adminAccess.isAdminEmail(session.email) : false;
  const isLocalAdmin = !firebaseConfigured && (await adminAccess.isAdminEmail(localAdminEmail));

  response.json({
    localMode: !firebaseConfigured,
    isAdmin: isSessionAdmin || isLocalAdmin,
    email: session?.email ?? (firebaseConfigured ? undefined : localAdminEmail)
  });
});

app.get("/api/admin/login/google", (_request, response) => {
  if (!hasGoogleOAuthConfig()) {
    response.status(500).json({
      error: "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI"
    });
    return;
  }

  response.redirect(createGoogleLoginUrl(crypto.randomUUID()));
});

app.get("/api/admin/login/google/callback", async (request, response) => {
  const code = typeof request.query.code === "string" ? request.query.code : "";

  if (!code) {
    response.status(400).send("Missing Google authorization code");
    return;
  }

  try {
    const email = await readVerifiedGoogleEmail(code);

    if (!(await adminAccess.isAdminEmail(email))) {
      response.status(403).send("Google account is not an administrator");
      return;
    }

    setAdminSession(response, email);
    response.redirect("/admin");
  } catch (error) {
    response.status(401).send(error instanceof Error ? error.message : "Google login failed");
  }
});

app.post("/api/admin/logout", (_request, response) => {
  clearAdminSession(response);
  response.status(204).send();
});

app.post("/api/uploads/images", upload.single("image"), async (request, response) => {
  if (!(await isAdminRequest(request))) {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  if (!request.file) {
    response.status(400).json({ error: "Missing image file" });
    return;
  }

  if (!objectStorage.configured) {
    response.status(500).json({ error: "S3 storage is not configured" });
    return;
  }

  try {
    const uploaded = await objectStorage.uploadImage(request.file);

    response.status(201).json({
      ...uploaded,
      filename: request.file.originalname,
      contentType: request.file.mimetype,
      size: request.file.size
    });
  } catch (error) {
    response.status(502).json({
      error: error instanceof Error ? error.message : "Image upload failed"
    });
  }
});

app.get("/api/charts", async (_request, response) => {
  response.json(await store.listCharts());
});

app.post("/api/charts", async (request, response) => {
  if (!(await isAdminRequest(request))) {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  response.status(201).json(await store.createChart(request.body));
});

app.get("/api/rooms", async (_request, response) => {
  response.json(await store.listRooms());
});

app.post("/api/games", async (request, response) => {
  if (!(await isAdminRequest(request))) {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  response.status(201).json(await store.createGame(String(request.body.chartId)));
});

app.get("/api/rooms/:slug", async (request, response) => {
  const game = await store.getGameBySlug(request.params.slug);

  if (!game) {
    response.status(404).json({ error: "Room not found" });
    return;
  }

  response.json(game);
});

app.post("/api/rooms/:slug/join", async (request, response) => {
  response.json(
    await store.joinGame(request.params.slug, {
      id: String(request.body.playerId),
      username: String(request.body.username)
    })
  );
});

app.post("/api/rooms/:slug/rename", async (request, response) => {
  response.json(await store.renamePlayer(request.params.slug, String(request.body.playerId), String(request.body.username)));
});

app.post("/api/rooms/:slug/start-round", async (request, response) => {
  if (!(await isAdminRequest(request))) {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  const game = await store.startNextRound(request.params.slug);
  response.json(game);
  roomSocket.broadcast(request.params.slug, "game_updated", game);
});

app.post("/api/rooms/:slug/end-round", async (request, response) => {
  if (!(await isAdminRequest(request))) {
    response.status(403).json({ error: "Administrator access required" });
    return;
  }

  const game = await store.endRound(request.params.slug);
  response.json(game);
  roomSocket.broadcast(request.params.slug, "game_updated", game);
});

app.get("/api/rooms/:slug/final.svg", async (request, response) => {
  const game = await store.getGameBySlug(request.params.slug);

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
