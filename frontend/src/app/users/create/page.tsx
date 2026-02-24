"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, 
  UserPlus, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Globe,
  Building,
  Shield,
  User,
  Percent // Added for the discount icon
} from "lucide-react";

const I18N = {
  en: {
    title: "Create New User",
    subtitle: "Add a new team member to your showroom",
    back: "Back to Users",
    fullName: "Full Name",
    username: "Username",
    password: "Password",
    role: "Role",
    roles: {
      admin: "Administrator",
      manager: "Manager",
      employee: "Employee",
      driver: "Driver",
    },
    showroom: "Showroom",
    active: "Active User",
    language: "Language",
    maxDiscount: "Max Discount (%)", // New
    create: "Create User",
    cancel: "Cancel",
    passwordStrength: "Password Strength",
    requirements: "Requirements",
    passwordRequirements: "At least 6 characters",
    formInstructions: "Fill in all required fields to create a new user account.",
    successMessage: "User created successfully!",
    errorMessage: "Failed to create user. Please try again.",
    formSectionPersonal: "Personal Information",
    formSectionAccess: "Access & Permissions",
    formSectionSettings: "Account Settings",
    namererequired: "Full name is required",
    userrequired: "Unique username required",
    minpass: "Password must be at least 6 characters",
    showroomrequired: "Showroom selection required for non-admin roles",
    invalidDiscount: "Discount must be between 0 and 100", // Added
  },
  fr: {
    title: "Créer un Nouvel Utilisateur",
    subtitle: "Ajouter un nouveau membre à votre équipe",
    back: "Retour aux Utilisateurs",
    fullName: "Nom Complet",
    username: "Nom d'Utilisateur",
    password: "Mot de Passe",
    role: "Rôle",
    roles: {
      admin: "Administrateur",
      manager: "Responsable",
      employee: "Employé",
      driver: "Chauffeur",
    },
    showroom: "Salle d'Exposition",
    active: "Utilisateur Actif",
    language: "Langue",
    maxDiscount: "Remise Max (%)", // New
    create: "Créer l'Utilisateur",
    cancel: "Annuler",
    passwordStrength: "Force du Mot de Passe",
    requirements: "Exigences",
    passwordRequirements: "Au moins 6 caractères",
    formInstructions: "Remplissez tous les champs obligatoires pour créer un nouveau compte utilisateur.",
    successMessage: "Utilisateur créé avec succès!",
    errorMessage: "Échec de la création de l'utilisateur. Veuillez réessayer.",
    formSectionPersonal: "Informations Personnelles",
    formSectionAccess: "Accès & Permissions",
    formSectionSettings: "Paramètres du Compte",
    namererequired: "Le nom complet est requis",
    userrequired: "Nom d'utilisateur unique requis",
    minpass: "Le mot de passe doit comporter au moins 6 caractères",
    showroomrequired: "Sélection de salle d’exposition requise pour les postes non administratifs",
    invalidDiscount: "La remise doit être comprise entre 0 et 100", // Added
  },
};

type Showroom = {
  id: string;
  name: string;
};

