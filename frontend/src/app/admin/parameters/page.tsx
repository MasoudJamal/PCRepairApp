"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { 
  ArrowLeft, 
  Tag, 
  Layers, 
  ShieldCheck, 
  Wrench, 
  ChevronRight,
  PackageSearch
} from "lucide-react";

export default function ParametersMenu() {
  const router = useRouter();
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang] ?? I18N.en;

  // Security Guard
  if (session?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-20 text-center text-red-500 font-bold">
        Access Denied
      </div>
    );
  }

  const menuItems = [
    {
      title: lang === 'fr' ? "Marques d'appareils" : "Device Brands",
      desc: "Apple, Samsung, Huawei, HP, Dell...",
      path: "/admin/parameters/brands",
      icon: <Tag className="w-6 h-6 text-orange-500" />,
      color: "border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/5",
      accent: "bg-orange-500/10"
    },
    {
      title: lang === 'fr' ? "Types d'articles" : "Item Types",
      desc: "Smartphone, Tablet, Laptop, Desktop...",
      path: "/admin/parameters/item-types",
      icon: <Layers className="w-6 h-6 text-blue-500" />,
      color: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/5",
      accent: "bg-blue-500/10"
    },
    {
      title: lang === 'fr' ? "Catalogue de Réparation" : "Repair Catalog",
      desc: lang === 'fr' ? "Gérer les pièces et services" : "Manage parts and services",
      path: "/dashboard/parameters/repair-items", // Path matches your existing gear icon
      icon: <Wrench className="w-6 h-6 text-emerald-500" />,
      color: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/5",
      accent: "bg-emerald-500/10"
    },
    {
      title: lang === 'fr' ? "Inventaire Pièces" : "Parts Inventory",
      desc: lang === 'fr' ? "Suivi du stock et prix" : "Track stock levels and costs",
      path: "/admin/parameters/inventory", // Placeholder for future use
      icon: <PackageSearch className="w-6 h-6 text-purple-500" />,
      color: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/5",
      accent: "bg-purple-500/10"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-8 pt-24 text-white">
      {/* Background Glows for consistent look with Dashboard */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Fixed Back Button */}
        <button 
          onClick={() => router.push("/dashboard")} 
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> 
          {lang === 'fr' ? "Retour au Tableau de Bord" : "Back to Dashboard"}
        </button>

        <header className="mb-10">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 h-10 w-10" />
            {lang === 'fr' ? "Paramètres Système" : "System Parameters"}
          </h1>
          <p className="text-gray-400">
            {lang === 'fr' 
              ? "Configurez les fondations de votre application de réparation." 
              : "Configure the foundations of your repair application."}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => router.push(item.path)}
              className={`p-6 bg-gray-900/50 border rounded-2xl transition-all text-left group flex items-start justify-between ${item.color}`}
            >
              <div className="flex flex-col h-full">
                <div className={`p-3 rounded-xl w-fit mb-4 ${item.accent} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-1 group-hover:text-white transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm">
                  {item.desc}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
