"use client";

import { useRouter, usePathname } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { 
  Settings, 
  Smartphone, 
  Building2, 
  LogOut, 
  Home,
  PlusCircle,
  Globe,
  User,
  ChevronDown,
  Menu,
  X
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const I18N = {
  EN: {
    dashboard: "Dashboard",
    newRepair: "New Repair",
    parameters: "Parameters",
    logout: "Logout",
    profile: "Profile",
    viewProfile: "View Profile",
    adminTools: "Admin Tools",
    devices: "Devices",
    settings: "Settings",
    language: "Language",
  },
  FR: {
    dashboard: "Tableau de bord",
    newRepair: "Nouvelle réparation",
    parameters: "Paramètres",
    logout: "Déconnexion",
    profile: "Profil",
    viewProfile: "Voir le profil",
    adminTools: "Outils admin",
    devices: "Appareils",
    settings: "Paramètres",
    language: "Langue",
  },
};

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, setSession, loading } = useSession();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Define the new path for repair items
  const PARAMETERS_PATH = "/dashboard/parameters/repair-items";

  const hideNav =
    pathname === "/auth/login" ||
    pathname === "/" ||
    loading ||
    !session;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (hideNav) {
    return null;
  }

  const currentLang = session.language === "FR" ? "FR" : "EN";
  const toggleLabel = currentLang === "EN" ? "FR" : "EN";
  const t = I18N[currentLang];

  const toggleLanguage = () => {
    setSession({
      ...session,
      language: toggleLabel,
    });
  };

  const handleLogout = () => {
    setSession(null);
    router.push("/auth/login");
  };

  const canManage = session.role === "admin" || session.role === "manager";

  return (
    <>
      {/* Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setShowMobileMenu(false)} />
      )}

      <nav className="h-16 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-gray-800 px-4 lg:px-8 fixed top-0 left-0 w-full z-50">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          
          {/* LEFT - Brand & Logo */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              {showMobileMenu ? (
                <X className="w-5 h-5 text-gray-300" />
              ) : (
                <Menu className="w-5 h-5 text-gray-300" />
              )}
            </button>

            <div className="flex items-center gap-3">
              <div className="relative">
                {session.showroom?.logo_url ? (
                  <img 
                    src={session.showroom.logo_url} 
                    alt="Logo" 
                    className="h-10 w-10 rounded-xl object-cover bg-white p-1 border border-gray-700" 
                  />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border border-gray-700">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-gray-900"></div>
              </div>
              
              <div className="hidden md:block">
                <h1 className="font-bold text-lg bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Touch of Tech Repairs
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`text-xs px-2 py-0.5 rounded-full ${
                    session.role === "admin" 
                      ? "bg-purple-900/30 text-purple-300 border border-purple-700/30" 
                      : "bg-blue-900/30 text-blue-300 border border-blue-700/30"
                  }`}>
                    {session.role === "admin" ? "Administrator" : session.role}
                  </div>
                  {session.showroom?.name && (
                    <span className="text-xs text-gray-400">{session.showroom.name}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* CENTER - Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            <NavButton 
              label={t.dashboard}
              icon={<Home className="w-4 h-4" />}
              onClick={() => router.push("/dashboard")}
              active={pathname === "/dashboard"}
            />

            {/* UPDATED: Points to your new repair-items page */}
            {canManage && (
              <NavButton 
                label={t.parameters}
                icon={<Settings className="w-4 h-4" />}
                onClick={() => router.push(PARAMETERS_PATH)}
                active={pathname.includes("/parameters")}
              />
            )}

            {session.role === "admin" && (
              <NavButton 
                label={t.devices}
                icon={<Smartphone className="w-4 h-4" />}
                onClick={() => router.push("/admin/devices")}
                active={pathname.includes("/admin/devices")}
              />
            )}
          </div>

          {/* RIGHT - Actions & Profile */}
          <div className="flex items-center gap-4">
            <PrimaryButton
              label={t.newRepair}
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => router.push("/repairs/new")}
            />

            <button 
              onClick={toggleLanguage}
              className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors group"
              title={`Switch to ${toggleLabel}`}
            >
              <Globe className="w-4 h-4" />
              <span className="font-medium">{toggleLabel}</span>
            </button>

            <div className="relative" ref={profileMenuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-1.5 rounded-xl bg-gray-800/30 hover:bg-gray-800 border border-gray-700 transition-all duration-200 hover:border-gray-600"
              >
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-white">{session.full_name}</p>
                  <p className="text-xs text-gray-400">{session.role}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showProfileMenu ? "rotate-180" : ""}`} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-5 duration-200">
                  <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-gray-800 to-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{session.full_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300">
                            {session.role}
                          </span>
                          {session.showroom?.name && (
                            <span className="text-xs text-gray-400 truncate">{session.showroom.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border-b border-gray-800">
                    <div className="flex gap-2 p-2">
                      <button
                        onClick={() => {
                          toggleLanguage();
                          setShowProfileMenu(false);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                      >
                        <Globe className="w-4 h-4" />
                        <span className="text-sm">{toggleLabel}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => {
                        router.push("/dashboard");
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      <span>{t.dashboard}</span>
                    </button>

                    {/* UPDATED: Points to your new repair-items page */}
                    {canManage && (
                      <button
                        onClick={() => {
                          router.push(PARAMETERS_PATH);
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>{t.parameters}</span>
                      </button>
                    )}

                    {session.role === "admin" && (
                      <button
                        onClick={() => {
                          router.push("/admin/devices");
                          setShowProfileMenu(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors"
                      >
                        <Smartphone className="w-4 h-4" />
                        <span>{t.devices}</span>
                      </button>
                    )}
                  </div>

                  <div className="p-2 border-t border-gray-800">
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-800/30 hover:border-red-700/50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-medium">{t.logout}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="lg:hidden absolute top-16 left-0 w-full bg-gray-900 border-b border-gray-800 shadow-2xl animate-in slide-in-from-top duration-200 z-40">
            <div className="p-4 space-y-2">
              <MobileNavItem
                icon={<Home className="w-5 h-5" />}
                label={t.dashboard}
                onClick={() => {
                  router.push("/dashboard");
                  setShowMobileMenu(false);
                }}
                active={pathname === "/dashboard"}
              />

              {/* UPDATED: Points to your new repair-items page */}
              {canManage && (
                <MobileNavItem
                  icon={<Settings className="w-5 h-5" />}
                  label={t.parameters}
                  onClick={() => {
                    router.push(PARAMETERS_PATH);
                    setShowMobileMenu(false);
                  }}
                  active={pathname.includes("/parameters")}
                />
              )}

              {session.role === "admin" && (
                <MobileNavItem
                  icon={<Smartphone className="w-5 h-5" />}
                  label={t.devices}
                  onClick={() => {
                    router.push("/admin/devices");
                    setShowMobileMenu(false);
                  }}
                  active={pathname.includes("/admin/devices")}
                />
              )}

              <button
                onClick={() => {
                  toggleLanguage();
                  setShowMobileMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-800/50 hover:bg-gray-800 border border-gray-700 text-gray-300 hover:text-white transition-colors"
              >
                <Globe className="w-5 h-5" />
                <span className="font-medium">Switch to {toggleLabel}</span>
              </button>

              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-900/20 hover:bg-red-900/30 text-red-400 hover:text-red-300 border border-red-800/30 hover:border-red-700/50 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">{t.logout}</span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

/* UI Components (Kept exactly the same) */
function NavButton({ 
  label, 
  onClick, 
  icon,
  active = false 
}: { 
  label: string; 
  onClick: () => void;
  icon?: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
        active 
          ? "bg-gray-800 text-white border border-gray-700" 
          : "text-gray-400 hover:text-white hover:bg-gray-800/50"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function PrimaryButton({ 
  label, 
  onClick, 
  icon 
}: { 
  label: string; 
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-blue-500/25 active:scale-95"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function MobileNavItem({ 
  icon, 
  label, 
  onClick,
  active = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
        active 
          ? "bg-gray-800 text-white border border-gray-700" 
          : "text-gray-400 hover:text-white hover:bg-gray-800"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}
