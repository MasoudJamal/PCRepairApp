"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { useSession } from "@/context/SessionContext";
import { ArrowLeft, Save, Globe, Mail, Building, Link as LinkIcon, Loader2, Camera, Upload } from "lucide-react";

export default function GeneralSettings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    support_email: "",
    tracking_url: "",
    logo_url: "",
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

      // 1. Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
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
      <div className="max-w-2xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} /> {lang === "fr" ? "Retour" : "Back"}
        </button>

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Globe className="text-pink-500" />
          {lang === "fr" ? "Paramètres Généraux" : "General Settings"}
        </h1>

        <form onSubmit={handleSave} className="space-y-6 bg-gray-900/50 p-8 rounded-2xl border border-gray-800">
          
          {/* LOGO UPLOAD SECTION */}
          <div className="flex flex-col items-center mb-8">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-pink-500 transition-all overflow-hidden bg-gray-800"
            >
              {formData.logo_url ? (
                <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-center text-gray-500">
                  <Upload className="mx-auto mb-2" />
                  <span className="text-xs">Upload Logo</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "Nom de l'entreprise" : "Company Name"}</label>
            <div className="relative">
              <Building className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input type="text" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">{lang === "fr" ? "URL de Suivi" : "Tracking URL"}</label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input type="url" value={formData.tracking_url} onChange={(e) => setFormData({...formData, tracking_url: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
          </div>

          <button type="submit" disabled={saving || uploading} className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
            {lang === "fr" ? "Enregistrer" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
