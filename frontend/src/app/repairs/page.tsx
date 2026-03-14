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
  const [showrooms, setShowrooms] = useState<any[]>([]);
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
    if (!session) return; 

    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
      // FIX: Simplified the select to avoid the 'relationship' error
      let query = supabase
        .from('repairs')
        .select(`
          *, 
          customers (*), 
          devices (*),
          staff:profiles (full_name),
          showrooms (name)
        `);

      const userRole = session.role as string;

      if (userRole === 'admin' || userRole === 'technician') {
        if (selectedShowroom !== "all") {
          query = query.eq('showroom_id', selectedShowroom);
        }
      } else if (session.showroom?.id) {
        query = query.eq('showroom_id', session.showroom.id);
      } else {
        setRepairs([]);
        setLoading(false);
        return;
      }

      const { data: result, error: fetchErr } = await query.order('received_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setRepairs(result || []);
    } catch (err: any) {
      console.error("Fetch Error:", err.message);
    } finally {
      setLoading(false);
    }
  }, [session, selectedShowroom]);

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
      <div className="p-4 md:p-8 pt-24 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft /></button>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Wrench className="text-blue-400" /> {t[lang].title}</h1>
          </div>
          <button onClick={() => router.push('/repairs/new')} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold shadow-lg">
            + {t[lang].new}
          </button>
        </div>

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

      {/* MODAL SECTION - Added back and fixed */}
      {showModal && selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info className="text-blue-400" /> {t[lang].modalTitle}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-gray-500 mb-1">{t[lang].ref}</p>
                <p className="text-xl font-mono font-bold text-blue-400">{selectedRepair.repair_ref}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 mb-1">{t[lang].preparedBy}</p>
                <p className="text-white font-semibold">{selectedRepair.staff?.full_name || "Staff"}</p>
              </div>
              <div className="md:col-span-2 bg-gray-800/50 p-4 rounded-xl border border-gray-700/30">
                <div className="flex items-center gap-3 mb-2">
                  <UserIcon className="text-blue-400 w-4 h-4" />
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t[lang].custInfo}</span>
                </div>
                <p className="font-bold text-lg">{selectedRepair.customers?.full_name}</p>
                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1"><Phone className="w-3 h-3" /> {selectedRepair.customers?.phone}</p>
              </div>
            </div>

            <div className="p-6 pt-0 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-6 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-all font-bold">
                {t[lang].close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
