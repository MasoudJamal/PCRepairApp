"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function registerOrCheckDevice(payload: {
  cpu_id: string;
  device_label: string;
  showroom_id: string;          // UUID
  requesting_user_id: string;   // UUID
  device_id: string;
  mac_address: string;
}) {
  const supabase = await createSupabaseServerClient();

  // 🔍 Look for device for THIS user + showroom
  const { data: existingDevice, error: selectError } = await supabase
    .from("device_auth")
    .select("id, active, awaiting_approval")
    .eq("cpu_id", payload.cpu_id)
    .eq("showroom_id", payload.showroom_id)
    .eq("requesting_user_id", payload.requesting_user_id)
    .maybeSingle();

  if (selectError) {
    console.error("DEVICE SELECT ERROR:", selectError);
    throw selectError;
  }

  // ✅ Device already registered
  if (existingDevice) {
    return existingDevice;
  }

  // 🆕 First-time device → request approval
  const { data: insertedDevice, error: insertError } = await supabase
    .from("device_auth")
    .insert({
      cpu_id: payload.cpu_id,
      device_label: payload.device_label,
      showroom_id: payload.showroom_id,
      requesting_user_id: payload.requesting_user_id,
      requester_user_id: payload.requesting_user_id,
      active: false,
      awaiting_approval: true,
	  mac_address: payload.mac_address,
      device_label: payload.device_label,
    })
    .select("id, active, awaiting_approval")
    .single();

  if (insertError) {
    console.error("DEVICE INSERT ERROR:", insertError);
    throw insertError;
  }

  if (!insertedDevice) {
    throw new Error("Device insert blocked by RLS");
  }

  return insertedDevice;
}