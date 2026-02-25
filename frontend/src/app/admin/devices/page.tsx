"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { approveDevice, replaceDevice, rejectDevice } from "./actions";
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  User,
  Building,
  Cpu,
  ArrowLeft,
  Clock
} from "lucide-react";

interface DeviceRow {
  id: string;
  cpu_id?: string;
  device_label?: string;
  manufacturer?: string;
  model?: string;
  first_seen_at: string;
  active: boolean;
  awaiting_approval: boolean;

  showroom: { 
    id: string; 
    name: string; 
  } | null;

  requester: { 
    id: string; 
    full_name: string; 
    username: string; 
  } | null;
}

export default function DeviceAuthAdminPage() {
  const router = useRouter();
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "active" | "inactive">("all");

   const filteredDevices = devices.filter(device => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return device.awaiting_approval;
    if (activeFilter === "active") return device.active && !device.awaiting_approval;
    if (activeFilter === "inactive") return !device.active && !device.awaiting_approval;
    return true;
  });

  async function loadDevices() {
    setLoading(true);
    try {
      const supabase = createSupabaseClient();

      const { data, error } = await supabase
        .from("device_auth")
        .select(`
          id,
          cpu_id,
          device_label,
          manufacturer,
          model,
          first_seen_at,
          active,
          awaiting_approval,
          showroom:showrooms ( id, name ),
          requester:users!device_auth_requester_user_fkey (
            id,
            full_name,
            username
          )
        `)
        .order("first_seen_at", { ascending: false });

      if (error) {
        console.error("Supabase query error:", error);
      } else {
        // Normalize Supabase data
        const normalized: DeviceRow[] = (data ?? []).map((row: any) => ({
          ...row,
          showroom: row.showroom?.[0] ?? null,   // Take first element or null
          requester: row.requester?.[0] ?? null, // Take first element or null
        }));

        // Update state with normalized data
        setDevices(normalized);
      }
    } catch (e) {
      console.error("Unexpected error fetching devices:", e);
    } finally {
      setLoading(false);
    }
  }

async function toggleDeviceActive(device: DeviceRow) {
  if (device.awaiting_approval) return;

  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("device_auth")
    .update({ active: !device.active })
    .eq("id", device.id);

  if (error) {
    alert("Failed to update device status");
    console.error(error);
    return;
  }

  loadDevices();
}

async function updateDeviceField(
  deviceId: string,
  field: "manufacturer" | "model",
  value: string
) {
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from("device_auth")
    .update({ [field]: value })
    .eq("id", deviceId);

  if (error) {
    alert("Failed to update device info");
    console.error(error);
    return;
  }

  loadDevices();
}

  useEffect(() => {
    loadDevices();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (device: DeviceRow) => {
    if (device.awaiting_approval) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20">
          <Clock className="w-3.5 h-3.5 text-yellow-500" />
          <span className="text-yellow-500 text-xs font-medium">{t.devices.status.pending}</span>
        </div>
      );
    }
    if (device.active) {
      return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-500 text-xs font-medium">{t.devices.status.active}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
        <XCircle className="w-3.5 h-3.5 text-red-500" />
        <span className="text-red-500 text-xs font-medium">{t.devices.status.inactive}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center h-96">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">{t.devices.messages.loading}</p>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="text-sm">{t.dashboard.dashboard}</span>
                </button>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {t.devices.title}
              </h1>
              <p className="text-gray-400">{t.devices.subtitle}</p>
			  
			  {devices.some(d => d.awaiting_approval) && (
              <div className="mb-6 border border-yellow-500/40 bg-yellow-500/10 rounded-xl p-4">
                ⚠ {t.devices.messages.awaitingApprovalWarning}
              </div>
            )}
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadDevices}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t.devices.ui.refresh}</span>
              </button>
            </div>
          </div>
		  
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t.devices.stats.total}</p>
                  <p className="text-2xl font-bold text-white">{devices.length}</p>
                </div>
                <Cpu className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
