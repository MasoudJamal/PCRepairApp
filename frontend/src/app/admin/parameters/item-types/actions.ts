"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/serverServiceClient";
import { revalidatePath } from "next/cache";

export async function saveItemType(data: { 
  id?: string; 
  code: string; 
  label_en: string; 
  label_fr: string; 
  is_active: boolean 
}) {
  const supabase = createSupabaseServiceClient();

  const payload = {
    code: data.code.toUpperCase().replace(/\s+/g, '_'),
    label_en: data.label_en,
    label_fr: data.label_fr,
    is_active: data.is_active,
  };

  const query = data.id 
    ? supabase.from("item_types").update(payload).eq("id", data.id)
    : supabase.from("item_types").insert([payload]);

  const { error } = await query;
  if (error) throw error;
  
  revalidatePath("/admin/parameters/item-types");
}

export async function deleteItemType(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("item_types").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/parameters/item-types");
}