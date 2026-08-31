"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SessionContextType {
  adminSessionId: string;
  setAdminSessionId: (id: string) => void;
}

const SessionContext = createContext<SessionContextType>({
  adminSessionId: "",
  setAdminSessionId: () => {},
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const [adminSessionId, setAdminSessionIdState] = useState<string>("");

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((c) => c.startsWith("admin_session_id="));
    if (cookie) {
      setAdminSessionIdState(cookie.split("=")[1] || "");
    }
  }, []);

  const setAdminSessionId = (id: string) => {
    setAdminSessionIdState(id);
    document.cookie = `admin_session_id=${id}; path=/; max-age=60*60*24*30`;
  };

  return (
    <SessionContext.Provider value={{ adminSessionId, setAdminSessionId }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useAdminSession() {
  return useContext(SessionContext);
}
