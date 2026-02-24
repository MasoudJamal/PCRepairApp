
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";
import { I18N } from "@/lib/i18n";
import { 
  Save, 
  Trash2, 
  ArrowLeft, 
  User, 
  Shield, 
  Globe, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Building,
  Percent
} from "lucide-react";

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const { session, loading } = useSession();
  const supabase = createSupabaseClient();

  const lang = session && session.language === "FR" ? "fr" : "en";
  const t = I18N[lang];
  
  const [user, setUser] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState(true);
  const [language, setLanguage] = useState<"EN" | "FR">("EN");
  const [maxDiscount, setMaxDiscount] = useState<string | number>("");
  
  const [loadingUser, setLoadingUser] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showroomName, setShowroomName] = useState<string>("");
  const [loadingShowroom, setLoadingShowroom] = useState(false);

  /* 🔒 ACCESS GUARD */
  useEffect(() => {
    if (!loading && !session) {
      router.replace("/auth/login");
      return;
    }
    if (session && (session.role !== "admin" && session.role !== "manager")) {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  /* 📥 LOAD USER */
  useEffect(() => {
    if (!session || !id) return;
    
    const loadUser = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id,
            username,
            full_name,
            role,
            active,
            showroom_id,
            language,
            max_discount_percent
          `)
          .eq("id", id)
          .single();

        if (error || !data) {
          router.replace("/users");
          return;
        }

        if (session.role === "manager" && data.showroom_id !== session.showroom.id) {
          router.replace("/users");
          return;
        }

        setUser(data);
        setFullName(data.full_name ?? "");
        setActive(data.active);
        setRole(data.role);
        setLanguage(data.language ?? "EN");
        setMaxDiscount(data.max_discount_percent ?? 0);
        
        if (data.showroom_id) {
          await loadShowroomName(data.showroom_id);
        } else {
          setShowroomName("No Showroom Assigned");
        }
        
        setLoadingUser(false);
      } catch (error) {
        console.error("Failed to load user:", error);
        router.replace("/users");
      }
    };

    const loadShowroomName = async (showroomId: string) => {
      setLoadingShowroom(true);
      try {
        const { data } = await supabase
          .from("showrooms")
          .select("name")
          .eq("id", showroomId)
          .single();
        setShowroomName(data?.name || "Unknown Showroom");
      } catch (error) {
        setShowroomName("Error loading showroom");
      } finally {
        setLoadingShowroom(false);
      }
    };

    loadUser();
  }, [session, id, supabase, router]);

  /* ✅ VALIDATION */
  const isDiscountInvalid = Number(maxDiscount) < 0 || Number(maxDiscount) > 100;

  /* 💾 SAVE CHANGES */
  const handleSave = async () => {
    if (isDiscountInvalid) {
      setError(lang === "fr" ? "La remise doit être comprise entre 0 et 100" : "Discount must be between 0 and 100");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/users/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: id,
          full_name: fullName,
          role,
          active,
          language,
          max_discount_percent: Number(maxDiscount) || 0,
          password: password || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update user");

      setSuccess(t.editUser.saveSuccess || "User updated successfully");
      setTimeout(() => router.push("/users"), 2000);
    } catch (error) {
      setError(t.editUser.saveError || "Failed to update user. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  /* 🗑 DELETE USER */
  const handleDelete = async () => {
    if (!window.confirm(t.editUser.confirmDelete)) return;
    setIsDeleting(true);
    try {
      const response = await fetch("/api/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: id }),
      });
      if (!response.ok) throw new Error("Failed to delete user");
      router.push("/users");
    } catch (error) {
      setError(t.editUser.deleteError || "Failed to delete user");
      setIsDeleting(false);
    }
  };

  if (loading || !session || loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-300 text-lg">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-gray-100">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors group"
            >
              <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-medium">{t.common.back}</span>
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {t.editUser.title || "Edit User"}
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                {t.editUser.subtitle || "Modify user details and permissions"}
              </p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Alerts */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-xl">
              {/* User Avatar Section */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-700/50">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <User className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{user?.username}</h2>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Building className="h-3 w-3" />
                    {loadingShowroom ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>{showroomName}</span>}
                  </div>
                </div>
                <div className="ml-auto">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <div className={`h-2 w-2 rounded-full ${active ? 'bg-green-400' : 'bg-red-400'}`} />
                    {active ? t.common.active : t.common.inactive}
                  </div>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <User className="h-4 w-4" /> {t.users.username || "Username"}
                  </label>
                  <input value={user?.username || ""} disabled className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl text-gray-300 cursor-not-allowed outline-none" />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">{t.users.name || "Full Name"}</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> {t.users.role || "Role"}
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    {session?.role === "admin" && <option value="admin">{t.roles.admin}</option>}
                    <option value="manager">{t.roles.manager}</option>
                    <option value="employee">{t.roles.employee}</option>
                    <option value="driver">{t.roles.driver}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Globe className="h-4 w-4" /> {t.users.language || "Language"}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "EN" | "FR")}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="EN">{t.users.english || "English"}</option>
                    <option value="FR">{t.users.french || "French"}</option>
                  </select>
                </div>

                {/* Max Discount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    {lang === "fr" ? "Remise Max (%)" : "Max Discount (%)"}
                  </label>
                  <input
                    type="number"
                    value={maxDiscount}
                    onChange={(e) => setMaxDiscount(e.target.value)}
                    className={`w-full px-4 py-3 bg-gray-900 border rounded-xl text-white focus:ring-2 outline-none transition-all ${
                      isDiscountInvalid ? "border-red-500 focus:ring-red-500/20" : "border-gray-700 focus:ring-blue-500/50 focus:border-blue-500"
                    }`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">{t.editUser.password || "Password"}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave empty to keep current"
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">{t.editUser.accountStatus || "Account Status"}</h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">{t.common.active}</span>
                <button
                  onClick={() => setActive(!active)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* User Info Summary Card (The section from your screenshot) */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/30 p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">{t.editUser.userInfo || "User Information"}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.users.role || "Role"}:</span>
                  <span className="text-gray-300 font-medium">{role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t.users.language || "Language"}:</span>
                  <span className="text-gray-300 font-medium">
                    {language === "EN" ? (t.users.english || "English") : (t.users.french || "French")}
                  </span>
                </div>
                {/* ADDED: Max Discount Row */}
                <div className="flex justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    {lang === "fr" ? "Remise Max" : "Max Discount"}:
                  </span>
                  <span className="text-gray-300 font-medium">{maxDiscount}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {t.users.showroom || "Showroom"}:
                  </span>
                  <span className="text-gray-300 font-medium text-right">{loadingShowroom ? "..." : showroomName}</span>
                </div>
                <div className="pt-2 mt-2 border-t border-gray-700/50">
                  <p className="text-xs text-gray-500 italic">{t.editUser.editNote || "Changes will be applied immediately"}</p>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 shadow-xl">
              <div className="space-y-3">
                <button
                  onClick={handleSave}
                  disabled={isSaving || isDiscountInvalid}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                  {isSaving ? t.common.saving : t.common.save}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-red-500/30 text-red-400 hover:text-red-300 font-medium rounded-xl transition-all disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-5 w-5" />}
                  {isDeleting ? t.common.deleting : t.common.delete}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}