<p className="text-gray-400 text-sm">{t.devices.stats.pending}</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {devices.filter(d => d.awaiting_approval).length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t.devices.stats.active}</p>
                  <p className="text-2xl font-bold text-green-500">
                    {devices.filter(d => d.active && !d.awaiting_approval).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">{t.devices.stats.inactive}</p>
                  <p className="text-2xl font-bold text-red-500">
                    {devices.filter(d => !d.active && !d.awaiting_approval).length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {(["all", "pending", "active", "inactive"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeFilter === filter
                    ? "bg-blue-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {t.devices.filters[filter]}
              </button>
            ))}
          </div>
        </div>

        {/* Device Table */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700 overflow-hidden">
          {filteredDevices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-12 h-12 text-gray-600 mb-4" />
              <p className="text-gray-500 text-lg">{t.devices.messages.empty}</p>
              <p className="text-gray-600 text-sm mt-2">
                {activeFilter !== "all"
                  ? t.devices.messages.emptyFiltered(activeFilter)
                  : t.devices.messages.tryFilters}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left p-6">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <User className="w-4 h-4" />
                        {t.devices.table.user}
                      </div>
                    </th>
                    <th className="text-left p-6">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <Building className="w-4 h-4" />
                        {t.devices.table.showroom}
                      </div>
                    </th>
                    <th className="text-left p-6">
                      <div className="flex items-center gap-2 text-gray-400 font-medium">
                        <Cpu className="w-4 h-4" />
                        {t.devices.table.device}
                      </div>
                    </th>
                    <th className="text-left p-6">
                      <div className="text-gray-400 font-medium">{t.devices.table.status}</div>
                    </th>
                    <th className="text-left p-6">
                      <div className="text-gray-400 font-medium">{t.devices.table.actions}</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDevices.map((d) => (
                    <tr key={d.id} className="border-b border-gray-700/50 hover:bg-gray-800/50 transition-colors">
                      <td className="p-6">
                        <div>
                          <p className="text-white font-medium">
                            {d.requester?.full_name || t.devices.ui.unknown}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {d.requester?.username}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <div className="bg-gray-800/50 rounded-lg px-3 py-2">
                          <p className="text-white">
                            {d.showroom?.name || t.devices.table.noShowroom}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <div>
                          <div className="flex gap-2">
                            <input
                              defaultValue={d.manufacturer || ""}
                              placeholder={t.devices.ui.manufacturer}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white w-32"
                              onBlur={(e) =>
                                updateDeviceField(d.id, "manufacturer", e.target.value)
                              }
                            />
                            <input
                              defaultValue={d.model || ""}
                              placeholder={t.devices.ui.model}
                              className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white w-32"
                              onBlur={(e) =>
                                updateDeviceField(d.id, "model", e.target.value)
                              }
                            />
                          </div>
                          <p className="text-gray-400 text-sm mt-1">{d.device_label}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">{t.devices.table.deviceId}:</span>
                            <code className="text-xs bg-gray-900 text-gray-300 px-2 py-1 rounded">
                              {d.cpu_id || t.devices.ui.notAvailable}
                            </code>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              {t.devices.table.firstSeen}: {formatDate(d.first_seen_at)}
                            </span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-6">
                        <button
                          disabled={d.awaiting_approval}
                          onClick={() => toggleDeviceActive(d)}
                          className={`cursor-pointer ${
                            d.awaiting_approval ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                          } transition-transform`}
                          title="Toggle active / inactive"
  >
                          {getStatusBadge(d)}
                        </button>
                      </td>
                      
                      <td className="p-6">
                        {d.awaiting_approval ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={async () => {
                                await approveDevice(d.id);
                                loadDevices();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <CheckCircle className="w-4 h-4" />
                              {t.devices.actions.approve}
                            </button>
                            
                            <button
                              onClick={async () => {
                                if (!confirm(t.devices.messages.confirmReplace)) return;
                                await replaceDevice(d.id, d.showroom?.id ?? "");
                                loadDevices();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <RefreshCw className="w-4 h-4" />
                              {t.devices.actions.replace}
                            </button>
                            
                            <button
                              onClick={async () => {
                                if (!confirm(t.devices.messages.confirmReject)) return;
                                await rejectDevice(d.id);
                                loadDevices();
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                            >
                              <XCircle className="w-4 h-4" />
                              {t.devices.actions.reject}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">{t.devices.actions.noActions}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
 }