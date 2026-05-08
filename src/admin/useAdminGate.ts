import { useCallback, useEffect, useState } from "react";
import { requestJson } from "../api/requestJson";

type AdminSession = {
  localMode: boolean;
  isAdmin: boolean;
  email?: string;
};

type AdminGate = AdminSession & {
  ready: boolean;
  signIn: () => void;
  signOut: () => Promise<void>;
};

export const useAdminGate = (): AdminGate => {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AdminSession>({
    localMode: false,
    isAdmin: false
  });

  useEffect(() => {
    requestJson<AdminSession>("/api/admin/session")
      .then(setSession)
      .finally(() => setReady(true));
  }, []);

  const signIn = useCallback(() => {
    window.location.href = "/api/admin/login/google";
  }, []);

  const signOut = useCallback(async () => {
    await requestJson<void>("/api/admin/logout", {
      method: "POST"
    });
    setSession({
      localMode: false,
      isAdmin: false
    });
  }, []);

  return {
    ...session,
    ready,
    signIn,
    signOut
  };
};
