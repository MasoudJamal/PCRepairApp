"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";

import { 
  Wrench, Search, Printer, Eye, Loader2, Phone, 
  User as UserIcon, ArrowLeft, X, Info, Smartphone, Package, AlertCircle, Clock
} from "lucide-react";

export default function RepairsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRepair, setSelectedRepair] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [employeeName, setEmployeeName] = useState<string>("Staff");

  const lang = session?.language === "FR" ? "FR" : "EN";

  // BILINGUAL DICTIONARY
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
      serial: "S/N"
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
      serial: "N° Série"
    }
  };

  // Sync employee name exactly like IntakeSummaryPage
  useEffect(() => {
    if (session?.full_name) {
      setEmployeeName(session.full_name);
      localStorage.setItem("employee_name", session.full_name);
    } else {
      const saved = localStorage.getItem("employee_name");
      if (saved) setEmployeeName(saved);
    }
  }, [session]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!session) {
      router.replace("/auth/login");
      return;
    }
    fetchRepairs();
  }, [sessionLoading, session]);

  const fetchRepairs = async () => {
  try {
    setLoading(true);
    const supabase = createSupabaseClient();
    
    // We join the 'profiles' table (aliased as 'staff') to get the actual creator
    const { data, error } = await supabase
      .from('repairs')
      .select(`
        *, 
        customers (*), 
        devices (*),
        staff:profiles!repairs_user_id_fkey (full_name)
      `)
      .order('received_at', { ascending: false });

    if (error) throw error;
    setRepairs(data || []);
  } catch (error: any) {
    console.error("Error:", error.message);
  } finally {
    setLoading(false);
  }
};

  const filteredRepairs = repairs.filter((r: any) => 
    r.repair_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.customers?.phone?.includes(searchTerm)
  );

  if (sessionLoading || loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      <style jsx global>{`
  @media print {
    @page {
      size: auto;
      margin: 0mm; /* Eliminates browser headers/footers that cause extra pages */
    }
    body {
      background: white !important;
    }
    /* Hide everything except the modal */
    body > *:not(.print-area) {
      display: none !important;
    }
    .print-area {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      margin: 0;
      padding: 20px;
      background: white !important;
      color: black !important;
      border: none !important;
    }
    .no-print { display: none !important; }
  }
`}</style>

      <div className="p-4 md:p-8 pt-24 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white"><ArrowLeft /></button>
            <h1 className="text-3xl font-bold flex items-center gap-3"><Wrench className="text-blue-400" /> {t[lang].title}</h1>
          </div>
          <div className="flex gap-3">
             <button onClick={() => router.push('/dashboard')} className="bg-gray-800 hover:bg-gray-700 px-5 py-2 rounded-xl font-bold border border-gray-700 flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> {t[lang].back}
             </button>
             <button onClick={() => router.push('/repairs/new')} className="bg-blue-600 hover:bg-blue-500 px-5 py-2 rounded-xl font-bold shadow-lg">
                + {t[lang].new}
             </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-800/40 backdrop-blur-md border border-gray-700/50 rounded-2xl p-4 mb-6 shadow-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            <input 
              type="text" 
              placeholder={t[lang].search} 
              className="w-full bg-gray-900/50 border border-gray-700 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-gray-800/40 border border-gray-700/50 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead className="border-b border-gray-700/50 bg-gray-900/50 uppercase text-[10px] tracking-widest text-gray-500">
              <tr>
                <th className="p-4">{t[lang].ref}</th>
                <th className="p-4">{t[lang].cust}</th>
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

      {/* --- INTAKE DETAILS MODAL --- */}
      {showModal && selectedRepair && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="print-area bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden">
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Info className="text-blue-400" /> {t[lang].modalTitle}</h2>
                <p className="text-xs text-gray-500 mt-1 font-mono">Ref: {selectedRepair.repair_ref}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="no-print text-gray-400 hover:text-white p-2 hover:bg-gray-700 rounded-full transition-colors"><X /></button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
              {/* Row 1: Prepared By & Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-500/5 p-4 rounded-2xl border border-blue-500/20">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{t[lang].preparedBy}</p>
                  <p className="text-white font-semibold">
                    {selectedRepair.staff?.full_name || "System"}
                  </p>
                </div>
                <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20">
                  <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">{t[lang].dateReceived}</p>
                  <p className="text-white font-semibold">
                    {new Date(selectedRepair.received_at).toLocaleDateString(lang === 'FR' ? 'fr-FR' : 'en-US')} - {new Date(selectedRepair.received_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
              </div>

              {/* Row 2: Customer & Device */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{t[lang].custInfo}</label>
                  <p className="text-white font-medium">{selectedRepair.customers?.full_name}</p>
                  <p className="text-gray-400 text-sm flex items-center gap-2 mt-1"><Phone className="w-3 h-3" /> {selectedRepair.customers?.phone}</p>
                </div>
                <div className="bg-gray-800/30 p-4 rounded-2xl border border-gray-700/50">
                  <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">{t[lang].devDetails}</label>
                  <p className="text-white font-medium flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-400" /> {selectedRepair.devices?.model}</p>
                  <p className="text-gray-400 text-sm mt-1">{t[lang].serial}: {selectedRepair.devices?.serial_number || 'N/A'}</p>
                </div>
              </div>

              {/* Row 3: Problems & Accessories */}
              <div className="space-y-4">
                <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                  <label className="text-[10px] font-bold text-red-400 uppercase block mb-1 flex items-center gap-2"><AlertCircle className="w-3 h-3" /> {t[lang].prob}</label>
                  <p className="text-gray-200 text-sm italic leading-relaxed">"{selectedRepair.reported_problem}"</p>
                </div>
                <div className="bg-gray-950/50 p-4 rounded-2xl border border-gray-800">
                  <label className="text-[10px] font-bold text-purple-400 uppercase block mb-1 flex items-center gap-2"><Package className="w-3 h-3" /> {t[lang].acc}</label>
                  <p className="text-gray-200 text-sm">{selectedRepair.accessories_received || t[lang].none}</p>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="no-print p-6 bg-gray-800/30 border-t border-gray-800 flex gap-3">
              <button onClick={() => window.print()} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                <Printer className="w-4 h-4" /> {t[lang].print}
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold transition-colors">{t[lang].close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}