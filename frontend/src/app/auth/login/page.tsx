"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "../../../context/SessionContext";
import { BRANDING } from "@/config/branding";

import { registerOrCheckDevice } from "./actions";
import { getDeviceFingerprint } from "@/lib/device/getDeviceId";

import {
  Eye,
  EyeOff,
  LogIn,
  User,
  Lock,
  Globe,
  Shield,
  Smartphone,
  Cpu,
  Wifi,
  HardDrive,
  Server,
  Activity,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { setSession } = useSession();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [lang, setLang] = useState<"en" | "fr">("en");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const t = {
    en: {
      title: "Welcome ...",
      subtitle: "Sign in to your PC Repair Dashboard",
      username: "Username",
      password: "Password",
      login: "Sign In",
      invalid: "Invalid username or password.",
      disabled: "Account is disabled. Please contact your administrator.",
	  showroomDisabled: "Your showroom is currently inactive. Please contact the administrator.",
      show: "Show",
      hide: "Hide",
      remember: "Remember me",
      forgotPassword: "Forgot password?",
      noAccount: "Don't have an account?",
      contactAdmin: "Contact Administrator",
      systemStatus: "System Status",
      language: "Language",
      loading: "Signing in...",
      success: "Login successful!",
      features: {
        title: "Powerful PC Repair Management",
        items: [
          "Track repair orders in real-time",
          "Manage customer database",
          "Prepare and print repair forms rapidly",
          "Generate professional invoices",
          "Analytics & reporting dashboard"
        ]
      }
    },
    fr: {
      title: "Bienvenue",
      subtitle: "Connectez-vous à votre Tableau de Bord PC Repair",
      username: "Nom d'utilisateur",
      password: "Mot de passe",
      login: "Connexion",
      invalid: "Nom d'utilisateur ou mot de passe incorrect.",
      disabled: "Compte désactivé. Veuillez contacter votre administrateur.",
	  showroomDisabled: "Votre showroom est actuellement désactivé. Veuillez contacter l'administrateur.",
      show: "Afficher",
      hide: "Masquer",
      remember: "Se souvenir de moi",
      forgotPassword: "Mot de passe oublié ?",
      noAccount: "Pas de compte ?",
      contactAdmin: "Contacter l'administrateur",
      systemStatus: "État du système",
      language: "Langue",
      loading: "Connexion en cours...",
      success: "Connexion réussie !",
      features: {
        title: "Gestion Puissante des Réparations PC",
        items: [
          "Suivi des commandes en temps réel",
          "Gestion de la base de données clients",
          "Préparez et imprimez rapidement les formulaires de réparation",
          "Génération de factures professionnelles",
          "Tableau de bord analytique et rapports"
        ]
      }
    },
  };

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setIsLoading(true);

  try {
    const email = `${username}@local.auth`;

    // 1️⃣ AUTHENTICATE
    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError || !data.user) {
      setError(t[lang].invalid);
      return;
    }

    // 2️⃣ LOAD USER PROFILE
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        id,
        full_name,
        role,
        language,
        active,
        max_discount_percent,
        showroom:showrooms (
          id,
          name,
          address,
          logo_url,
          currency_code,
          active
        )
      `)
      .eq("id", data.user.id)
      .single();

    if (userError || !user) {
      setError(t[lang].invalid);
      return;
    }

    // 3️⃣ USER STATUS CHECKS
    if (!user.active) {
      setError(t[lang].disabled);
      await supabase.auth.signOut();
      return;
    }

    if (
      user.role !== "admin" &&
      user.showroom &&
      user.showroom.active === false
    ) {
      setError(t[lang].showroomDisabled);
      await supabase.auth.signOut();
      return;
    }

    // 4️⃣ ADMINS BYPASS DEVICE CHECK
    if (user.role === "admin") {
      setSession({
		id: user.id,
        full_name: user.full_name,
        role: user.role,
        language: user.language,
        showroom: user.showroom,
      });

      router.push("/dashboard");
      return;
    }

    // ===============================
    // 5️⃣ DEVICE FINGERPRINT (DECLARE FIRST!)
    // ===============================
    const fingerprint = await getDeviceFingerprint();

    // ===============================
    // 6️⃣ DEVICE AUTHORIZATION
    // ===============================
    const device = await registerOrCheckDevice({
      cpu_id: fingerprint.device_id,
      device_label: navigator.platform,
      showroom_id: user.showroom!.id,
      requesting_user_id: user.id,
	  device_id: fingerprint.device_id,
      mac_address: fingerprint.mac_address ?? "unknown",
    });
	
	// if (device.awaiting_approval && !device.active) {
    // router.push("/auth/awaiting-approval");
    // return;
   // }

    if (device.awaiting_approval) {
      setError(
        lang === "en"
          ? "This device is awaiting administrator approval."
          : "Cet appareil est en attente d'approbation."
      );
      await supabase.auth.signOut();
      return;
    }

    if (!device.active) {
      setError(
        lang === "en"
          ? "This device has been blocked."
          : "Cet appareil a été bloqué."
      );
      await supabase.auth.signOut();
      return;
    }

    // 7️⃣ LOGIN SUCCESS
    setSession({
	  id: user.id,	
      full_name: user.full_name,
      role: user.role,
      language: user.language,
      showroom: {
        id: user.showroom!.id,
        name: user.showroom!.name,
        address: user.showroom!.address,
        logo_url: user.showroom!.logo_url,
        currency_code: user.showroom!.currency_code,
      },
    });

    setTimeout(() => {
      router.push("/dashboard");
    }, 800);
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    setError("Unexpected login error.");
    await supabase.auth.signOut();
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div style={pageStyle}>
      {/* Left Panel - Features */}
      <div style={leftPanelStyle}>
        <div style={leftPanelContentStyle}>
          {/* Logo and Brand */}
          <div style={brandSectionStyle}>
            <div style={logoContainerStyle}>
              {BRANDING.logo ? (
                <img
                  src={BRANDING.logo}
                  alt={`${BRANDING.appName} Logo`}
                  style={logoStyle}
                />
              ) : (
                <div style={defaultLogoStyle}>
                  <Cpu size={48} />
                </div>
              )}
            </div>
            <h1 style={appNameStyle}>{BRANDING.appName}</h1>
            <p style={appTaglineStyle}>
              {lang === "en" 
                ? "Professional PC Repair Management System"
                : "Système Professionnel de Gestion des Réparations PC"
              }
            </p>
          </div>

          {/* Features List */}
          <div style={featuresSectionStyle}>
            <h3 style={featuresTitleStyle}>
              <CheckCircle size={20} style={{ marginRight: 10 }} />
              {t[lang].features.title}
            </h3>
            <ul style={featuresListStyle}>
              {t[lang].features.items.map((item, index) => (
                <li key={index} style={featureItemStyle}>
                  <div style={featureIconStyle}>
                    <Activity size={16} />
                  </div>
                  <span style={featureTextStyle}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* System Status */}
          <div style={statusSectionStyle}>
            <h4 style={statusTitleStyle}>
              <Server size={18} style={{ marginRight: 8 }} />
              {t[lang].systemStatus}
            </h4>
            <div style={statusGridStyle}>
              <div style={statusItemStyle}>
                <div style={statusIndicatorStyle(true)} />
                <span style={statusTextStyle}>Database</span>
              </div>
              <div style={statusItemStyle}>
                <div style={statusIndicatorStyle(true)} />
                <span style={statusTextStyle}>Authentication</span>
              </div>
              <div style={statusItemStyle}>
                <div style={statusIndicatorStyle(true)} />
                <span style={statusTextStyle}>API Services</span>
              </div>
              <div style={statusItemStyle}>
                <div style={statusIndicatorStyle(true)} />
                <span style={statusTextStyle}>Storage</span>
              </div>
            </div>
          </div>

          {/* Tech Icons Background */}
          <div style={techIconsStyle}>
            <Cpu size={24} />
            <HardDrive size={24} />
            <Smartphone size={24} />
            <Wifi size={24} />
            <Server size={24} />
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div style={rightPanelStyle}>
        <div style={rightPanelContentStyle}>
          {/* Language Toggle */}
          <div style={languageToggleStyle}>
            <Globe size={18} />
            <button
              onClick={() => setLang(lang === "en" ? "fr" : "en")}
              style={languageButtonStyle}
            >
              {lang === "en" ? "FR" : "EN"}
            </button>
          </div>

          {/* Welcome Section */}
          <div style={welcomeSectionStyle}>
            <h2 style={welcomeTitleStyle}>{t[lang].title}</h2>
            <p style={welcomeSubtitleStyle}>{t[lang].subtitle}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={formStyle}>
            {/* Username Field */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                <User size={18} style={{ marginRight: 8 }} />
                {t[lang].username}
              </label>
              <div style={inputContainerStyle}>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  style={inputStyle}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div style={inputGroupStyle}>
              <label style={labelStyle}>
                <Lock size={18} style={{ marginRight: 8 }} />
                {t[lang].password}
              </label>
              <div style={inputContainerStyle}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={inputStyle}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={passwordToggleStyle}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div style={optionsStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={checkboxStyle}
                  disabled={isLoading}
                />
                <span style={checkboxTextStyle}>{t[lang].remember}</span>
              </label>
              <button 
                type="button" 
                style={forgotPasswordStyle}
                onClick={() => {/* Add forgot password logic */}}
              >
                {t[lang].forgotPassword}
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div style={errorStyle}>
                <AlertCircle size={20} />
                <span style={errorTextStyle}>{error}</span>
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              style={loginButtonStyle(isLoading)}
              disabled={isLoading || !username || !password}
            >
              {isLoading ? (
                <>
                  <div style={spinnerStyle} />
                  <span>{t[lang].loading}</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>{t[lang].login}</span>
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            {/* Divider */}
            <div style={dividerStyle}>
              <span style={dividerTextStyle}>OR</span>
            </div>

            {/* Admin Contact */}
            <div style={adminSectionStyle}>
              <p style={adminTextStyle}>{t[lang].noAccount}</p>
              <button 
                type="button" 
                style={adminButtonStyle}
                onClick={() => {/* Add admin contact logic */}}
              >
                <Shield size={18} />
                <span>{t[lang].contactAdmin}</span>
              </button>
            </div>
          </form>

          {/* Footer */}
          <div style={footerStyle}>
            <p style={footerTextStyle}>
              © {new Date().getFullYear()} {BRANDING.appName}. All rights reserved.
            </p>
            <div style={footerLinksStyle}>
              <button style={footerLinkStyle}>Privacy Policy</button>
              <span style={footerSeparatorStyle}>•</span>
              <button style={footerLinkStyle}>Terms of Service</button>
              <span style={footerSeparatorStyle}>•</span>
              <button style={footerLinkStyle}>Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== STYLES ===== */

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  background: "#0f172a",
  fontFamily: "'Inter', -apple-system, sans-serif",
  overflow: "hidden",
};

/* Left Panel Styles */
const leftPanelStyle: React.CSSProperties = {
  flex: 1,
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
  padding: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  overflow: "hidden",
};

const leftPanelContentStyle: React.CSSProperties = {
  maxWidth: "600px",
  width: "100%",
  position: "relative",
  zIndex: 2,
};

const brandSectionStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "48px",
};

const logoContainerStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const logoStyle: React.CSSProperties = {
  width: "120px",
  height: "120px",
  objectFit: "contain",
  margin: "0 auto",
};

const defaultLogoStyle: React.CSSProperties = {
  width: "120px",
  height: "120px",
  margin: "0 auto",
  borderRadius: "24px",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#ffffff",
};

const appNameStyle: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: 800,
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  margin: "0 0 8px 0",
};

const appTaglineStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#94a3b8",
  margin: 0,
};

const featuresSectionStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.5)",
  borderRadius: "16px",
  padding: "24px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
  marginBottom: "32px",
};

const featuresTitleStyle: React.CSSProperties = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#f8fafc",
  margin: "0 0 16px 0",
  display: "flex",
  alignItems: "center",
};

const featuresListStyle: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
};

const featureItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 0",
  borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
};

const featureIconStyle: React.CSSProperties = {
  width: "28px",
  height: "28px",
  borderRadius: "8px",
  background: "rgba(99, 102, 241, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#6366f1",
  flexShrink: 0,
};

const featureTextStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#cbd5e1",
  lineHeight: 1.4,
};

const statusSectionStyle: React.CSSProperties = {
  background: "rgba(30, 41, 59, 0.5)",
  borderRadius: "16px",
  padding: "20px",
  border: "1px solid rgba(255, 255, 255, 0.05)",
  backdropFilter: "blur(10px)",
};

const statusTitleStyle: React.CSSProperties = {
  fontSize: "16px",
  fontWeight: 600,
  color: "#f8fafc",
  margin: "0 0 16px 0",
  display: "flex",
  alignItems: "center",
};

const statusGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "12px",
};

const statusItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
};

const statusIndicatorStyle = (active: boolean): React.CSSProperties => ({
  width: "12px",
  height: "12px",
  borderRadius: "50%",
  background: active ? "#10b981" : "#ef4444",
  animation: active ? "pulse 2s infinite" : "none",
});

const statusTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#94a3b8",
};

const techIconsStyle: React.CSSProperties = {
  position: "absolute",
  bottom: "40px",
  right: "40px",
  display: "flex",
  gap: "20px",
  color: "rgba(255, 255, 255, 0.05)",
  zIndex: 1,
};

/* Right Panel Styles */
const rightPanelStyle: React.CSSProperties = {
  flex: 1,
  background: "#ffffff",
  padding: "40px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const rightPanelContentStyle: React.CSSProperties = {
  maxWidth: "440px",
  width: "100%",
};

const languageToggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  justifyContent: "flex-end",
  marginBottom: "40px",
};

const languageButtonStyle: React.CSSProperties = {
  padding: "6px 16px",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#475569",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  transition: "all 0.2s",
};

const welcomeSectionStyle: React.CSSProperties = {
  marginBottom: "40px",
};

const welcomeTitleStyle: React.CSSProperties = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#0f172a",
  margin: "0 0 8px 0",
};

const welcomeSubtitleStyle: React.CSSProperties = {
  fontSize: "16px",
  color: "#64748b",
  margin: 0,
  lineHeight: 1.5,
};

const formStyle: React.CSSProperties = {
  marginBottom: "40px",
};

const inputGroupStyle: React.CSSProperties = {
  marginBottom: "24px",
};

const labelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  fontSize: "14px",
  fontWeight: 500,
  color: "#475569",
  marginBottom: "8px",
};

const inputContainerStyle: React.CSSProperties = {
  position: "relative",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px 14px 48px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  outline: "none",
  transition: "all 0.2s",
};

const passwordToggleStyle: React.CSSProperties = {
  position: "absolute",
  right: "16px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  color: "#94a3b8",
  cursor: "pointer",
  padding: "4px",
};

const optionsStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  borderRadius: "4px",
  border: "2px solid #cbd5e1",
  cursor: "pointer",
};

const checkboxTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
};

const forgotPasswordStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6366f1",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  padding: 0,
};

const errorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px",
  borderRadius: "12px",
  background: "#fff7ed",
  border: "4px solid red",
  marginBottom: "24px",
};

const errorTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#dc2626",
  flex: 1,
};

const loginButtonStyle = (isLoading: boolean): React.CSSProperties => ({
  width: "100%",
  padding: "16px",
  borderRadius: "12px",
  border: "none",
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 600,
  cursor: isLoading ? "not-allowed" : "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "12px",
  transition: "all 0.2s",
  opacity: isLoading ? 0.8 : 1,
});

const spinnerStyle: React.CSSProperties = {
  width: "20px",
  height: "20px",
  border: "2px solid rgba(255, 255, 255, 0.3)",
  borderTopColor: "#ffffff",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  margin: "32px 0",
};

const dividerTextStyle: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  fontSize: "14px",
  color: "#94a3b8",
  padding: "0 16px",
};

const adminSectionStyle: React.CSSProperties = {
  textAlign: "center",
};

const adminTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 16px 0",
};

const adminButtonStyle: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  color: "#475569",
  fontSize: "14px",
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  transition: "all 0.2s",
};

const footerStyle: React.CSSProperties = {
  textAlign: "center",
  paddingTop: "32px",
  borderTop: "1px solid #e2e8f0",
};

const footerTextStyle: React.CSSProperties = {
  fontSize: "14px",
  color: "#64748b",
  margin: "0 0 16px 0",
};

const footerLinksStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "16px",
};

const footerLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#6366f1",
  fontSize: "14px",
  cursor: "pointer",
  padding: 0,
};

const footerSeparatorStyle: React.CSSProperties = {
  color: "#cbd5e1",
};

