"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { saveBrand, deleteBrand } from "./actions";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Tag,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Brand {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export default function BrandsPage() {
  const router = useRouter();
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .order("name", { ascending: true });

    if (!error) setBrands(data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredBrands = useMemo(() => {
    return brands.filter(brand => 
      brand.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  const handleEdit = (brand: Brand) => {
    setEditingBrand(brand);
    setFormData({
      name: brand.name,
      is_active: brand.is_active
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingBrand(null);
    setFormData({ name: "", is_active: true });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveBrand({
        id: editingBrand?.id,
        ...formData
      });
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      alert("Error saving brand");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.confirm)) return;
    await deleteBrand(id);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <button 
            onClick={() => router.push('/admin/parameters')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">{t.common.back}</span>
          </button>
          <h1 className="text-3xl font-bold text-white">{t.parameters.brands.title}</h1>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4" />
          {t.common.create}
        </button>
      </div>

      {/* Search and Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.common.search}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">{t.parameters.brands.name}</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredBrands.length > 0 ? (
                filteredBrands.map((brand) => (
                  <tr key={brand.id} className="hover:bg-gray-700/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-gray-700 flex items-center justify-center text-gray-400 group-hover:text-blue-400 transition-colors">
                          <Tag className="w-4 h-4" />
                        </div>
                        <span className="text-white font-medium">{brand.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        {brand.is_active ? (
                          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {t.common.active}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
                            <XCircle className="w-3.5 h-3.5" />
                            {t.common.inactive}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(brand)}
                          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(brand.id)}
                          className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-500 italic">
                    {t.showrooms.empty}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {editingBrand ? t.common.edit : t.common.create}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.parameters.brands.name}</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Samsung, HP, Dell..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is_active_brand"
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="is_active_brand" className="text-sm text-gray-300 select-none">
                  {t.common.active}
                </label>
              </div>

              <div className="flex gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t.common.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}