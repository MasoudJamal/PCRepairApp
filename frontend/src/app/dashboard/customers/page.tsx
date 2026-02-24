"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext"; 
import { I18N } from "@/lib/i18n";
import { 
  ArrowLeft, UserPlus, Phone, Edit2, Loader2, 
  Mail, MapPin, Building2, Filter, Trash2 
} from "lucide-react";

export default function CustomersPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { session } = useSession();
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [showrooms, setShowrooms] = useState<any[]>([]); 
  const [filterShowroom, setFilterShowroom] = useState<string>("all");
  const [showModal, setShowModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "", 
    phone: "", 
    email: "", 
    address: "", 
    showroom_id: "", 
    whatsapp_available: true,
    balance: 0 // 👈 Add this
  });

  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang] ?? I18N.en;
  const isAdmin = session?.role === "admin";
  const isManager = session?.role === "manager";
  const canDelete = isAdmin || isManager;

  useEffect(() => {
    async function fetchShowrooms() {
      const { data } = await supabase.from("showrooms").select("id, name").order("name");
      if (data) setShowrooms(data);
    }
    if (isAdmin) fetchShowrooms();
  }, [isAdmin, supabase]);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("customers").select(`*, showrooms(name)`).order("full_name");
    
    if (isAdmin) {
      if (filterShowroom !== "all") query = query.eq("showroom_id", filterShowroom);
    } else if (session?.showroom?.id) {
      query = query.eq("showroom_id", session.showroom.id);
    }

    const { data } = await query;
    setCustomers(data || []);
    setLoading(false);
  }, [isAdmin, filterShowroom, session, supabase]);

  useEffect(() => {
    if (session) fetchCustomers();
  }, [session, fetchCustomers]);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      full_name: "", phone: "", email: "", address: "",
      showroom_id: isAdmin ? "" : (session?.showroom?.id || ""),
	  whatsapp_available: true,
	  balance: 0
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  async function handleDelete(id: string, name: string) {
    const confirmMsg = lang === 'fr' 
      ? `Êtes-vous sûr de vouloir supprimer le client "${name}" ?` 
      : `Are you sure you want to delete customer "${name}"?`;
    
    if (!window.confirm(confirmMsg)) return;

    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (!error) fetchCustomers();
    else alert(error.message);
  }

  async function handleSave() {
  // 1. Precise Validation: Check for name, phone, and showroom
  // .trim() ensures they didn't just type spaces
  const isPhoneValid = formData.phone && formData.phone.trim().length > 0;
  const isNameValid = formData.full_name && formData.full_name.trim().length > 0;
  const isShowroomValid = formData.showroom_id && formData.showroom_id.length > 0;

  if (!isNameValid || !isPhoneValid || !isShowroomValid) {
    const errorMsg = lang === 'fr' 
      ? "Le nom, le numéro de téléphone et le showroom sont obligatoires." 
      : "Full Name, Phone Number, and Showroom are required.";
    alert(errorMsg);
    return;
  }

  setIsSaving(true);
  
  // Clean data for Supabase (removing the join object)
  const { showrooms, ...cleanData } = formData as any;

  const { error } = editingId 
    ? await supabase.from("customers").update(cleanData).eq("id", editingId)
    : await supabase.from("customers").insert([cleanData]);

  if (!error) {
    closeModal();
    fetchCustomers();
  } else {
    // Handle Duplicate Phone Error (Postgres Error 23505)
    if (error.code === '23505') {
      alert(lang === 'fr' 
        ? "Ce numéro de téléphone est déjà enregistré pour un autre client." 
        : "This phone number is already registered for another customer.");
    } else {
      alert(error.message);
    }
  }
  setIsSaving(false);
}

  return (
    <div className="min-h-screen bg-gray-950 p-8 pt-24 text-white">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6">
          <ArrowLeft className="h-4 w-4" /> {t.common?.back || (lang === 'fr' ? "Retour" : "Back")}
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">{lang === 'fr' ? "Base de Données Clients" : "Customer Database"}</h1>
            <p className="text-gray-500 text-sm">
              {isAdmin ? (lang === 'fr' ? "Vue globale" : "Global view") : `${t.dashboard?.showroom || "Showroom"}: ${session?.showroom?.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select 
                  value={filterShowroom} 
                  onChange={(e) => setFilterShowroom(e.target.value)}
                  className="bg-transparent outline-none text-sm text-white cursor-pointer"
                >
                  <option value="all" className="text-black">{lang === 'fr' ? "Tous les showrooms" : "All Showrooms"}</option>
                  {showrooms.map(s => <option key={s.id} value={s.id} className="text-black">{s.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={openCreateModal} className="bg-emerald-600 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-700">
              <UserPlus className="h-5 w-5" /> {lang === 'fr' ? "Nouveau Client" : "New Customer"}
            </button>
          </div>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl w-full max-w-md shadow-2xl">
              <h2 className="text-xl font-bold mb-6 text-emerald-400">
                {editingId ? (lang === 'fr' ? 'Modifier' : 'Edit') : (lang === 'fr' ? 'Créer' : 'Create')} {lang === 'fr' ? 'Client' : 'Customer'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{lang === 'fr' ? 'Showroom' : 'Showroom'}</label>
                  {isAdmin ? (
                    <select 
                      disabled={!!editingId} 
                      value={formData.showroom_id} 
                      onChange={e => setFormData({...formData, showroom_id: e.target.value})} 
                      className={`w-full bg-gray-800 border p-3 rounded-lg text-white ${editingId ? 'border-gray-700 opacity-50 cursor-not-allowed' : 'border-gray-600'}`}
                    >
                      <option value="" className="text-black">{lang === 'fr' ? 'Sélectionner...' : 'Select...'}</option>
                      {showrooms.map(s => <option key={s.id} value={s.id} className="text-white">{s.name}</option>)}
                    </select>
                  ) : (
                    <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700 text-gray-300">
                      {session?.showroom?.name}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{lang === 'fr' ? "Nom Complet" : "Full Name"}</label>
                  <input value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:border-blue-500 outline-none" />
                </div>
              
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">
                      {lang === 'fr' ? 'Téléphone' : 'Phone Number'} 
                      <span className="text-red-500 ml-1">*</span> {/* 👈 Red asterisk */}
                    </label>
                    <input 
                      required // 👈 HTML5 validation
                      value={formData.phone} 
                      onChange={e => setFormData({...formData, phone: e.target.value})} 
                      className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:border-blue-500 outline-none" 
                    />
                  </div>
				  
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">Email ({lang === 'fr' ? 'Optionnel' : 'Optional'})</label>
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:border-blue-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">{lang === 'fr' ? 'Adresse' : 'Address'}</label>
                  <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-gray-800 border border-gray-700 p-3 rounded-lg focus:border-blue-500 outline-none h-20 resize-none" />
                </div>
				
				<div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📱</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-none">WhatsApp</p>
                      <p className="text-[10px] text-gray-500 uppercase">
                        {lang === 'fr' ? 'Autoriser messages' : 'Allow messages'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, whatsapp_available: !formData.whatsapp_available })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${formData.whatsapp_available ? 'bg-green-600' : 'bg-gray-600'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${formData.whatsapp_available ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>
				
				{/* Balance Field */}
<div>
  <label className="text-xs text-gray-500 mb-1 block font-bold uppercase">
    {lang === 'fr' ? 'Solde (TND)' : 'Balance (TND)'}
  </label>
  <div className="relative">
    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">DT</span>
    <input 
      type="number" 
      step="0.001"
      value={formData.balance} 
      onChange={e => setFormData({...formData, balance: parseFloat(e.target.value) || 0})} 
      className={`w-full bg-gray-800 border border-gray-700 pl-10 pr-3 py-3 rounded-lg focus:border-blue-500 outline-none font-mono ${
        formData.balance < 0 ? 'text-red-400' : 'text-green-400'
      }`} 
    />
  </div>
  <p className="text-[10px] text-gray-600 mt-1 uppercase italic">
    {lang === 'fr' ? 'Négatif = Doit de l\'argent' : 'Negative = Owes money'}
  </p>
</div>
				
                <div className="flex gap-3 pt-4">
                  <button onClick={handleSave} className="flex-grow bg-blue-600 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                    {isSaving ? <Loader2 className="animate-spin mx-auto h-5 w-5"/> : (lang === 'fr' ? "Enregistrer" : "Save")}
                  </button>
                  <button onClick={closeModal} className="bg-gray-800 px-6 rounded-lg font-bold hover:bg-gray-700">
                    {lang === 'fr' ? 'Annuler' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customers.map(c => (
              <div key={c.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl relative group hover:border-blue-500/50 transition-all">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button 
  onClick={() => { 
    setEditingId(c.id); 
    setFormData({
      full_name: c.full_name || "",
      phone: c.phone || "",
      email: c.email || "",      // 👈 Added fallback to empty string
      address: c.address || "",    // 👈 Added fallback to empty string
      showroom_id: c.showroom_id || "",
      whatsapp_available: c.whatsapp_available ?? true,	  // 👈 Fallback for existing nulls
	  balance: c.balance || 0
    }); 
    setShowModal(true); 
  }} 
  className="p-2 bg-gray-800 rounded-lg hover:text-blue-400"
>
  <Edit2 className="h-4 w-4" />
</button>
                  {canDelete && (
                    <button onClick={() => handleDelete(c.id, c.full_name)} className="p-2 bg-gray-800 rounded-lg hover:text-red-500 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold uppercase">{c.full_name?.charAt(0)}</div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{c.full_name}</h3>
                    {isAdmin && <div className="flex items-center gap-1 text-[10px] text-orange-400 font-bold mt-1 uppercase"><Building2 className="h-3 w-3" /> {c.showrooms?.name}</div>}
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
				{/* Balance Display */}
<div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-800/50">
  <span className="text-[10px] uppercase font-bold text-gray-500">{lang === 'fr' ? 'Solde' : 'Balance'}</span>
  <span className={`font-mono font-bold text-lg ${
    c.balance < 0 ? 'text-red-500' : c.balance > 0 ? 'text-emerald-500' : 'text-gray-400'
  }`}>
    {c.balance?.toLocaleString(undefined, { minimumFractionDigits: 3 })} DT
  </span>
</div>
                  {/* Updated Phone Line with WhatsApp Badge */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-600" /> 
                      <span>{c.phone}</span>
                    </div>
    
                    {/* Small badge to show status at a glance */}
                    {c.whatsapp_available ? (
                      <span className="text-[9px] bg-green-500/10 text-green-500 border border-green-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        WA OK
                      </span>
                    ) : (
                      <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">
                        No WA
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-gray-600" /> {c.email || "—"}</div>
                  <div className="flex items-center gap-3"><MapPin className="h-4 w-4 text-gray-600" /> {c.address || "—"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}