"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";

import { 
  Wrench, Search, Printer, Eye, Loader2, Phone, 
  User as UserIcon, ArrowLeft, X, Info, Smartphone, Package, AlertCircle, Building2, Filter
} from "lucide-react";

export default function RepairsPage() {
  const router = useRouter();
  const { session, loadingSession: sessionLoading } = useSession();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [showrooms, setShowrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
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
      allStatus: "All Statuses"
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
      allStatus: "Tous les Statuts"
    }
  };

  const fetchRepairs = useCallback(async () => {
    if (!session) return; 

    try {
      setLoading(true);
      const supabase = createSupabaseClient();
      
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

  const filteredRepairs = repairs.filter((r: any) => {
    const matchesSearch = r.repair_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.customers?.phone?.includes(searchTerm);
    const matchesStatus = selectedStatus === "all" || r.repair_phase === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (sessionLoading || loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      <div className="p-4 md:p-8 pt-24 max-w-7xl mx-auto no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft /></button>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Wrench className="text-blue-400" /> {t[lang].title}</h1>
          </div>
          <button onClick={() => router.push('/repairs/new')} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold shadow-lg">
            + {t[lang].new}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t[lang].search} 
              className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 outline-none appearance-none"
            >
              <option value="all">{t[lang].allStatus}</option>
              <option value="intake">Intake</option>
              <option value="diagnostic">Diagnostic</option>
              <option value="repairing">Repairing</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {session?.role === 'admin' && (
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
              <select
                value={selectedShowroom}
                onChange={(e) => setSelectedShowroom(e.target.value)}
                className="w-full bg-gray-800/40 border border-gray-700/50 rounded-xl py-3 pl-10 pr-4 outline-none appearance-none"
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
				<th className="p-4">Showroom</th>
                <th className="p-4">{t[lang].status}</th>
                <th className="p-4 text-right">{t[lang].actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/30">
              {filteredRepairs.map((repair: any) => (
                <tr key={repair.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-mono text-blue-400 font-bold">{repair.repair_ref}</td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-200">{repair.customers?.full_name}</div>
                    <div className="text-xs text-gray-400">{repair.devices?.model}</div>
                  </td>
                  {/* Added the TD below */}
                  <td className="p-4 text-xs text-gray-400 font-medium">
                    {repair.showrooms?.name || "—"}
                  </td>
                  <td className="p-4">
                    <span className="text-[10px] ...">
                      {repair.repair_phase}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => { setSelectedRepair(repair); setShowModal(true); }} 
                      className="p-2 bg-gray-700/50 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white"
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

      {/* DETAILED MODAL */}
      {showModal && selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl modal-box">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info className="text-blue-400" /> {t[lang].modalTitle}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-white"><X /></button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t[lang].ref}</p>
                <p className="text-2xl font-mono font-bold text-blue-400">{selectedRepair.repair_ref}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t[lang].dateReceived}</p>
                <p className="font-bold">{new Date(selectedRepair.received_at).toLocaleDateString()}</p>
              </div>

              <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-800/30 p-4 rounded-xl border border-gray-700/30">
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">{t[lang].custInfo}</p>
                  <p className="font-bold text-base">{selectedRepair.customers?.full_name}</p>
                  <p className="text-gray-400">{selectedRepair.customers?.phone}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 mb-1">{t[lang].devDetails}</p>
                  <p className="font-bold text-base">{selectedRepair.devices?.brands?.name} {selectedRepair.devices?.model}</p>
                  <p className="text-gray-400 font-mono text-xs">{t[lang].serial}: {selectedRepair.devices?.serial_number || t[lang].none}</p>
                </div>
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t[lang].prob}</p>
                <p className="bg-gray-800/50 p-3 rounded-lg border border-gray-700/50 min-h-[60px]">
                  {selectedRepair.reported_problem}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{t[lang].acc}</p>
                <p className="text-gray-300 italic">{selectedRepair.accessories_received || t[lang].none}</p>
              </div>

              <div className="md:col-span-2 border-t border-gray-800 pt-4 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-gray-500 mb-1">{t[lang].preparedBy}</p>
                  <p className="font-bold">{selectedRepair.staff?.full_name || "N/A"}</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => router.push(`/repairs/${selectedRepair.id}/intake-summary`)} 
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg flex items-center gap-2 font-bold transition-all"
                  >
                    <Printer className="w-4 h-4" /> {t[lang].print}
                  </button>
                  <button onClick={() => setShowModal(false)} className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg font-bold">
                    {t[lang].close}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}