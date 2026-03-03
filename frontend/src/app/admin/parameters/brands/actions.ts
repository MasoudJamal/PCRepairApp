"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/serverServiceClient";
import { revalidatePath } from "next/cache";

export async function saveBrand(data: { id?: string; name: string; is_active: boolean }) {
  const supabase = createSupabaseServiceClient();

  const payload = {
    name: data.name,
    is_active: data.is_active,
  };

  const query = data.id 
    ? supabase.from("brands").update(payload).eq("id", data.id)
    : supabase.from("brands").insert([payload]);

  const { error } = await query;
  if (error) throw error;

  revalidatePath("/admin/parameters/brands");
}

export async function deleteBrand(id: string) {
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/parameters/brands");
}
