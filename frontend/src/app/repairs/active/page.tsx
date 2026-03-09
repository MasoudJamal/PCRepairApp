"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { 
  ClipboardList, Search, Filter, ArrowRight, 
  Clock, Tool, LayoutGrid, List, Loader2, MapPin
} from "lucide-react";

export default function ActiveRepairsPage() {
  const { session } = useSession();
  const router = useRouter();
  const lang = session?.language === "FR" ? "fr" : "en";

  const [loading, setLoading] = useState(true);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    // Security Check: Only allow relevant roles
    const allowedRoles = ['admin', 'technician', 'manager', 'employee'];
    if (session && !allowedRoles.includes(session.role)) {
      router.push("/dashboard");
      return;
    }
    fetchRepairs();
  }, [session]);

  const fetchRepairs = async () => {
    setLoading(true);
    let query = supabase
      .from("repairs")
      .select(`
        *,
        customers(full_name, phone),
        showrooms(name)
      `)
      .is('deleted_at', null)
      .order('received_at', { ascending: false });

    // Visibility Logic: 
    // Technicians and Admins see all. 
    // Managers/Employees only see their showroom.
    if (session?.role === 'manager' || session?.role === 'employee') {
      if (session.showroom_id) {
        query = query.eq('showroom_id', session.showroom_id);
      }
    }

    const { data, error } = await query;
    if (!error && data) setRepairs(data);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      received: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      awaiting_delivery_to_shop: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      in_diagnosis: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    };
    return colors[status] || "bg-gray-500/10 text-gray-500 border-gray-500/20";
  };

  if (loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-pink-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 p-6 pt-24 text-white">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ClipboardList className="text-pink-500" />
              {lang === "fr" ? "Suivi des Réparations" : "Repair Tracking"}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {session?.role === 'technician' || session?.role === 'admin' 
                ? (lang === 'fr' ? "Vue globale (Toutes les boutiques)" : "Global View (All Showrooms)")
                : `${lang === 'fr' ? "Boutique" : "Showroom"}: ${session?.showroom?.name || 'Local'}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder={lang === 'fr' ? "Rechercher..." : "Search..."}
                className="bg-gray-900 border border-gray-800 rounded-xl py-2 pl-10 pr-4 outline-none focus:ring-2 focus:ring-pink-500 transition-all w-64"
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Repairs Table */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-medium">{lang === 'fr' ? 'Référence' : 'Reference'}</th>
                <th className="px-6 py-4 font-medium">{lang === 'fr' ? 'Appareil' : 'Device'}</th>
                <th className="px-6 py-4 font-medium">{lang === 'fr' ? 'Client' : 'Customer'}</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Showroom</th>
                <th className="px-6 py-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {repairs.filter(r => r.repair_ref.toLowerCase().includes(searchTerm.toLowerCase())).map((repair) => (
                <tr key={repair.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="font-mono text-pink-500 font-bold">{repair.repair_ref}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{repair.device_name || "Unknown Device"}</div>
                    <div className="text-xs text-gray-500">{repair.repair_service_id ? 'Service Set' : 'Custom Repair'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">{repair.customers?.full_name}</div>
                    <div className="text-xs text-gray-500">{repair.customers?.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(repair.status)}`}>
                      {repair.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      {repair.showrooms?.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => router.push(`/admin/repairs/${repair.id}`)}
                      className="p-2 hover:bg-pink-500/10 hover:text-pink-500 rounded-lg transition-colors"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {repairs.length === 0 && (
            <div className="p-20 text-center text-gray-500">
              <Tool className="mx-auto mb-4 opacity-20" size={48} />
              <p>{lang === 'fr' ? "Aucune réparation trouvée" : "No repairs found"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}