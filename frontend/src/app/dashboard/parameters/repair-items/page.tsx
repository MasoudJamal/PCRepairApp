
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { 
  Plus, Edit2, Package, X, Loader2, 
  Trash2, AlertTriangle, Info, ArrowLeft, Search
} from "lucide-react";

export default function RepairItemsPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const userRole = session?.role?.toLowerCase() || "";
  const isAdmin = userRole === "admin";
  const isManager = userRole === "manager";

  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const lang = session?.language === "FR" ? "FR" : "EN";
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form States
  const [categoryId, setCategoryId] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descFr, setDescFr] = useState("");
  const [price, setPrice] = useState("0");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!sessionLoading && session) {
        loadData();
    } else if (!sessionLoading && !session) {
        router.push("/auth/login");
    }
  }, [session, sessionLoading]);

  const loadData = async () => {
    setLoading(true);
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from("repair_items").select(`*, repair_categories(name_en, name_fr)`).order("name_en"),
      supabase.from("repair_categories").select("id, name_en, name_fr").eq("is_active", true)
    ]);
    if (itemsRes.data) setItems(itemsRes.data);
    if (catsRes.data) setCategories(catsRes.data);
    setLoading(false);
  };

  const openModal = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setCategoryId(item.category_id || "");
      setNameEn(item.name_en || "");
      setNameFr(item.name_fr || "");
      setDescEn(item.description_en || "");
      setDescFr(item.description_fr || "");
      setPrice(item.default_price?.toString() || "0");
      setIsActive(item.is_active ?? true);
    } else {
      if (!isAdmin) return;
      setEditingId(null);
      setCategoryId("");
      setNameEn("");
      setNameFr("");
      setDescEn("");
      setDescFr("");
      setPrice("0");
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    const payload = {
      category_id: categoryId,
      name_en: nameEn,
      name_fr: nameFr,
      description_en: descEn,
      description_fr: descFr,
      default_price: parseFloat(price),
      is_active: isActive
    };
    const { error } = editingId 
      ? await supabase.from("repair_items").update(payload).eq("id", editingId)
      : await supabase.from("repair_items").insert([payload]);

    if (!error) { setIsModalOpen(false); loadData(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!itemToDelete || !isAdmin) return;
    const { error } = await supabase.from("repair_items").delete().eq("id", itemToDelete);
    if (!error) { loadData(); setIsDeleteConfirmOpen(false); }
  };

  const filteredItems = items.filter(item => 
    (lang === 'FR' ? item.name_fr : item.name_en).toLowerCase().includes(search.toLowerCase())
  );

  if (sessionLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 pt-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Top Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/parameters')}
              className="p-3 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition text-gray-400 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            {(isAdmin || isManager) && (
              <div className="flex bg-gray-900 border border-gray-800 p-1 rounded-xl">
                <button className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-600">Articles</button>
                {isAdmin && (
                  <button onClick={() => router.push('/dashboard/parameters/categories')} className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition">Categories</button>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder={lang === "FR" ? "Rechercher..." : "Search..."}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl py-2 pl-10 pr-4 focus:border-emerald-500 outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {isAdmin && (
              <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 rounded-xl font-bold transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">
                <Plus size={20} /> <span className="hidden sm:inline">{lang === "FR" ? "Ajouter" : "Add Item"}</span>
              </button>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold mb-8">{lang === "FR" ? "Catalogue de services" : "Service Catalog"}</h1>

        {/* Grid View */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></div>
          ) : filteredItems.map(item => (
            <div key={item.id} onClick={() => openModal(item)} className="bg-gray-900/40 border border-gray-800 p-6 rounded-2xl group hover:border-emerald-500/50 cursor-pointer transition-all relative">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Package className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex gap-2">
                  {isAdmin ? (
                    <>
                      <Edit2 className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setItemToDelete(item.id); 
                          setIsDeleteConfirmOpen(true); 
                        }} 
                        className="text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : <Info className="w-4 h-4 text-gray-600" />}
                </div>
              </div>
              
              <h3 className="font-bold text-lg mb-1">{lang === "FR" ? item.name_fr : item.name_en}</h3>
              <p className="text-gray-500 text-xs line-clamp-1 mb-4 uppercase tracking-wider">
                {item.repair_categories?.[lang === 'FR' ? 'name_fr' : 'name_en']}
              </p>

              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-800/50">
                <p className="text-emerald-400 font-mono font-bold">{item.default_price} $</p>
                {!item.is_active && <span className="text-[10px] text-red-500 font-bold uppercase border border-red-500/20 px-2 py-0.5 rounded">Inactive</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-red-500/20 p-8 rounded-3xl max-w-sm w-full text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-red-500 w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Are you sure?</h3>
              <p className="text-gray-400 mb-6">This item will be permanently removed from your catalog.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3 bg-gray-800 rounded-xl font-bold">Cancel</button>
                <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 rounded-xl font-bold hover:bg-red-500 transition">Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Item Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold">{isAdmin ? (editingId ? "Edit Service" : "Add Service") : "Service Details"}</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition"><X /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Category</label>
                    <select disabled={!isAdmin} required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 mt-2 outline-none focus:border-emerald-500 disabled:text-gray-500">
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{lang === 'FR' ? c.name_fr : c.name_en}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Name (EN)</label>
                    <input disabled={!isAdmin} required value={nameEn} onChange={e => setNameEn(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Nom (FR)</label>
                    <input disabled={!isAdmin} required value={nameFr} onChange={e => setNameFr(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Description (EN)</label>
                    <textarea disabled={!isAdmin} value={descEn} onChange={e => setDescEn(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 h-24 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Description (FR)</label>
                    <textarea disabled={!isAdmin} value={descFr} onChange={e => setDescFr(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 h-24 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black">Default Price ($)</label>
                    <input disabled={!isAdmin} type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-emerald-500" />
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input disabled={!isAdmin} type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-6 h-6 rounded-lg accent-emerald-600" />
                      <span className="font-bold">Active in Catalog</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold">Close</button>
                  {isAdmin && (
                    <button disabled={saving} type="submit" className="flex-[2] py-4 bg-emerald-600 rounded-2xl font-bold hover:bg-emerald-500 transition">
                        {saving ? "Saving..." : "Save Changes"}
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
