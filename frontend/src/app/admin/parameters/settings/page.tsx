"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { 
  ArrowLeft, Save, Globe, Mail, Building, Link as LinkIcon, 
  Loader2, Camera, Upload, Phone, MessageSquare, MapPin, 
  Coins, Percent, ReceiptText 
} from "lucide-react";

export default function GeneralSettings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // 1. Updated state to include all new table columns
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
    if (data) setFormData(data);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      setFormData({ ...formData, logo_url: data.publicUrl });
    } catch (error) {
      alert("Error uploading image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("settings").update(formData).eq("id", 1);
    
    if (!error) alert(lang === "fr" ? "Enregistré !" : "Saved!");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 p-8 pt-24 text-white">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> {lang === "fr" ? "Retour" : "Back"}
        </button>

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Globe className="text-pink-500" />
          {lang === "fr" ? "Paramètres Généraux" : "General Settings"}
        </h1>

        <form onSubmit={handleSave} className="space-y-8 bg-gray-900/50 p-8 rounded-2xl border border-gray-800 backdrop-blur-sm">
          
          {/* LOGO UPLOAD SECTION */}
          <div className="flex flex-col items-center mb-8 pb-8 border-b border-gray-800">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-40 h-40 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-all overflow-hidden bg-gray-800 group"
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center text-gray-500">
                  <Upload className="mx-auto mb-2 group-hover:text-pink-500 transition-colors" />
                  <span className="text-xs uppercase font-bold tracking-wider">Logo</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Company Info */}
            <div className="space-y-4">
              <h3 className="text-pink-500 font-semibold text-sm uppercase tracking-widest">{lang === 'fr' ? 'Informations' : 'Company Info'}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Nom de l'entreprise" : "Company Name"}</label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="text" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Adresse" : "Address"}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="text" value={formData.address || ''} onChange={(e) => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <h3 className="text-pink-500 font-semibold text-sm uppercase tracking-widest">{lang === 'fr' ? 'Contact' : 'Contact Details'}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Téléphone" : "Phone"}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="text" value={formData.phone || ''} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">WhatsApp</label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="text" value={formData.whatsapp || ''} onChange={(e) => setFormData({...formData, whatsapp: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-4">
              <h3 className="text-pink-500 font-semibold text-sm uppercase tracking-widest">{lang === 'fr' ? 'Finances' : 'Financials'}</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Devise" : "Currency"}</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input type="text" value={formData.currency || ''} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Taux TVA (%)" : "Tax Rate (%)"}</label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                    <input type="number" step="0.01" value={formData.tax_rate} onChange={(e) => setFormData({...formData, tax_rate: parseFloat(e.target.value)})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Timbre Fiscal" : "Invoice Stamp"}</label>
                <div className="relative">
                  <ReceiptText className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="number" step="0.1" value={formData.inv_stamp} onChange={(e) => setFormData({...formData, inv_stamp: parseFloat(e.target.value)})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Links */}
            <div className="space-y-4">
              <h3 className="text-pink-500 font-semibold text-sm uppercase tracking-widest">{lang === 'fr' ? 'Liens' : 'Links'}</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Email Support" : "Support Email"}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="email" value={formData.support_email || ''} onChange={(e) => setFormData({...formData, support_email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "URL de Suivi" : "Tracking URL"}</label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input type="url" value={formData.tracking_url} onChange={(e) => setFormData({...formData, tracking_url: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none transition-all" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-800">
            <button type="submit" disabled={saving || uploading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-pink-900/20 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {lang === "fr" ? "Enregistrer les modifications" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}