"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { 
  Plus, Edit2, X, Loader2, ArrowLeft, Tag, AlignLeft, Layers
} from "lucide-react";

export default function CategoriesPage() {
  const supabase = createSupabaseClient();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();

  const isAdmin = session?.role?.toLowerCase() === "admin";
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // FORM STATE
  const [nameEn, setNameEn] = useState("");
  const [nameFr, setNameFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [descFr, setDescFr] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading) {
      if (!isAdmin) router.push("/dashboard");
      else loadCategories();
    }
  }, [session, sessionLoading]);

  const loadCategories = async () => {
    setLoading(true);
    // Fetch categories and count of related items
    const { data, error } = await supabase
      .from("repair_categories")
      .select(`
        *,
        repair_items(count)
      `)
      .order("name_en");
    
    if (data) setCategories(data);
    setLoading(false);
  };

  const openModal = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setNameEn(cat.name_en || "");
      setNameFr(cat.name_fr || "");
      setDescEn(cat.description_en || "");
      setDescFr(cat.description_fr || "");
      setIsActive(cat.is_active ?? true);
    } else {
      setEditingId(null);
      setNameEn("");
      setNameFr("");
      setDescEn("");
      setDescFr("");
      setIsActive(true);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const payload = { 
      name_en: nameEn, 
      name_fr: nameFr, 
      description_en: descEn,
      description_fr: descFr,
      is_active: isActive 
    };

    const { error } = editingId 
      ? await supabase.from("repair_categories").update(payload).eq("id", editingId)
      : await supabase.from("repair_categories").insert([payload]);

    if (!error) { 
      setIsModalOpen(false); 
      loadCategories(); 
    }
    setSaving(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-6 pt-24">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Bar - Fixed absolute paths to prevent 404 */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.push("/dashboard/parameters/repair-items")} className="p-3 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 transition text-gray-400 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <div className="flex bg-gray-900/50 p-1 rounded-xl border border-gray-800">
            <button onClick={() => router.push('/dashboard/parameters/repair-items')} className="px-6 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition">Articles</button>
            <button className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 shadow-lg">Categories</button>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Repair Categories</h1>
            <p className="text-gray-500 text-sm mt-1">Manage grouping for your services</p>
          </div>
          <button onClick={() => openModal()} className="flex items-center gap-2 px-5 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-95">
            <Plus size={20} /> Add Category
          </button>
        </div>

        {/* Categories List */}
        <div className="grid gap-4">
          {categories.map(cat => (
            <div key={cat.id} onClick={() => openModal(cat)} className="bg-gray-900/40 border border-gray-800 p-5 rounded-2xl flex justify-between items-center group hover:border-blue-500/50 transition-all cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                  <Tag className="text-blue-400" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">{cat.name_en} / {cat.name_fr}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${cat.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {cat.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-blue-400/60 font-medium">
                      <Layers size={12} />
                      <span>{cat.repair_items?.[0]?.count || 0} items</span>
                    </div>
                  </div>
                </div>
              </div>
              <Edit2 className="text-gray-600 group-hover:text-white transition-colors" size={18} />
            </div>
          ))}
        </div>

        {/* Edit/Create Modal (Labels Included) */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <div className="bg-gray-900 border border-gray-800 rounded-[2rem] w-full max-w-xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600/20 rounded-lg"><AlignLeft className="text-blue-400" size={20} /></div>
                  <h2 className="text-2xl font-bold">{editingId ? "Edit Category" : "New Category"}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-800 rounded-full transition"><X /></button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Category Name (EN)</label>
                    <input required value={nameEn} onChange={e => setNameEn(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Nom de la catégorie (FR)</label>
                    <input required value={nameFr} onChange={e => setNameFr(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 outline-none focus:border-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Description (EN)</label>
                    <textarea value={descEn} onChange={e => setDescEn(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 h-24 outline-none focus:border-blue-500 resize-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Description (FR)</label>
                    <textarea value={descFr} onChange={e => setDescFr(e.target.value)} className="w-full bg-black border border-gray-800 rounded-2xl p-4 h-24 outline-none focus:border-blue-500 resize-none" />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-black/50 p-4 rounded-2xl border border-gray-800">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-6 h-6 rounded-lg accent-blue-600 cursor-pointer" />
                    <label htmlFor="isActive" className="font-bold cursor-pointer">Active in Catalog</label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-800 rounded-2xl font-bold hover:bg-gray-700 transition">Cancel</button>
                  <button disabled={saving} type="submit" className="flex-[2] py-4 bg-blue-600 rounded-2xl font-bold hover:bg-blue-500 transition shadow-lg shadow-blue-500/20">
                    {saving ? "Saving..." : editingId ? "Save Changes" : "Create Category"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}