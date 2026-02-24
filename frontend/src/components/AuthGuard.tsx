"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loadingSession } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loadingSession && !session) {
      router.replace("/auth/login");
    }
  }, [loadingSession, session, router]);

  if (loadingSession) return null;
  if (!session) return null;

  return <>{children}</>;
