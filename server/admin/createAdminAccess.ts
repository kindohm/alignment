import type { Firestore } from "firebase-admin/firestore";
import { normalizeAdminEmail } from "./normalizeAdminEmail";

export type AdminAccess = {
  isAdminEmail: (email: string) => Promise<boolean>;
};

export const createAdminAccess = (db: Firestore | null): AdminAccess => {
  const envEmails = new Set(
    [process.env.LOCAL_ADMIN_EMAIL, process.env.LOCAL_ADMIN_EMAILS]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map(normalizeAdminEmail)
      .filter(Boolean)
  );

  const isAdminEmail = async (email: string): Promise<boolean> => {
    const normalizedEmail = normalizeAdminEmail(email);

    if (envEmails.has(normalizedEmail)) {
      return true;
    }

    if (!db) {
      return false;
    }

    const directSnapshot = await db.collection("administrators").doc(normalizedEmail).get();

    if (directSnapshot.exists) {
      return true;
    }

    const querySnapshot = await db.collection("administrators").where("email", "==", normalizedEmail).limit(1).get();
    return !querySnapshot.empty;
  };

  return {
    isAdminEmail
  };
};
