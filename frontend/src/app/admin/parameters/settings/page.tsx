"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { 
  ArrowLeft, Save, Globe, Mail, Building, Link as LinkIcon, 
  Loader2, Camera, Upload, Phone, MessageSquare, MapPin, 
  Coins, Percent, ReceiptText, Check, AlertCircle, 
  Smartphone, Store, CreditCard, Settings as SettingsIcon,
  Image as ImageIcon, X, RefreshCw, HelpCircle
} from "lucide-react";

export default function GeneralSettings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    company_name: "",
    support_email: "",
    tracking_url: "",
    logo_url: "",
    phone: "",
    whatsapp: "",
    address: "",
    currency: "TND",
    tax_rate: 0,
    inv_stamp: 0,
  });

  useEffect(() => {
    if (session?.role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchSettings();
  }, [session]);

  const fetchSettings = async () => {
    const { data } = await supabase.from("settings").select("*").eq("id", 1).single();
    if (data) {
      setFormData(data);
      setLogoPreview(data.logo_url);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      setFormData({ ...formData, logo_url: data.publicUrl });
    } catch (error) {
      alert(lang === "fr" ? "Erreur lors du téléchargement" : "Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    
    const { error } = await supabase.from("settings").update(formData).eq("id", 1);
    
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
    
    setSaving(false);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData({ ...formData, logo_url: "" });
  };

  const tabs = [
    { id: "company", label: lang === "fr" ? "Entreprise" : "Company", icon: Building },
    { id: "contact", label: lang === "fr" ? "Contact" : "Contact", icon: Phone },
    { id: "financial", label: lang === "fr" ? "Finances" : "Financial", icon: Coins },
    { id: "links", label: lang === "fr" ? "Liens" : "Links", icon: LinkIcon },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <SettingsIcon className="w-8 h-8 text-indigo-400 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-slate-400 text-lg font-medium">
            {lang === "fr" ? "Chargement des paramètres..." : "Loading settings..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
        {/* Header with gradient */}
        <div className="mb-8">
          <button 
            onClick={() => router.back()} 
            className="group inline-flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all duration-200 mb-6 border border-white/10"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> 
            {lang === "fr" ? "Retour" : "Back"}
          </button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/25">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {lang === "fr" ? "Paramètres Généraux" : "General Settings"}
                </h1>
                <p className="text-slate-400">
                  {lang === "fr" 
                    ? "Gérez les paramètres globaux de votre application" 
                    : "Manage your application's global settings"}
                </p>
              </div>
            </div>
            
            {/* Save indicator */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400">
                <Check size={18} />
                <span className="font-medium">
                  {lang === "fr" ? "Modifications enregistrées !" : "Changes saved!"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs navigation */}
        <div className="mb-8 border-b border-white/10">
          <div className="flex overflow-x-auto scrollbar-hide gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-400"
                      : "border-transparent text-slate-400 hover:text-slate-300"
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Main content card */}
          <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Logo section - Full width at top */}
            <div className="p-8 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Logo preview with upload area */}
                <div className="relative group">
                  <div className="w-28 h-28 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-dashed border-white/20 flex items-center justify-center overflow-hidden transition-all group-hover:border-indigo-500/50">
                    {logoPreview ? (
                      <img 
                        src={logoPreview} 
                        alt="Logo" 
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-slate-500" />
                    )}
                  </div>
                  
                  {/* Overlay actions */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-xl">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                      title={lang === "fr" ? "Changer le logo" : "Change logo"}
                    >
                      <Camera size={18} className="text-white" />
                    </button>
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="p-2 bg-red-600 rounded-lg hover:bg-red-500 transition-colors ml-2"
                        title={lang === "fr" ? "Supprimer le logo" : "Remove logo"}
                      >
                        <X size={18} className="text-white" />
                      </button>
                    )}
                  </div>

                  {uploading && (
                    <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white mb-1">
                    {lang === "fr" ? "Logo de l'entreprise" : "Company Logo"}
                  </h3>
                  <p className="text-sm text-slate-400 mb-3">
                    {lang === "fr" 
                      ? "Téléchargez un logo pour votre entreprise (PNG, JPG, SVG jusqu'à 2MB)" 
                      : "Upload your company logo (PNG, JPG, SVG up to 2MB)"}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-medium text-sm transition-colors inline-flex items-center gap-2"
                    >
                      <Upload size={16} />
                      {uploading 
                        ? (lang === "fr" ? "Téléchargement..." : "Uploading...") 
                        : (lang === "fr" ? "Choisir un fichier" : "Choose file")}
                    </button>
                    {logoPreview && (
                      <span className="text-sm text-slate-400 self-center">
                        {formData.logo_url ? "✓ " + (lang === "fr" ? "Logo téléchargé" : "Logo uploaded") : ""}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Tab content */}
            <div className="p-8">
              {/* Company Info Tab */}
              {activeTab === "company" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Nom de l'entreprise" : "Company Name"} <span className="text-red-400">*</span>
                      </label>
                      <div className="relative group">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          value={formData.company_name} 
                          onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="Acme Inc."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Adresse" : "Address"}
                      </label>
                      <div className="relative group">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          value={formData.address || ''} 
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="123 Main St, City"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Tab */}
              {activeTab === "contact" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Téléphone" : "Phone"}
                      </label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="tel" 
                          value={formData.phone || ''} 
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="+216 12 345 678"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">WhatsApp</label>
                      <div className="relative group">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="tel" 
                          value={formData.whatsapp || ''} 
                          onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="+216 12 345 678"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Financial Tab */}
              {activeTab === "financial" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Devise" : "Currency"}
                      </label>
                      <div className="relative group">
                        <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          value={formData.currency || ''} 
                          onChange={(e) => setFormData({...formData, currency: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="TND"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Taux TVA (%)" : "Tax Rate (%)"}
                      </label>
                      <div className="relative group">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="number" 
                          step="0.01" 
                          min="0"
                          max="100"
                          value={formData.tax_rate} 
                          onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value)})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="19"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Timbre Fiscal" : "Invoice Stamp"}
                      </label>
                      <div className="relative group">
                        <ReceiptText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="number" 
                          step="0.1" 
                          min="0"
                          value={formData.inv_stamp} 
                          onChange={(e) => setFormData({...formData, inv_stamp: parseFloat(e.target.value)})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="0.5"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Links Tab */}
              {activeTab === "links" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "Email Support" : "Support Email"}
                      </label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="email" 
                          value={formData.support_email || ''} 
                          onChange={(e) => setFormData({...formData, support_email: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="support@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
                        {lang === "fr" ? "URL de Suivi" : "Tracking URL"}
                      </label>
                      <div className="relative group">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="url" 
                          value={formData.tracking_url} 
                          onChange={(e) => setFormData({...formData, tracking_url: e.target.value})}
                          className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                          placeholder="https://track.example.com"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Save button with enhanced UX */}
          <div className="flex items-center justify-end gap-4 sticky bottom-6">
            <button
              type="button"
              onClick={() => fetchSettings()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
              {lang === "fr" ? "Réinitialiser" : "Reset"}
            </button>
            
            <button 
              type="submit" 
              disabled={saving || uploading} 
              className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-w-[180px] justify-center"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {lang === "fr" ? "Enregistrement..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save size={18} />
                  {lang === "fr" ? "Enregistrer les modifications" : "Save Changes"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}