"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { createSupabaseClient } from "@/lib/supabase/client";
import { I18N } from "@/lib/i18n";
import { 
  User, 
  Shield, 
  Building2, 
  Languages, 
  Users, 
  Store, 
  Cpu,
  Key,
  LogOut,
  Bell,
  Settings,
  ChevronRight,
  BarChart3,
  Clock,
  Activity,
  Database,
  Globe,
  Mail,
  Phone,
  MapPin,
  QrCode,
  Sparkles,
  Package, // For Item Types
  Tag,     // For Brands
  Wrench
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalShowrooms: 0,
    activeDevices: 0,
    recentActivity: 0
  });
  const [notifications, setNotifications] = useState([
    { id: 1, message: "System update scheduled for tomorrow", time: "2 hours ago", read: false },
    { id: 2, message: "New device registered in Main Showroom", time: "5 hours ago", read: true },
  ]);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/auth/login");
    } else {
      if (session.role === "admin") {
        fetchDashboardStats();
      }
    }
  }, [loading, session, router]);

  const fetchDashboardStats = async () => {
    try {
      const supabase = createSupabaseClient();
      const [users, showrooms, devices] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('showrooms').select('id', { count: 'exact' }),
        supabase.from('device_auth').select('id', { count: 'exact' }).eq('active', true)
      ]);

      setStats({
        totalUsers: users.count || 0,
        totalShowrooms: showrooms.count || 0,
        activeDevices: devices.count || 0,
        recentActivity: 12 
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <Sparkles className="w-8 h-8 text-blue-500 absolute -top-2 -right-2 animate-pulse" />
          </div>
          <p className="mt-4 text-gray-400 text-lg">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const lang = session.language === "FR" ? "fr" : "en";
  const t = I18N[lang] ?? I18N.en;
  const showroomLogo = session.showroom?.logo_url ?? null;
  const canManage = session.role === "admin" || session.role === "manager";
  const isAdmin = session.role === "admin";

  const getRoleStyle = (role: string) => {
    const baseStyle = "px-3 py-1 rounded-full text-xs font-bold";
    switch(role.toLowerCase()) {
      case 'admin':
        return `${baseStyle} bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30`;
      case 'manager':
        return `${baseStyle} bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-400 border border-purple-500/30`;
      default:
        return `${baseStyle} bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-400 border border-blue-500/30`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 p-4 md:p-6 lg:p-8 pt-24">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
             {/* Showroom Logo Added Here */}
             {showroomLogo && (
               <img src={showroomLogo} alt="Logo" className="w-50 h-50 rounded-xl object-contain bg-white/5 p-1 border border-white/10 shadow-2xl" />
             )}
             <div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {t.users.dashboard}
                  <span className="text-blue-400 ml-2">👋</span>
                </h1>
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{session.full_name}</span>
                  </div>
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <span className={getRoleStyle(session.role)}>
                    {session.role.toUpperCase()}
                  </span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="relative p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors">
              <Bell className="w-5 h-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            {/* Gear icon now points to Repair Items for everyone */}
            <button 
              onClick={() => router.push("/dashboard/parameters/repair-items")}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <div className="h-8 w-px bg-gray-700"></div>
            <button 
              onClick={() => router.push("/auth/logout")}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Stats Grid - Admin Only */}
        {isAdmin && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="w-6 h-6 text-blue-400" /></div>
                <span className="text-xs text-gray-400 font-medium">TOTAL</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats.totalUsers}</p>
              <p className="text-gray-400 text-sm">Registered Users</p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-purple-500/20 rounded-lg"><Store className="w-6 h-6 text-purple-400" /></div>
                <span className="text-xs text-gray-400 font-medium">ACTIVE</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats.totalShowrooms}</p>
              <p className="text-gray-400 text-sm">Showrooms</p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg"><Cpu className="w-6 h-6 text-green-400" /></div>
                <span className="text-xs text-gray-400 font-medium">ONLINE</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats.activeDevices}</p>
              <p className="text-gray-400 text-sm">Active Devices</p>
            </div>
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 bg-orange-500/20 rounded-lg"><Activity className="w-6 h-6 text-orange-400" /></div>
                <span className="text-xs text-gray-400 font-medium">24H</span>
              </div>
              <p className="text-3xl font-bold text-white mb-1">{stats.recentActivity}</p>
              <p className="text-gray-400 text-sm">Recent Activities</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Profile Overview</h2>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center">
                   <User className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{session.full_name}</h3>
                  <p className="text-gray-400 text-sm">{session.email}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push("/dashboard/customers")}
                  className="group p-4 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-xl hover:border-emerald-400 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-emerald-400" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Customer Database</h3>
                  <p className="text-gray-400 text-sm">Manage {isAdmin ? 'all' : 'your'} client records</p>
                </button>

                {canManage && (
                  <>
                    <button
                      onClick={() => router.push("/users")}
                      className="group p-4 bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl hover:border-blue-400 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg"><Users className="w-5 h-5 text-blue-400" /></div>
                        <ChevronRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-white font-semibold mb-1">User Management</h3>
                      <p className="text-gray-400 text-sm">Manage system users</p>
                    </button>
					
					{/* Repair Management Action Button */}
<button
  onClick={() => router.push("/repairs")}
  className="group p-4 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl hover:border-orange-400 transition-all text-left"
>
  <div className="flex items-center justify-between mb-2">
    <div className="p-2 bg-orange-500/20 rounded-lg">
      <Wrench className="w-5 h-5 text-orange-400" />
    </div>
    <ChevronRight className="w-5 h-5 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity" />
  </div>
  <h3 className="text-white font-semibold mb-1">Repair Tracking</h3>
  <p className="text-gray-400 text-sm">Track device status and print receipts</p>
</button>

                    <button
                      onClick={() => router.push("/showrooms")}
                      className="group p-4 bg-gradient-to-r from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl hover:border-purple-400 transition-all text-left"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg"><Store className="w-5 h-5 text-purple-400" /></div>
                        <ChevronRight className="w-5 h-5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <h3 className="text-white font-semibold mb-1">Showrooms</h3>
                      <p className="text-gray-400 text-sm">Manage all showrooms</p>
                    </button>
					
                    {isAdmin && (
  <button
    onClick={() => router.push("/admin/parameters")}
    className="group p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl hover:border-blue-500 transition-all text-left"
  >
    <div className="flex items-center justify-between mb-2">
      <div className="p-2 bg-blue-500/20 rounded-lg">
        <Settings className="w-5 h-5 text-blue-400" />
      </div>
      <ChevronRight className="w-5 h-5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <h3 className="text-white font-semibold mb-1">System Parameters</h3>
    <p className="text-gray-400 text-sm">Configure brands, types, and pricing</p>
  </button>
)}
                  </>
                )}

                <button
                  onClick={() => router.push("/account/change-password")}
                  className="group p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/50 border border-gray-600/50 rounded-xl hover:border-gray-500 transition-all text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-gray-700/50 rounded-lg"><Key className="w-5 h-5 text-gray-400" /></div>
                    <ChevronRight className="w-5 h-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-white font-semibold mb-1">Security</h3>
                  <p className="text-gray-400 text-sm">Change password</p>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Recent Activity</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/20 rounded-lg"><Clock className="w-4 h-4 text-green-400" /></div>
                  <div>
                    <p className="text-white text-sm">Logged in to dashboard</p>
                    <p className="text-gray-500 text-xs">Just now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}