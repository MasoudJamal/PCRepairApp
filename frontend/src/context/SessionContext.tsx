"use client";

import { createContext, useContext, useEffect, useState } from "react";

/* =========================
   TYPES
========================= */

type Session = {
  id: string;        // The UUID from Supabase
  username: string;  // The login username
  full_name: string;
  role: "admin" | "manager" | "employee";
  language: "EN" | "FR";
  showroom: {
    id: string;
    name: string;
    address?: string | null;
    logo_url?: string | null;
    currency_code?: string | null;
  } | null;
};

type SessionContextType = {
  session: Session | null;
  setSession: (session: Session | null) => void;

  loadingSession: boolean;

  activeShowroomId: string | null;
  setActiveShowroomId: (id: string | null) => void;
};

/* =========================
   CONTEXT
========================= */

const SessionContext = createContext<SessionContextType | null>(null);

/* =========================
   PROVIDER
========================= */

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [activeShowroomId, setActiveShowroomIdState] =
    useState<string | null>(null);

  /* =========================
     RESTORE SESSION ON RELOAD
  ========================= */

  useEffect(() => {
    const restoreSession = () => {
      try {
        const storedSession = localStorage.getItem("loggedUser");
        const storedShowroom = localStorage.getItem("activeShowroomId");

        if (storedSession) {
          const parsed: Session = JSON.parse(storedSession);
          setSessionState(parsed);

          // Manager → always locked to his showroom
          if (parsed.role === "manager" && parsed.showroom?.id) {
            setActiveShowroomIdState(parsed.showroom.id);
          }
          // Admin → restore last selected showroom
          else if (storedShowroom) {
            setActiveShowroomIdState(storedShowroom);
          }
        }
      } catch (err) {
        console.error("Failed to restore session", err);
      } finally {
        // 🔐 Only NOW we say "loading finished"
        setLoadingSession(false);
      }
    };

    restoreSession();
  }, []);

  /* =========================
     SET SESSION (LOGIN / LOGOUT)
  ========================= */

  const setSession = (newSession: Session | null) => {
    if (newSession) {
      localStorage.setItem("loggedUser", JSON.stringify(newSession));

      if (newSession.role === "manager" && newSession.showroom?.id) {
        localStorage.setItem("activeShowroomId", newSession.showroom.id);
        setActiveShowroomIdState(newSession.showroom.id);
      }
    } else {
      localStorage.removeItem("loggedUser");
      localStorage.removeItem("activeShowroomId");
      setActiveShowroomIdState(null);
    }

    setSessionState(newSession);
  };

  /* =========================
     SET ACTIVE SHOWROOM (ADMIN)
  ========================= */

  const setActiveShowroomId = (id: string | null) => {
    if (id) {
      localStorage.setItem("activeShowroomId", id);
    } else {
      localStorage.removeItem("activeShowroomId");
    }

    setActiveShowroomIdState(id);
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        setSession,
        loadingSession,
        activeShowroomId,
        setActiveShowroomId,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/* =========================
   ACCESS SESSION
========================= */

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used inside SessionProvider");
  }
  return ctx;
}