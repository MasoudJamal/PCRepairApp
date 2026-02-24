"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { User, Building2, Plus, ArrowLeft, Search, Filter } from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { I18N } from "@/lib/i18n";

type UserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  role: string;
  showroom_name: string;
  active: boolean;
};

const ROLE_LABELS: Record<string, { en: string; fr: string }> = {
  admin: { en: "Admin", fr: "Administrateur" },
  manager: { en: "Manager", fr: "Responsable" },
  employee: { en: "Employee", fr: "Employé" },
  driver: { en: "Driver", fr: "Chauffeur" },
  user: { en: "User", fr: "Utilisateur" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#7c3aed",
  manager: "#2563eb",
  employee: "#16a34a",
  driver: "#f59e0b",
  user: "#64748b",
};

const pageBg: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(1200px 600px at 20% 0%, rgba(37,99,235,0.22), transparent 55%)," +
    "linear-gradient(135deg, #0b1224, #020617)",
  padding: 28,
  color: "#e5e7eb",
};

const card: React.CSSProperties = {
  background: "rgba(2,6,23,0.72)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 16,
  boxShadow: "0 14px 40px rgba(0,0,0,.35)",
  backdropFilter: "blur(10px)",
};

const buttonPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  borderRadius: 10,
  background: "linear-gradient(180deg, #2563eb, #1d4ed8)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.10)",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

const buttonGhost: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 10,
  background: "transparent",
  color: "rgba(147,197,253,0.95)",
  border: "1px solid rgba(51,65,85,0.9)",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 14,
};

