import type { Firestore } from "firebase-admin/firestore";
import type { Game, RoomSummary } from "../../shared/domain/types";

export const createFirestoreGameRepository = (db: Firestore) => {
  const games = db.collection("games");
  const roomSlugs = db.collection("roomSlugs");

  const saveGame = async (game: Game): Promise<Game> => {
    const batch = db.batch();

    batch.set(games.doc(game.id), game);
    batch.set(roomSlugs.doc(game.roomSlug), {
      gameId: game.id,
      status: game.status,
      chartName: game.chartSnapshot.name,
      playerCount: game.players.length,
      updatedAt: new Date().toISOString()
    });

    await batch.commit();
    return game;
  };

  const readGame = async (gameId: string): Promise<Game | undefined> => {
    const snapshot = await games.doc(gameId).get();
    return snapshot.exists ? (snapshot.data() as Game) : undefined;
  };

  const readGameBySlug = async (slug: string): Promise<Game | undefined> => {
    const slugSnapshot = await roomSlugs.doc(slug).get();

    if (!slugSnapshot.exists) {
      return undefined;
    }

    const { gameId } = slugSnapshot.data() as { gameId: string };
    return readGame(gameId);
  };

  const listRooms = async (): Promise<RoomSummary[]> => {
    const snapshots = await roomSlugs.orderBy("updatedAt", "desc").get();

    return snapshots.docs.map((snapshot) => {
      const data = snapshot.data() as Omit<RoomSummary, "slug">;

      return {
        slug: snapshot.id,
        ...data
      };
    });
  };

  return {
    saveGame,
    readGame,
    readGameBySlug,
    listRooms
  };
};
