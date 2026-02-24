"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { 
  ArrowLeft, 
  Save, 
  Building, 
  Phone, 
  Image as ImageIcon,
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText,
  ToggleLeft,
  ToggleRight,
  Scale
} from "lucide-react";

/* ISO CURRENCIES */
const CURRENCIES = [
  { code: "TND", en: "Tunisian Dinar", fr: "Dinar tunisien" },
  { code: "USD", en: "US Dollar", fr: "Dollar américain" },
  { code: "EUR", en: "Euro", fr: "Euro" },
  { code: "GBP", en: "British Pound", fr: "Livre sterling" },
  { code: "CAD", en: "Canadian Dollar", fr: "Dollar canadien" },
  { code: "JOD", en: "Jordanian Dinar", fr: "Dinar jordanien" },
];

export default function CreateShowroomPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { session, loading } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  /* FORM STATE */
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    markup_percent: 15,
    currency_code: "TND",
    active: true,
    notes: "",
    receipt_footer_text: "",
    receipt_terms: "",
    legal_line_1: "",
    legal_line_2: "",
    legal_line_3: "",
    default_tax_percent: 19,
    tax_stamp_amount: 1.000,
  });

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ADMIN ONLY */
  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/auth/login");
      return;
    }
    if (session.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (form.name.trim().length < 3) {
      setError(t.validation?.name_required ?? (lang === "fr" ? "Nom trop court" : "Name too short"));
      return;
    }

    setSaving(true);
    let logoUrl: string | null = null;

    if (logoFile) {
      const ext = logoFile.name.split(".").pop();
      const fileName = `showroom-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("showroom-logos").upload(fileName, logoFile);
      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }
      const { data } = supabase.storage.from("showroom-logos").getPublicUrl(fileName);
      logoUrl = data.publicUrl;
    }

    const { error: insertError } = await supabase.from("showrooms").insert({
      ...form,
      name: form.name.trim(),
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      legal_line_1: form.legal_line_1.trim() || null,
      legal_line_2: form.legal_line_2.trim() || null,
      legal_line_3: form.legal_line_3.trim() || null,
      receipt_footer_text: form.receipt_footer_text.trim() || null,
      receipt_terms: form.receipt_terms.trim() || null,
      logo_url: logoUrl,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setSuccess(t.showrooms.createSuccess ?? (lang === "fr" ? "Showroom créé !" : "Showroom created!"));
    setTimeout(() => router.push("/showrooms"), 2000);
  };

  if (loading || !session) return null;

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
            {t.showrooms.create ?? (lang === "fr" ? "Créer un Showroom" : "Create Showroom")}
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 flex gap-3"><AlertCircle /> {error}</div>}
        {success && <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300 flex gap-3"><CheckCircle /> {success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* General Information */}
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

            {/* Billing & Legal */}
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
                <input placeholder={t.showrooms.line1} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_1} onChange={e => setForm({...form, legal_line_1: e.target.value})} />
                <input placeholder={t.showrooms.line2} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_2} onChange={e => setForm({...form, legal_line_2: e.target.value})} />
                <input placeholder={t.showrooms.line3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2" value={form.legal_line_3} onChange={e => setForm({...form, legal_line_3: e.target.value})} />
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" /> {t.showrooms.notes ?? (lang === "fr" ? "Notes Internes" : "Internal Notes")}
              </label>
              <textarea rows={3} className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Logo Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
              <h3 className="text-sm font-semibold mb-4 text-gray-300">
                {t.showrooms.logo ?? (lang === "fr" ? "Logo du Showroom" : "Showroom Logo")}
              </h3>
              <div className="aspect-video bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 flex items-center justify-center overflow-hidden mb-4">
                {logoPreview ? (
                  <img src={logoPreview} className="h-full w-full object-contain" alt="Preview" />
                ) : (
                  <div className="text-center">
                    <ImageIcon className="text-gray-600 h-10 w-10 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">{lang === "fr" ? "Aucun logo sélectionné" : "No logo selected"}</p>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                  {lang === "fr" ? "Choisir un logo" : "Choose logo"}
                </button>
                <span className="text-[11px] text-gray-400 truncate max-w-[120px]">
                  {logoFile && <span className="text-[11px] text-gray-400">{logoFile.name}</span>}
                </span>
              </div>
              <p className="mt-4 text-[10px] text-gray-500 italic">
                {t.showrooms.logoHint ?? (lang === "fr" ? "Format carré recommandé, max 500Ko" : "Recommended: Square, max 500Kb")}
              </p>
            </div>

            {/* Settings Card */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.showrooms.currency ?? (lang === "fr" ? "Devise" : "Currency")}</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2" value={form.currency_code} onChange={e => setForm({...form, currency_code: e.target.value})}>
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {lang === "fr" ? c.fr : c.en}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-gray-300">{t.showrooms.active ?? (lang === "fr" ? "Actif" : "Active")}</span>
                <button onClick={() => setForm({...form, active: !form.active})}>
                  {form.active ? <ToggleRight className="h-8 w-8 text-green-500" /> : <ToggleLeft className="h-8 w-8 text-gray-600" />}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50">
                {saving ? <Loader2 className="animate-spin" /> : <Save />}
                {t.common.save ?? (lang === "fr" ? "Créer le Showroom" : "Create Showroom")}
              </button>
              <button onClick={() => router.back()} className="w-full bg-gray-800 text-gray-400 py-3 rounded-xl hover:bg-gray-700 transition-all">
                {t.common.cancel ?? (lang === "fr" ? "Annuler" : "Cancel")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}