export default function UsersPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const supabase = createSupabaseClient();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // UI state (client-side controls)
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | string>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/login");
      return;
    }
    if (session && !["admin", "manager"].includes(session.role)) {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  const loadUsers = async () => {
    if (!session) return;

    let query = supabase.from("profiles").select(`
      id,
      username,
      full_name,
      role,
      active,
      showroom:showrooms(name)
    `);

    if (session.role === "manager") {
      query = query.eq("showroom_id", session.showroom.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Failed to load users", error);
      return;
    }

    const mapped: UserRow[] = (data ?? []).map((u: any) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      role: u.role,
      active: u.active,
      showroom_name: u.showroom?.name ?? "-",
    }));

    mapped.sort((a, b) => {
      if (a.showroom_name !== b.showroom_name) return a.showroom_name.localeCompare(b.showroom_name);
      return (a.username ?? "").localeCompare(b.username ?? "");
    });

    setUsers(mapped);
    setLoadingUsers(false);
  };

  useEffect(() => {
    if (session) loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const toggleActive = async (user: UserRow) => {
    const previousUsers = [...users];
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, active: !u.active } : u)));

    const res = await fetch("/api/users/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, active: !user.active }),
    });

    if (!res.ok) {
      setUsers(previousUsers);
      const err = await res.json();
      alert(err.error || "Failed to update user status");
    }
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQ =
        !term ||
        (u.username ?? "").toLowerCase().includes(term) ||
        (u.full_name ?? "").toLowerCase().includes(term) ||
        (u.showroom_name ?? "").toLowerCase().includes(term);

      const matchesRole = !roleFilter || u.role === roleFilter;
      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" ? u.active : !u.active);

      return matchesQ && matchesRole && matchesStatus;
    });
  }, [users, q, roleFilter, statusFilter]);

  if (loading || !session || loadingUsers) {
    return <p style={{ padding: 40, color: "#cbd5e1", fontSize: 16 }}>{t.common.loading}</p>;
  }

  return (
    <div style={pageBg}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <button onClick={() => router.push("/dashboard")} style={buttonGhost}>
              <ArrowLeft size={16} />
              {t.users.back}
            </button>

            <h1 style={{ fontSize: 26, fontWeight: 800, margin: "14px 0 0 0" }}>{t.users.title}</h1>
            <p style={{ margin: "6px 0 0 0", color: "rgba(226,232,240,0.70)", fontSize: 14 }}>
              {filtered.length} / {users.length}
            </p>
          </div>

          <button onClick={() => router.push("/users/create")} style={buttonPrimary}>
            <Plus size={18} />
            {t.createUser.create}
          </button>
        </div>

        {/* Controls */}
        <div style={{ ...card, marginTop: 16, padding: 14 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.8fr 0.8fr",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={16} style={{ opacity: 0.8 }} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`${t.common.search ?? "Search"}...`}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(51,65,85,0.9)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Filter size={16} style={{ opacity: 0.8 }} />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(51,65,85,0.9)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              >
                <option value="">{t.users.role}</option>
                {Object.keys(ROLE_LABELS).map((r) => (
                  <option key={r} value={r} style={{ color: "#0b1224" }}>
                    {ROLE_LABELS[r]?.[lang] ?? r}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Filter size={16} style={{ opacity: 0.8 }} />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  width: "100%",
                  background: "transparent",
                  border: "1px solid rgba(51,65,85,0.9)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#e5e7eb",
                  outline: "none",
                }}
              >
                <option value="">{t.users.status}</option>
                <option value="active" style={{ color: "#0b1224" }}>{t.common.active}</option>
                <option value="inactive" style={{ color: "#0b1224" }}>{t.common.inactive}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ ...card, marginTop: 16, overflow: "hidden" }}>
          <div style={{ overflow: "auto", maxHeight: "70vh" }}>
            <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
              <thead>
                <tr>
                  {[
                    t.users.user,
                    t.users.name,
                    t.users.role,
                    t.users.showroom,
                    t.users.status,
                    t.common.actions,
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        position: "sticky",
                        top: 0,
                        zIndex: 2,
                        textAlign: "left",
                        fontSize: 12,
                        letterSpacing: 0.6,
                        textTransform: "uppercase",
                        padding: "12px 16px",
                        background: "rgba(2,6,23,0.95)",
                        borderBottom: "1px solid rgba(51,65,85,0.9)",
                        color: "rgba(226,232,240,0.70)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      background: idx % 2 === 0 ? "rgba(15,23,42,0.35)" : "transparent",
                      opacity: u.active ? 1 : 0.55,
                      transition: "background 120ms ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget.style.background = "rgba(37,99,235,0.08)"))}
                    onMouseLeave={(e) =>
                      ((e.currentTarget.style.background = idx % 2 === 0 ? "rgba(15,23,42,0.35)" : "transparent"))
                    }
                  >
                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      {u.username ?? "-"}
                    </td>

                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <User size={16} style={{ opacity: 0.9 }} />
                        {u.full_name ?? "-"}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      <span
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12,
                          background: ROLE_COLORS[u.role] ?? "#334155",
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {ROLE_LABELS[u.role]?.[lang] ?? u.role}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <Building2 size={14} style={{ opacity: 0.9 }} />
                        {u.showroom_name}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      {u.id === session.user_id ? (
                        <span style={{ color: "rgba(148,163,184,0.9)", fontWeight: 700 }}>
                          {u.active ? t.common.active : t.common.inactive}
                        </span>
                      ) : (
                        <button
                          onClick={() => toggleActive(u)}
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(51,65,85,0.9)",
                            padding: "6px 10px",
                            borderRadius: 10,
                            cursor: "pointer",
                            fontWeight: 800,
                            fontSize: 13,
                            color: u.active ? "#22c55e" : "#ef4444",
                          }}
                        >
                          {u.active ? t.common.active : t.common.inactive}
                        </button>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
                      <button
                        onClick={() => router.push(`/users/${u.id}/edit`)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(51,65,85,0.9)",
                          padding: "6px 10px",
                          borderRadius: 10,
                          cursor: "pointer",
                          color: "rgba(147,197,253,0.95)",
                          fontWeight: 800,
                          fontSize: 13,
                        }}
                      >
                        {t.users.edit}
                      </button>
                    </td>
                  </tr>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, color: "rgba(226,232,240,0.70)" }}>
                      {t.common.noResults ?? "No results."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Small responsive tweak */}
        <style jsx>{`
          @media (max-width: 900px) {
            div[style*="grid-template-columns: 1.4fr 0.8fr 0.8fr"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}