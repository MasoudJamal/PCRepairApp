"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";
import { I18N } from "@/lib/i18n"; // Using your existing I18N helper
import { ArrowLeft, ShieldCheck, RefreshCw } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { session, setSession } = useSession();
  
  // Bilingual setup
  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  async function handleSubmit() {
    setError(null);

    if (!oldPassword || !newPassword || !confirm) {
      setError(lang === "fr" ? "Tous les champs sont obligatoires" : "All fields are required");
      return;
    }

    if (newPassword !== confirm) {
      setError(lang === "fr" ? "Les mots de passe ne correspondent pas" : "Passwords do not match");
      return;
    }

    try {
      setLoadingSubmit(true);
      const supabase = createSupabaseClient();

      // 1. Get the current user's REAL email from the Auth service
      // This avoids guessing how the email was constructed.
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user?.email) {
        throw new Error(lang === "fr" ? "Session expirée" : "Session expired");
      }

      // 2. Re-authenticate to verify Old Password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: oldPassword,
      });

      if (signInError) {
        throw new Error(lang === "fr" ? "Le mot de passe actuel est incorrect" : "Current password is incorrect");
      }

      // 3. Update to New Password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // 4. Success Logic
      alert(lang === "fr" ? "Mot de passe mis à jour !" : "Password updated successfully!");
      
      await supabase.auth.signOut();
      setSession(null); 
      router.replace("/auth/login");

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingSubmit(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md bg-slate-900/50 border border-slate-800 p-8 rounded-2xl backdrop-blur-xl shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
            <ShieldCheck size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {lang === "fr" ? "Sécurité" : "Security Settings"}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 ml-1">
              {lang === "fr" ? "Mot de passe actuel" : "Current Password"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 transition outline-none"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div className="h-px bg-slate-800 my-2" />

          {/* New Password */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 ml-1">
              {lang === "fr" ? "Nouveau mot de passe" : "New Password"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 transition outline-none"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-slate-500 mb-2 ml-1">
              {lang === "fr" ? "Confirmer le mot de passe" : "Confirm New Password"}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full p-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500/50 transition outline-none"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={loadingSubmit}
            className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            {loadingSubmit ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              lang === "fr" ? "Mettre à jour" : "Update Password"
            )}
          </button>

          {/* Back Button */}
          <button
            onClick={() => router.push("/dashboard")}
            disabled={loadingSubmit}
            className="w-full py-3 bg-transparent hover:bg-slate-800 text-slate-400 rounded-xl font-medium transition flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            {lang === "fr" ? "Retour au tableau de bord" : "Back to Dashboard"}
          </button>
        </div>
      </div>
    </div>
  );
}