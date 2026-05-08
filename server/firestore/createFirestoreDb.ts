import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type ServiceAccount = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const readServiceAccount = (): ServiceAccount | null => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (serviceAccountJson) {
    const parsed = JSON.parse(serviceAccountJson) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };

    return {
      projectId: parsed.projectId ?? parsed.project_id ?? "",
      clientEmail: parsed.clientEmail ?? parsed.client_email ?? "",
      privateKey: parsed.privateKey ?? parsed.private_key ?? ""
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey
  };
};

export const createFirestoreDb = (): Firestore | null => {
  const serviceAccount = readServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId
    });

  const db = getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return db;
};
