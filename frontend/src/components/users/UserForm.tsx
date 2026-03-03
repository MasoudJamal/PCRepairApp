"use client";

import { useEffect, useState } from "react";

type UserFormMode = "create" | "edit";

type Role = "admin" | "manager" | "employee" | "driver";
type Language = "en" | "fr";

type Showroom = {
  id: string;
  name: string;
};

type UserFormData = {
  id?: string;
  full_name: string;
  username?: string;
  role: Role;
  showroom_id: string | null;
  language: Language;
  active: boolean;
};

type UserFormState = {
  full_name: string;
  username: string;
  password: string;
  role: Role;
  showroom_id: string;
  language: Language;
  active: boolean;
};

type TranslationKeys = {
  fullName: string;
  username: string;
  password: string;
  role: string;
  language: string;
  showroom: string;
  active: string;
  cancel: string;
  create: string;
  save: string;
  missingFullName: string;
  missingUsername: string;
  passwordTooShort: string;
  missingShowroom: string;
  roles: Record<Role, string>;
};

type Session = {
  role: Role;
  showroom: {
    id: string;
    name: string;
  };
};

type UserFormProps = {
  mode: UserFormMode;
  t: TranslationKeys;
  session: Session;
  initialData?: UserFormData;
  showrooms: Showroom[];
  onSubmit: (data: UserFormData & { password?: string }) => Promise<void>;
  onCancel: () => void;
};

