"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  email?: string | null;
  role: string | null;
  showroom_id: string | null;
  active: boolean;
  language: string | null;
  created_at: string | null;
};

const LABELS = {
  en: {
    title: "User Management",
    username: "Username",
    fullName: "Full Name",
    role: "Role",
    showroom: "Showroom",
    status: "Status",
    createdAt: "Created",
    active: "Active",
    inactive: "Inactive",
    loading: "Loading users...",
    noAccess: "Access denied",
  },
  fr: {
    title: "Gestion des utilisateurs",
    username: "Nom d’utilisateur",
    fullName: "Nom complet",
    role: "Rôle",
    showroom: "Showroom",
    status: "Statut",
    createdAt: "Créé le",
    active: "Actif",
    inactive: "Inactif",
    loading: "Chargement des utilisateurs...",
    noAccess: "Accès refusé",
  },
};

export default function UsersManagementPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const { session } = useSession();

  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<"en" | "fr">("en");

useEffect(() => {
  if (!session) return; // wait for hydration

  if (!session.user) {
    router.replace("/auth/login");
    return;
  }

  fetchCurrentUserAndUsers();
}, [session]);
 
  async function fetchCurrentUserAndUsers() {
    setLoading(true);

    // Who am I
    const { data: me } = await supabase.rpc("whoami");
    const currentUser = me?.[0];

    if (!currentUser || currentUser.role !== "admin") {
      alert(LABELS[lang].noAccess);
      router.push("/");
      return;
    }

    // Language
    if (currentUser.language === "fr") {
      setLang("fr");
    }

    // Fetch users
    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        username,
        full_name,
        role,
        showroom_id,
        active,
        language,
        created_at
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading users:", error);
    } else {
      setUsers(data as Profile[]);
    }

    setLoading(false);
  }

  const t = LABELS[lang];

  if (loading) {
    return (
      <div className="p-6 text-gray-600">
        {t.loading}
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        {t.title}
      </h1>

      <div className="overflow-x-auto rounded border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">{t.username}</th>
              <th className="px-3 py-2 text-left">{t.fullName}</th>
              <th className="px-3 py-2 text-left">{t.role}</th>
              <th className="px-3 py-2 text-left">{t.showroom}</th>
              <th className="px-3 py-2 text-left">{t.status}</th>
              <th className="px-3 py-2 text-left">{t.createdAt}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="px-3 py-2">{u.username ?? "-"}</td>
                <td className="px-3 py-2">{u.full_name ?? "-"}</td>
                <td className="px-3 py-2 capitalize">{u.role}</td>
                <td className="px-3 py-2">
                  {u.showroom_id ? u.showroom_id.slice(0, 8) + "…" : "-"}
                </td>
                <td className="px-3 py-2">
                  {u.active ? (
                    <span className="text-green-600">{t.active}</span>
                  ) : (
                    <span className="text-red-600">{t.inactive}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {u.created_at
                    ? new Date(u.created_at).toLocaleDateString(lang)
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}