"use client";

import { SessionProvider } from "@/context/SessionContext";
import TopNav from "@/components/TopNav";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <TopNav />
      <div style={{ paddingTop: 70 }}>
        {children}
      </div>
    </SessionProvider>
  );
}