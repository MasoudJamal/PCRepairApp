"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AwaitingApproval() {
  const router = useRouter();
  const [lang, setLang] = useState<"en" | "fr">("en"); // default language

  const t = {
    en: {
      title: "Device Awaiting Approval",
      message:
        "This device has been registered but must be approved by an administrator before you can continue.",
      backButton: "Back to Logon",
      toggleLang: "FR",
    },
    fr: {
      title: "Appareil en Attente d'Approbation",
      message:
        "Cet appareil a été enregistré mais doit être approuvé par un administrateur avant de pouvoir continuer.",
      backButton: "Retour à la Connexion",
      toggleLang: "EN",
    },
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
        padding: "16px",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          background: "#fff",
          padding: "32px",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Language Toggle */}
        <button
          onClick={() => setLang(lang === "en" ? "fr" : "en")}
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid #ccc",
            background: "#f9f9f9",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          {t[lang].toggleLang}
        </button>

        {/* Title */}
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "16px" }}>
          {t[lang].title}
        </h1>

        {/* Message */}
        <p style={{ fontSize: "14px", color: "#555", marginBottom: "24px" }}>
          {t[lang].message}
        </p>

        {/* Back to Login Button */}
        <button
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "none",
            background: "#6366f1",
            color: "#fff",
            fontWeight: 600,
            cursor: "pointer",
          }}
          onClick={() => router.push("/auth/login")}
        >
          {t[lang].backButton}
        </button>
      </div>
    </div>
  );
}