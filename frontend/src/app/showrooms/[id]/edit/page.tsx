"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { 
  ArrowLeft, 
  Save, 
  Building, 
  MapPin, 
  Phone, 
  Percent, 
  Globe, 
  Image as ImageIcon,
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  ToggleLeft,
  ToggleRight,
  DollarSign,
  Trash2,
  Scale
} from "lucide-react";

/* ISO CURRENCIES (BILINGUAL) */
const CURRENCIES = [
  { code: "TND", en: "Tunisian Dinar", fr: "Dinar tunisien" },
  { code: "USD", en: "US Dollar", fr: "Dollar américain" },
  { code: "EUR", en: "Euro", fr: "Euro" },
  { code: "GBP", en: "British Pound", fr: "Livre sterling" },
  { code: "CAD", en: "Canadian Dollar", fr: "Dollar canadien" },
  { code: "JOD", en: "Jordanian Dinar", fr: "Dinar jordanien" },
];

function extractStoragePath(publicUrl: string) {
  const marker = "/storage/v1/object/public/";
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.substring(index + marker.length);
}

export default function EditShowroomPage() {
  const router = useRouter();
  const params = useParams();
  const showroomId = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseClient();
  const { session, loading } = useSession();

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];
  const isAdmin = session?.role === "admin";

  /* FORM STATE (Updated to match table schema) */
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    markup_percent: 15,
    currency_code: "TND",
    active: true,
    notes: "",
    balance: 0,
    logo_url: null as string | null,
    receipt_footer_text: "",
    receipt_terms: "",
    legal_line_1: "",
    legal_line_2: "",
    legal_line_3: "",
    default_tax_percent: 19,
    tax_stamp_amount: 1.000,
  });

  /* UI STATE */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* 🔒 ACCESS + LOAD DATA */
  useEffect(() => {
    if (loading) return;

    if (!session) {
      router.replace("/auth/login");
      return;
    }

    if (
      session.role !== "admin" &&
      (session.role !== "manager" || session.showroom?.id !== showroomId)
    ) {
      router.replace("/dashboard");
      return;
    }

    const loadShowroom = async () => {
      try {
        const { data, error } = await supabase
          .from("showrooms")
          .select("*")
          .eq("id", showroomId)
          .single();

        if (error || !data) {
          router.replace("/showrooms");
          return;
        }

        setForm({
          ...data,
          name: data.name ?? "",
          address: data.address ?? "",
          phone: data.phone ?? "",
          notes: data.notes ?? "",
          legal_line_1: data.legal_line_1 ?? "",
          legal_line_2: data.legal_line_2 ?? "",
          legal_line_3: data.legal_line_3 ?? "",
          receipt_footer_text: data.receipt_footer_text ?? "",
          receipt_terms: data.receipt_terms ?? "",
          markup_percent: data.markup_percent ?? 0,
          default_tax_percent: data.default_tax_percent ?? 19,
          tax_stamp_amount: data.tax_stamp_amount ?? 1.000,
        });

        if (data.logo_url) setLogoPreview(data.logo_url);
        setLoadingData(false);
      } catch (err) {
        console.error("Failed to load showroom:", err);
        router.replace("/showrooms");
      }
    };

    loadShowroom();
  }, [loading, session, showroomId, supabase, router]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    setRemoveLogo(false);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  /* 💾 SAVE */
  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (form.name.trim().length < 3) {
      setError(t.validation?.name_required ?? (lang === "fr" ? "Nom requis (min 3 car.)" : "Name required (min 3 chars)"));
      return;
    }

    setSaving(true);
    let logoUrl = form.logo_url;

    /* 🧹 CLEANUP OLD LOGO */
    if ((removeLogo || logoFile) && form.logo_url) {
      const path = extractStoragePath(form.logo_url);
      if (path) await supabase.storage.from("showroom-logos").remove([path]);
    }

    /* ⬆️ UPLOAD NEW LOGO */
    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const fileName = `showroom-${showroomId}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("showroom-logos").upload(fileName, logoFile);
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("showroom-logos").getPublicUrl(fileName);
      logoUrl = data.publicUrl;
    }

    if (removeLogo && !logoFile) logoUrl = null;

    const { error: updateError } = await supabase
      .from("showrooms")
      .update({
        ...form,
        name: form.name.trim(),
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        legal_line_1: form.legal_line_1.trim() || null,
        legal_line_2: form.legal_line_2.trim() || null,
        legal_line_3: form.legal_line_3.trim() || null,
        receipt_footer_text: form.receipt_footer_text.trim() || null,
        receipt_terms: form.receipt_terms.trim() || null,
        logo_url: logoUrl,
        active: isAdmin ? form.active : undefined,
      })
      .eq("id", showroomId);

    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess(t.showrooms.updateSuccess ?? (lang === "fr" ? "Showroom mis à jour !" : "Showroom updated!"));
    setTimeout(() => setSuccess(null), 3000);
  };

  if (loading || !session || loadingData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-gray-100 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">{t.common.back}</span>
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            {t.showrooms.edit ?? (lang === "fr" ? "Modifier le Showroom" : "Edit Showroom")}
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex gap-3 animate-in fade-in"><AlertCircle /> {error}</div>}
        {success && <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 flex gap-3 animate-in fade-in"><CheckCircle /> {success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* General Info Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-700 pb-3">
                <Building className="h-5 w-5 text-blue-400" /> {t.showrooms.generalInfo ?? (lang === "fr" ? "Informations Générales" : "General Details")}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.name}*</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.phone}</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.address}</label>
                  <input className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Billing & Legal Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 border-b border-gray-700 pb-3">
                <Scale className="h-5 w-5 text-cyan-400" /> {lang === "fr" ? "Facturation & Légal" : "Billing & Legal"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.markup ?? "Markup %"}</label>
                  <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5" value={form.markup_percent} onChange={e => setForm({...form, markup_percent: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{lang === "fr" ? "TVA par défaut %" : "Default Tax %"}</label>
                  <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5" value={form.default_tax_percent} onChange={e => setForm({...form, default_tax_percent: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">{lang === "fr" ? "Timbre Fiscal" : "Tax Stamp"}</label>
                  <input type="number" step="0.001" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5" value={form.tax_stamp_amount} onChange={e => setForm({...form, tax_stamp_amount: Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-400">{lang === "fr" ? "Lignes Légales (Pied de page)" : "Legal Lines (Footer)"}</label>
                <input placeholder={t.showrooms.line1 ?? "Legal Line 1"} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_1} onChange={e => setForm({...form, legal_line_1: e.target.value})} />
                <input placeholder={t.showrooms.line2 ?? "Legal Line 2"} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_2} onChange={e => setForm({...form, legal_line_2: e.target.value})} />
                <input placeholder={t.showrooms.line3 ?? "Legal Line 3"} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_3} onChange={e => setForm({...form, legal_line_3: e.target.value})} />
              </div>
            </div>

            {/* Notes Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t.showrooms.notes ?? "Notes"}
              </label>
              <textarea rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>

          {/* Sidebar / Settings Area */}
          <div className="space-y-6">
            {/* Logo Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-300">{t.showrooms.logo ?? "Logo"}</h3>
              <div className="aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden mb-4">
                {!removeLogo && (logoPreview || form.logo_url) ? (
                  <img src={logoPreview || form.logo_url || ""} className="h-full w-full object-contain" alt="Preview" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="text-gray-600 h-10 w-10 mx-auto" />
                    <p className="text-[10px] text-gray-500 mt-1">{lang === "fr" ? "Pas de logo" : "No logo"}</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  {lang === "fr" ? "Choisir un fichier" : "Choose file"}
                </button>
                {form.logo_url && !removeLogo && (
                  <button onClick={() => { setRemoveLogo(true); setLogoFile(null); setLogoPreview(null); }} className="text-red-400 hover:text-red-300 text-[10px] flex items-center gap-1 justify-center py-1">
                    <Trash2 className="h-3 w-3" /> {lang === "fr" ? "Supprimer le logo actuel" : "Remove Current Logo"}
                  </button>
                )}
                {logoFile && <span className="text-[10px] text-blue-400 text-center truncate">{logoFile.name}</span>}
              </div>
            </div>

            {/* Financial Status Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.balance ?? "Balance"}</label>
                <div className="text-2xl font-mono text-cyan-400">
                  {form.balance.toFixed(3)} <span className="text-xs text-gray-500">{form.currency_code}</span>
                </div>
              </div>
              <hr className="border-gray-700" />
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.currency ?? "Currency"}</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none" value={form.currency_code} onChange={e => setForm({...form, currency_code: e.target.value})}>
                  {CURRENCIES.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {lang === "fr" ? c.fr : c.en}
                    </option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <span className="text-sm text-gray-300">{t.showrooms.active ?? "Active"}</span>
                  <button onClick={() => setForm({...form, active: !form.active})}>
                    {form.active ? <ToggleRight className="h-8 w-8 text-green-500" /> : <ToggleLeft className="h-8 w-8 text-gray-600" />}
                  </button>
                </div>
              )}
            </div>

            {/* Actions Card */}
            <div className="space-y-3">
              <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {t.common.save ?? (lang === "fr" ? "Enregistrer" : "Save Changes")}
              </button>
              <button onClick={() => router.back()} className="w-full bg-gray-800 text-gray-400 py-3 rounded-xl hover:bg-gray-700 transition-all text-sm">
                {t.common.cancel ?? (lang === "fr" ? "Annuler" : "Cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}