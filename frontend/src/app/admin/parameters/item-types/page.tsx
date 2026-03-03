"use client";

import { useEffect, useState, useMemo } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { I18N } from "@/lib/i18n";
import { saveItemType, deleteItemType } from "./actions";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  CheckCircle2, 
  XCircle,
  Loader2,
  Package,
  ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ItemType {
  id: string;
  code: string;
  label_en: string;
  label_fr: string;
  is_active: boolean;
  created_at: string;
}

export default function ItemTypesPage() {
  const router = useRouter();
  const { session } = useSession();
  const lang = session?.language === "FR" ? "fr" : "en";
  const t = I18N[lang];

  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemType | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    code: "",
    label_en: "",
    label_fr: "",
    is_active: true
  });

  const loadData = async () => {
    setLoading(true);
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("item_types")
      .select("*")
      .order("label_en", { ascending: true });

    if (!error) setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.label_en.toLowerCase().includes(search.toLowerCase()) ||
      item.label_fr.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleEdit = (item: ItemType) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      label_en: item.label_en,
      label_fr: item.label_fr,
      is_active: item.is_active
    });
    setIsModalOpen(true);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({ code: "", label_en: "", label_fr: "", is_active: true });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveItemType({
        id: editingItem?.id,
        ...formData
      });
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      alert("Error saving item type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t.common.confirm)) return;
    await deleteItemType(id);
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
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
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
          <h1 className="text-3xl font-bold text-white">{t.parameters.itemTypes.title}</h1>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" />
          {t.common.create}
        </button>
      </div>

      {/* Search and Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.common.search}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-900/50 text-gray-400 text-sm uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">{t.parameters.itemTypes.code}</th>
                <th className="px-6 py-4 font-medium">{t.parameters.itemTypes.labelEn}</th>
                <th className="px-6 py-4 font-medium">{t.parameters.itemTypes.labelFr}</th>
                <th className="px-6 py-4 font-medium text-center">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4 text-blue-400 font-mono text-sm">{item.code}</td>
                  <td className="px-6 py-4 text-white">{item.label_en}</td>
                  <td className="px-6 py-4 text-white">{item.label_fr}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      {item.is_active ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">
                {editingItem ? t.common.edit : t.common.create}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.parameters.itemTypes.code}</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. LAPTOP"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.parameters.itemTypes.labelEn}</label>
                <input
                  required
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.label_en}
                  onChange={(e) => setFormData({...formData, label_en: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">{t.parameters.itemTypes.labelFr}</label>
                <input
                  required
                  type="text"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.label_fr}
                  onChange={(e) => setFormData({...formData, label_fr: e.target.value})}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="is_active"
                  className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-blue-600 focus:ring-blue-500"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                />
                <label htmlFor="is_active" className="text-sm text-gray-300">{t.common.active}</label>
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