export function UserForm({
  mode,
  t,
  session,
  initialData,
  showrooms,
  onSubmit,
  onCancel,
}: UserFormProps) {
  const [form, setForm] = useState<UserFormState>({
  full_name: initialData?.full_name ?? "",
  username: initialData?.username ?? "",
  password: "",
  role: initialData?.role ?? "employee",
  showroom_id: initialData?.showroom_id ?? "",
  language: initialData?.language ?? "en",
  active: initialData?.active ?? true,
});

  const [touched, setTouched] = useState<{
  full_name: boolean;
  username: boolean;
  password: boolean;
  showroom_id: boolean;
}>({
  full_name: false,
  username: false,
  password: false,
  showroom_id: false,
});

  /* 🔐 AVAILABLE ROLES */
  const availableRoles: Role[] =
  session.role === "admin"
    ? ["admin", "manager", "employee", "driver"]
    : ["manager", "employee", "driver"];

  /* 🧠 RESET SHOWROOM IF ADMIN */
  useEffect(() => {
    if (form.role === "admin") {
      setForm((f) => ({ ...f, showroom_id: "" }));
      setTouched((t) => ({ ...t, showroom_id: false }));
    }
  }, [form.role]);

  /* ❌ VALIDATION */
  const errors = {
    full_name:
      touched.full_name && !form.full_name.trim()
        ? t.missingFullName
        : "",
    username:
      mode === "create" &&
      touched.username &&
      !form.username.trim()
        ? t.missingUsername
        : "",
    password:
      touched.password && form.password && form.password.length < 6
        ? t.passwordTooShort
        : "",
    showroom_id:
      touched.showroom_id &&
      form.role !== "admin" &&
      !form.showroom_id
        ? t.missingShowroom
        : "",
  };

  const canSubmit =
    !errors.full_name &&
    !errors.username &&
    !errors.password &&
    !errors.showroom_id &&
    form.full_name.trim() !== "" &&
    (mode === "edit" || form.username.trim() !== "");

  /* 📤 SUBMIT */
  const handleSubmit = async () => {
    if (!canSubmit) return;

    await onSubmit({
      ...form,
      showroom_id: form.role === "admin" ? null : form.showroom_id,
    });
  };

  return (
    <div style={cardStyle}>
      {/* USERNAME (EDIT = READ ONLY) */}
      {mode === "edit" && (
        <div style={{ marginBottom: 14, fontSize: 14, opacity: 0.8 }}>
          <strong>{t.username}:</strong> {initialData?.username}
        </div>
      )}

      <Field
        label={t.fullName}
        value={form.full_name}
        onBlur={() => setTouched(t => ({ ...t, full_name: true }))}
        onChange={(v) => setForm(f => ({ ...f, full_name: v }))}
        error={errors.full_name}
      />

      {mode === "create" && (
        <Field
          label={t.username}
          value={form.username}
          onBlur={() => setTouched(t => ({ ...t, username: true }))}
          onChange={(v) => setForm(f => ({ ...f, username: v }))}
          error={errors.username}
        />
      )}

      <Field
        label={t.password}
        type="password"
        value={form.password}
        onBlur={() => setTouched(t => ({ ...t, password: true }))}
        onChange={(v) => setForm(f => ({ ...f, password: v }))}
        error={errors.password}
      />

      {/* ROLE (TRANSLATED LABEL, ENGLISH VALUE) */}
      <label>
        {t.role}
        <select
          value={form.role}
          onChange={(e) =>
  setForm(f => ({ ...f, role: e.target.value as Role }))
}
          style={inputStyle}
        >
          {availableRoles.map(r => (
            <option key={r} value={r}>
              {t.roles[r]} {/* UI translation only */}
            </option>
          ))}
        </select>
      </label>

      <label>
        {t.language}
        <select
          value={form.language}
          onChange={(e) =>
  setForm(f => ({ ...f, language: e.target.value as Language }))
}
          style={inputStyle}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
        </select>
      </label>

      {/* SHOWROOM */}
      <label>
        {t.showroom}
        {session.role === "admin" ? (
          <select
            value={form.showroom_id}
            disabled={form.role === "admin"}
            onBlur={() => setTouched(t => ({ ...t, showroom_id: true }))}
            onChange={(e) =>
              setForm(f => ({ ...f, showroom_id: e.target.value }))
            }
            style={{
              ...inputStyle,
              opacity: form.role === "admin" ? 0.6 : 1,
            }}
          >
            <option value="">— Select showroom —</option>
            {showrooms.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input value={session.showroom.name} disabled style={inputStyle} />
        )}
      </label>

      {errors.showroom_id && <ErrorText>{errors.showroom_id}</ErrorText>}

      <label style={{ display: "flex", gap: 10 }}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) =>
            setForm(f => ({ ...f, active: e.target.checked }))
          }
        />
        {t.active}
      </label>

      {/* ACTIONS */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
        <button onClick={onCancel} style={cancelStyle}>
          {t.cancel}
        </button>

        <button onClick={handleSubmit} disabled={!canSubmit} style={primaryStyle(canSubmit)}>
          {mode === "create" ? t.create : t.save}
        </button>
      </div>
    </div>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  type?: React.HTMLInputTypeAttribute;
};

function Field({
  label,
  value,
  onChange,
  onBlur,
  error,
  type = "text",
}: FieldProps) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        onBlur={onBlur}
        style={{
          ...inputStyle,
          border: error ? "1px solid #ef4444" : inputStyle.border,
        }}
      />
      {error && <ErrorText>{error}</ErrorText>}
    </label>
  );
}

/* ===== STYLES ===== */

const cardStyle = {
  width: "100%",
  background: "#020617",
  borderRadius: 16,
  padding: 24,
  boxShadow: "0 10px 30px rgba(0,0,0,.4)",
};

const inputStyle = {
  display: "block",
  width: "100%",
  marginTop: 6,
  marginBottom: 14,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #1e293b",
  background: "#020617",
  color: "#e5e7eb",
};

const primaryStyle = (enabled: boolean) => ({
  padding: "10px 20px",
  borderRadius: 8,
  background: enabled ? "linear-gradient(90deg,#6366f1,#06b6d4)" : "#334155",
  color: "#fff",
  border: "none",
  cursor: enabled ? "pointer" : "not-allowed",
});

const cancelStyle = {
  padding: "10px 20px",
  borderRadius: 8,
  background: "transparent",
  border: "1px solid #334155",
  color: "#cbd5f5",
};

const ErrorText = ({ children }: { children: string }) => (
  <div style={{ color: "#fca5a5", fontSize: 12, marginTop: -8 }}>
    {children}
  </div>
);