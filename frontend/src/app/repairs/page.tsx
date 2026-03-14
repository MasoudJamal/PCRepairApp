"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";

import { 
  Wrench, Search, Printer, Eye, Loader2, Phone, 
  User as UserIcon, ArrowLeft, X, Info, Smartphone, Package, AlertCircle, Building2
} from "lucide-react";

export default function RepairsPage() {
  const router = useRouter();
  const { session, loadingSession: sessionLoading } = useSession();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [showrooms, setShowrooms] = useState<any[]>([]); // For Admin filter
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShowroom, setSelectedShowroom] = useState<string>("all");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  const lang = session?.language === "FR" ? "FR" : "EN";

  const t = {
    EN: {
      title: "Repairs Tracking",
      back: "Dashboard",
      new: "New Intake",
      search: "Ref or Customer Phone...",
      ref: "Reference",
      cust: "Customer / Device",
      status: "Status",
      actions: "Actions",
      modalTitle: "Intake Details",
      preparedBy: "PREPARED BY",
      dateReceived: "DATE RECEIVED",
      custInfo: "CUSTOMER INFO",
      devDetails: "DEVICE DETAILS",
      prob: "REPORTED PROBLEM",
      acc: "ACCESSORIES",
      print: "Print Receipt",
      close: "Close",
      none: "None",
      serial: "S/N",
      allShowrooms: "All Showrooms",
      filterShowroom: "Filter by Showroom"
    },
    FR: {
      title: "Suivi des Réparations",
      back: "Tableau de Bord",
      new: "Nouvelle Entrée",
      search: "Réf ou Téléphone client...",
      ref: "Référence",
      cust: "Client / Appareil",
      status: "Statut",
      actions: "Actions",
      modalTitle: "Détails de la Réception",
      preparedBy: "PRÉPARÉ PAR",
      dateReceived: "DATE DE RÉCEPTION",
      custInfo: "INFOS CLIENT",
      devDetails: "DÉTAILS APPAREIL",
      prob: "PROBLÈME SIGNALÉ",
      acc: "ACCESSOIRES",
      print: "Imprimer Reçu",
      close: "Fermer",
      none: "Aucun",
      serial: "N° Série",
      allShowrooms: "Tous les Showrooms",
      filterShowroom: "Filtrer par Showroom"
    }
  };

  const fetchRepairs = useCallback(async () => {
	 
    if (!session) return; // Don't fetch if session isn't ready

    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
      let query = supabase
        .from('repairs')
        .select(`
          *, 
          customers (*), 
          devices (*),
          staff:profiles!repairs_user_id_fkey (full_name),
          showrooms (name)
        `);

      // Cast role to string to avoid TypeScript "no overlap" error
      const userRole = session.role as string;

      // 1. Logic for Global Roles
      if (userRole === 'admin' || userRole === 'technician') {
        if (selectedShowroom !== "all") {
          query = query.eq('showroom_id', selectedShowroom);
        }
      } 
      // 2. Logic for Showroom-bound roles
      else if (session.showroom?.id) {
        query = query.eq('showroom_id', session.showroom.id);
      } 
      else {
        // If no showroom and not admin, return empty
        setRepairs([]);
        setLoading(false);
        return;
      }
	// --- 2. NOW EXECUTE AND LOG ---
      const { data, error } = await query.order('received_at', { ascending: false });
      
      console.log("DEBUG: Current Showroom ID used in filter:", session.showroom?.id);
      console.log("DEBUG: Supabase Data length:", data?.length);
      console.log("DEBUG: Supabase Error:", error);
// end debug	  

      const { data, error } = await query.order('received_at', { ascending: false });

      if (error) throw error;
      setRepairs(data || []);
    } catch (error: any) {
      console.error("Fetch Error:", error.message);
    } finally {
      setLoading(false);
    }
  }, [session, selectedShowroom]);

  // Fetch Showrooms for Admin dropdown
  useEffect(() => {
    if (session?.role === 'admin') {
      const fetchShowrooms = async () => {
        const supabase = createSupabaseClient();
        const { data } = await supabase.from('showrooms').select('id, name');
        if (data) setShowrooms(data);
      };
      fetchShowrooms();
    }
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.replace("/auth/login");
      return;
    }
    fetchRepairs();
  }, [sessionLoading, session, fetchRepairs]);

  const filteredRepairs = repairs.filter((r: any) => 
    r.repair_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customers?.phone?.includes(searchTerm)
  );

  if (sessionLoading || loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      {/* Print Styles remain the same... */}
      <div className="p-4 md:p-8 pt-24 max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft /></button>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Wrench className="text-blue-400" /> {t[lang].title}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={() => router.push('/repairs/new')} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold shadow-lg">
                + {t[lang].new}
             </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t[lang].search} 
              className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-xl" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          {/* Admin Showroom Filter */}
          {session?.role === 'admin' && (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <select
                value={selectedShowroom}
                onChange={(e) => setSelectedShowroom(e.target.value)}
                className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
              >
                <option value="all">{t[lang].allShowrooms}</option>
                {showrooms.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Table remains largely same, added showroom info for Admin */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="border-b border-gray-700/50 bg-gray-900/50 uppercase text-[10px] tracking-widest text-gray-500">
              <tr>
                <th className="p-4">{t[lang].ref}</th>
                <th className="p-4">{t[lang].cust}</th>
                {session?.role === 'admin' && <th className="p-4">Showroom</th>}
                <th className="p-4">{t[lang].status}</th>
                <th className="p-4 text-right">{t[lang].actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filteredRepairs.map((repair: any) => (
                <tr key={repair.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 font-mono text-blue-400 font-bold">{repair.repair_ref}</td>
                  <td className="p-4">
                    <div className="font-semibold flex items-center gap-2 text-gray-200"><UserIcon className="w-3 h-3" /> {repair.customers?.full_name}</div>
                    <div className="text-xs text-gray-400">{repair.customers?.phone}</div>
                    <div className="text-[10px] text-blue-300/60 mt-1 uppercase">{repair.devices?.model}</div>
                  </td>
                  {session?.role === 'admin' && (
                    <td className="p-4 text-xs text-gray-400">{repair.showrooms?.name}</td>
                  )}
                  <td className="p-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                      {repair.repair_phase}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setSelectedRepair(repair); setShowModal(true); }} 
                      className="p-2 bg-gray-700/50 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- INTAKE DETAILS MODAL --- (Unchanged, already supports printing) */}
      {/* ... keep modal code as is ... */}
    </div>
  );
}