export default function CreateUserPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const supabase = createSupabaseClient();

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  const [showrooms, setShowrooms] = useState<Showroom[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    username: "",
    password: "",
    role: "employee",
    showroom_id: "",
    language: "en",
    active: true,
    max_discount_percent: "" as string | number, // Changed to allow empty string for placeholder
  });

  const [touched, setTouched] = useState({
    full_name: false,
    username: false,
    password: false,
    showroom_id: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  /* 🔒 ACCESS GUARD */
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/auth/login");
      return;
    }
    if (session.role !== "admin" && session.role !== "manager") {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  /* 📥 LOAD SHOWROOMS */
  useEffect(() => {
    if (!session) return;
    if (session.role === "manager") {
      setForm((f) => ({ ...f, showroom_id: session.showroom.id }));
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("showrooms")
        .select("id, name")
        .order("name");
      setShowrooms(data ?? []);
    };
    load();
  }, [session, supabase]);

  useEffect(() => {
    if (form.role === "admin") {
      setForm(f => ({ ...f, showroom_id: "" }));
      setTouched(t => ({ ...t, showroom_id: false }));
    }
  }, [form.role]);

  const availableRoles =
    session?.role === "admin"
      ? ["admin", "manager", "employee", "driver"]
      : ["manager", "employee", "driver"];

  /* ✅ ERRORS */
  const errors = {
    full_name: touched.full_name && !form.full_name.trim() ? t.namererequired : "",
    username: touched.username && !form.username.trim() ? t.userrequired : "",
    password: touched.password && form.password.length < 6 ? t.minpass : "",
    showroom_id: touched.showroom_id && form.role !== "admin" && !form.showroom_id ? t.showroomrequired : "",
    discount: (Number(form.max_discount_percent) < 0 || Number(form.max_discount_percent) > 100) ? t.invalidDiscount : "", // Added verification
  };

  const canSubmit =
    !errors.full_name &&
    !errors.username &&
    !errors.password &&
    !errors.showroom_id &&
    !errors.discount && // Added check
    form.full_name.trim() !== "" &&
    form.username.trim() !== "";

  const passwordStrength = form.password.length >= 6 ? "strong" : form.password.length >= 3 ? "medium" : "weak";

  const handleCreateUser = async () => {
    if (!canSubmit || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          max_discount_percent: Number(form.max_discount_percent) || 0, // Ensure it's a number for DB
          showroom_id: form.role === "admin" ? null : form.showroom_id,
          created_by_role: session!.role,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.errorMessage);
      setTimeout(() => { router.push("/users"); }, 1500);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t.errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !session) {
    return (
      <div style={loadingStyle}>
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />
      {/* Header */}
      <div style={headerStyle}>
        <button onClick={() => router.push("/users")} style={backButtonStyle}>
          <ArrowLeft size={20} />
          <span>{t.back}</span>
        </button>
        <div style={headerContentStyle}>
          <div style={headerTitleStyle}>
            <UserPlus size={32} style={{ color: "#6366f1" }} />
            <div>
              <h1 style={titleStyle}>{t.title}</h1>
              <p style={subtitleStyle}>{t.subtitle}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={contentStyle}>
        <div style={formContainerStyle}>
          {/* Section: Personal */}
          <div style={formSectionStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionIconStyle}><User size={20} /></div>
              <h3 style={sectionTitleStyle}>{t.formSectionPersonal}</h3>
            </div>
            <div style={formGridStyle}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.fullName}<span style={requiredStyle}>*</span></label>
                <div style={inputWrapperStyle}>
                  <input
                    value={form.full_name}
                    onBlur={() => setTouched(t => ({ ...t, full_name: true }))}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    style={inputStyle(!!errors.full_name)}
                  />
                  {errors.full_name && <div style={errorStyle}><AlertCircle size={16} /><span>{errors.full_name}</span></div>}
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.username}<span style={requiredStyle}>*</span></label>
                <div style={inputWrapperStyle}>
                  <input
                    value={form.username}
                    onBlur={() => setTouched(t => ({ ...t, username: true }))}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                    style={inputStyle(!!errors.username)}
                    autoComplete="new-username"
                  />
                  {errors.username && <div style={errorStyle}><AlertCircle size={16} /><span>{errors.username}</span></div>}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Access */}
          <div style={formSectionStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionIconStyle}><Shield size={20} /></div>
              <h3 style={sectionTitleStyle}>{t.formSectionAccess}</h3>
            </div>
            <div style={formGridStyle}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.password}<span style={requiredStyle}>*</span></label>
                <div style={inputWrapperStyle}>
                  <div style={passwordInputWrapperStyle}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onBlur={() => setTouched(t => ({ ...t, password: true }))}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      style={{ ...inputStyle(!!errors.password), border: "none", padding: 0 }}
                      placeholder="••••••••"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={passwordToggleStyle}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && <div style={errorStyle}><AlertCircle size={16} /><span>{errors.password}</span></div>}
                  {form.password && (
                    <div style={passwordStrengthStyle}>
                      <div style={passwordStrengthLabelStyle}>
                        <span>{t.passwordStrength}</span>
                        <span style={passwordStrengthTextStyle(passwordStrength)}>
                          {passwordStrength === "strong" ? "Strong" : passwordStrength === "medium" ? "Medium" : "Weak"}
                        </span>
                      </div>
                      <div style={passwordStrengthBarStyle}>
                        <div style={{ ...passwordStrengthFillStyle, width: `${Math.min((form.password.length / 6) * 100, 100)}%`, backgroundColor: passwordStrength === "strong" ? "#10b981" : passwordStrength === "medium" ? "#f59e0b" : "#ef4444" }} />
                      </div>
                      <p style={passwordHintStyle}><CheckCircle size={14} style={{ marginRight: 6 }} />{t.passwordRequirements}</p>
                    </div>
                  )}
                </div>
              </div>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.role}<span style={requiredStyle}>*</span></label>
                <div style={inputWrapperStyle}>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
                    {availableRoles.map(r => (
                      <option key={r} value={r}>{t.roles[r as keyof typeof t.roles]}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Settings */}
          <div style={formSectionStyle}>
            <div style={sectionHeaderStyle}>
              <div style={sectionIconStyle}><Building size={20} /></div>
              <h3 style={sectionTitleStyle}>{t.formSectionSettings}</h3>
            </div>
            <div style={formGridStyle}>
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.showroom}{form.role !== "admin" && <span style={requiredStyle}>*</span>}</label>
                <div style={inputWrapperStyle}>
                  {session.role === "admin" ? (
                    <select
                      value={form.showroom_id}
                      disabled={form.role === "admin"}
                      onBlur={() => setTouched(t => ({ ...t, showroom_id: true }))}
                      onChange={(e) => setForm(f => ({ ...f, showroom_id: e.target.value }))}
                      style={{ ...selectStyle, opacity: form.role === "admin" ? 0.5 : 1, cursor: form.role === "admin" ? "not-allowed" : "pointer" }}
                    >
                      <option value="">— Select showroom —</option>
                      {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  ) : (
                    <div style={disabledInputStyle}>{session.showroom.name}</div>
                  )}
                  {errors.showroom_id && <div style={errorStyle}><AlertCircle size={16} /><span>{errors.showroom_id}</span></div>}
                </div>
              </div>

              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.language}</label>
                <div style={inputWrapperStyle}>
                  <div style={languageSelectWrapperStyle}>
                    <Globe size={18} style={{ color: "#6b7280", position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                    <select
                      value={form.language}
                      onChange={(e) => setForm(f => ({ ...f, language: e.target.value }))}
                      style={{ ...selectStyle, paddingLeft: 36 }}
                    >
                      <option value="en">English</option>
                      <option value="fr">Français</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* NEW FIELD: max_discount_percent with verification and placeholder */}
              <div style={inputGroupStyle}>
                <label style={labelStyle}>{t.maxDiscount}</label>
                <div style={inputWrapperStyle}>
                  <div style={{ position: 'relative' }}>
                    <Percent size={18} style={{ color: "#6b7280", position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1 }} />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={form.max_discount_percent}
                      onChange={e => {
                        const val = e.target.value;
                        // Basic validation: limit characters or logic can go here if needed
                        setForm(f => ({ ...f, max_discount_percent: val === "" ? "" : Number(val) }));
                      }}
                      style={{ ...inputStyle(!!errors.discount), paddingLeft: 36 }}
                    />
                  </div>
                  {errors.discount && <div style={errorStyle}><AlertCircle size={16} /><span>{errors.discount}</span></div>}
                </div>
              </div>
            </div>

            <div style={toggleGroupStyle}>
              <label style={toggleLabelStyle}>
                <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} style={checkboxStyle} />
                <div style={toggleSwitchStyle(form.active)} />
                <span style={toggleTextStyle}>{t.active}</span>
              </label>
              <p style={toggleDescriptionStyle}>{form.active ? "User will have immediate access" : "Account created but disabled"}</p>
            </div>
          </div>

          {submitError && <div style={submitErrorStyle}><AlertCircle size={20} /><span>{submitError}</span></div>}

          <div style={actionsStyle}>
            <button type="button" onClick={() => router.push("/users")} style={cancelButtonStyle}>{t.cancel}</button>
            <button onClick={handleCreateUser} disabled={!canSubmit || isSubmitting} style={submitButtonStyle(!canSubmit || isSubmitting)}>
              {isSubmitting ? <><div style={spinnerStyle} /><span>Creating...</span></> : <><UserPlus size={20} /><span>{t.create}</span></>}
            </button>
          </div>
        </div>

        {/* Side Panel */}
        <div style={sidePanelStyle}>
          <div style={requirementsCardStyle}>
            <h4 style={requirementsTitleStyle}><CheckCircle size={20} /><span>{t.requirements}</span></h4>
            <ul style={requirementsListStyle}>
              {[t.namererequired, t.userrequired, t.minpass, t.showroomrequired].map((req, i) => (
                <li key={i} style={requirementItemStyle}><CheckCircle size={16} /><span>{req}</span></li>
              ))}
            </ul>
          </div>
          <div style={infoCardStyle}>
            <h4 style={infoTitleStyle}>Role Permissions</h4>
            <div style={roleInfoStyle}>
              {availableRoles.map(role => (
                <div key={role} style={roleItemStyle}>
                  <div style={roleBadgeStyle(role)}>{role.charAt(0).toUpperCase()}</div>
                  <div>
                    <strong>{t.roles[role as keyof typeof t.roles]}</strong>
                    <p style={roleDescriptionStyle}>{role === "admin" ? "Full system access" : role === "manager" ? "Manage team and showroom" : role === "employee" ? "Standard access" : "Transportation access"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== STYLES (Kept Original) ===== */
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#f8fafc", fontFamily: "'Inter', -apple-system, sans-serif" };
const loadingStyle: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#0f172a" };
const headerStyle: React.CSSProperties = { padding: "24px 40px", borderBottom: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(10px)" };
const backButtonStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", color: "#94a3b8", fontSize: "14px", fontWeight: 500, cursor: "pointer", padding: "8px 0" };
const headerContentStyle: React.CSSProperties = { marginTop: "16px" };
const headerTitleStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "16px" };
const titleStyle: React.CSSProperties = { fontSize: "32px", fontWeight: 700, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 };
const subtitleStyle: React.CSSProperties = { fontSize: "16px", color: "#94a3b8", margin: "4px 0 0 0" };
const contentStyle: React.CSSProperties = { display: "flex", gap: "32px", padding: "40px", maxWidth: "1400px", margin: "0 auto" };
const formContainerStyle: React.CSSProperties = { flex: 1, maxWidth: "800px" };
const sidePanelStyle: React.CSSProperties = { width: "320px", flexShrink: 0 };
const formSectionStyle: React.CSSProperties = { background: "rgba(30, 41, 59, 0.5)", borderRadius: "16px", padding: "24px", marginBottom: "24px", border: "1px solid rgba(255, 255, 255, 0.05)", backdropFilter: "blur(10px)" };
const sectionHeaderStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" };
const sectionIconStyle: React.CSSProperties = { width: "40px", height: "40px", borderRadius: "10px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff" };
const sectionTitleStyle: React.CSSProperties = { fontSize: "18px", fontWeight: 600, color: "#f8fafc", margin: 0 };
const formGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" };
const inputGroupStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "8px" };
const labelStyle: React.CSSProperties = { fontSize: "14px", fontWeight: 500, color: "#cbd5e1", display: "flex", alignItems: "center", gap: "4px" };
const requiredStyle: React.CSSProperties = { color: "#ef4444", fontSize: "18px" };
const inputWrapperStyle: React.CSSProperties = { position: "relative" };
const inputStyle = (hasError: boolean): React.CSSProperties => ({ width: "100%", padding: "12px 16px", borderRadius: "10px", border: `1px solid ${hasError ? "#ef4444" : "rgba(255, 255, 255, 0.1)"}`, background: "rgba(15, 23, 42, 0.8)", color: "#f8fafc", fontSize: "15px", outline: "none" });
const passwordInputWrapperStyle: React.CSSProperties = { display: "flex", alignItems: "center", padding: "0 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.8)" };
const passwordToggleStyle: React.CSSProperties = { background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" };
const passwordStrengthStyle: React.CSSProperties = { marginTop: "12px" };
const passwordStrengthLabelStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#94a3b8", marginBottom: "8px" };
const passwordStrengthTextStyle = (strength: string): React.CSSProperties => ({ color: strength === "strong" ? "#10b981" : strength === "medium" ? "#f59e0b" : "#ef4444", fontWeight: 600 });
const passwordStrengthBarStyle: React.CSSProperties = { height: "4px", background: "rgba(255, 255, 255, 0.1)", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" };
const passwordStrengthFillStyle: React.CSSProperties = { height: "100%", transition: "width 0.3s ease" };
const passwordHintStyle: React.CSSProperties = { display: "flex", alignItems: "center", fontSize: "13px", color: "#94a3b8", margin: 0 };
const selectStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(15, 23, 42, 0.8)", color: "#f8fafc", fontSize: "15px", cursor: "pointer", outline: "none" };
const disabledInputStyle: React.CSSProperties = { width: "100%", padding: "12px 16px", borderRadius: "10px", background: "rgba(255, 255, 255, 0.05)", color: "#94a3b8", fontSize: "15px", border: "1px solid rgba(255, 255, 255, 0.05)" };
const languageSelectWrapperStyle: React.CSSProperties = { position: "relative" };
const toggleGroupStyle: React.CSSProperties = { marginTop: "24px", paddingTop: "24px", borderTop: "1px solid rgba(255, 255, 255, 0.05)" };
const toggleLabelStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" };
const checkboxStyle: React.CSSProperties = { display: "none" };
const toggleSwitchStyle = (checked: boolean): React.CSSProperties => ({ width: "44px", height: "24px", borderRadius: "12px", background: checked ? "#10b981" : "rgba(255, 255, 255, 0.1)", position: "relative", transition: "background 0.2s" });
const toggleTextStyle: React.CSSProperties = { fontSize: "15px", fontWeight: 500, color: "#f8fafc" };
const toggleDescriptionStyle: React.CSSProperties = { fontSize: "13px", color: "#94a3b8", margin: "8px 0 0 56px" };
const errorStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "6px", color: "#ef4444", fontSize: "13px", marginTop: "6px" };
const submitErrorStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", padding: "16px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "10px", color: "#fca5a5", fontSize: "14px", marginBottom: "24px" };
const actionsStyle: React.CSSProperties = { display: "flex", gap: "16px", justifyContent: "flex-end", marginTop: "32px" };
const cancelButtonStyle: React.CSSProperties = { padding: "14px 28px", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "#dc2626", color: "white", fontSize: "15px", fontWeight: 800, cursor: "pointer" };
const submitButtonStyle = (disabled: boolean): React.CSSProperties => ({ padding: "14px 28px", borderRadius: "10px", border: "none", background: disabled ? "rgba(99, 102, 241, 0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "#ffffff", fontSize: "15px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "10px" });
const spinnerStyle: React.CSSProperties = { width: "20px", height: "20px", border: "2px solid rgba(255, 255, 255, 0.3)", borderTopColor: "#ffffff", borderRadius: "50%" };
const requirementsCardStyle: React.CSSProperties = { background: "rgba(30, 41, 59, 0.5)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255, 255, 255, 0.05)", marginBottom: "24px" };
const requirementsTitleStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", color: "#f8fafc", fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" };
const requirementsListStyle: React.CSSProperties = { listStyle: "none", padding: 0, margin: 0 };
const requirementItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", color: "#94a3b8", fontSize: "14px", borderBottom: "1px solid rgba(255, 255, 255, 0.05)" };
const infoCardStyle: React.CSSProperties = { background: "rgba(30, 41, 59, 0.5)", borderRadius: "16px", padding: "24px", border: "1px solid rgba(255, 255, 255, 0.05)" };
const infoTitleStyle: React.CSSProperties = { color: "#f8fafc", fontSize: "16px", fontWeight: 600, margin: "0 0 16px 0" };
const roleInfoStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "12px" };
const roleItemStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px" };
const roleBadgeStyle = (role: string): React.CSSProperties => ({ width: "32px", height: "32px", borderRadius: "8px", background: role === "admin" ? "#8b5cf6" : role === "manager" ? "#3b82f6" : role === "employee" ? "#10b981" : "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", fontWeight: 600, fontSize: "14px" });
const roleDescriptionStyle: React.CSSProperties = { fontSize: "12px", color: "#94a3b8", margin: "2px 0 0 0" };

const globalStyles = `
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .spinner { animation: spin 1s linear infinite; width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.1); border-top-color: #6366f1; border-radius: 50%; }
`;
