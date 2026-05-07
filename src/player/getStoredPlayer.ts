const playerIdKey = "alignment.playerId";
const usernameKey = "alignment.username";

export type StoredPlayer = {
  id: string;
  username: string;
};

export const getStoredPlayer = (): StoredPlayer => {
  const existingId = localStorage.getItem(playerIdKey);
  const id = existingId ?? crypto.randomUUID();

  if (!existingId) {
    localStorage.setItem(playerIdKey, id);
  }

  return {
    id,
    username: localStorage.getItem(usernameKey) ?? ""
  };
};

export const saveStoredUsername = (username: string): void => {
  localStorage.setItem(usernameKey, username);
};
