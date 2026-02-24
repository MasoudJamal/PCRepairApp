"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/serverServiceClient";

export async function approveDevice(deviceId: string) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("device_auth")
    .update({
      active: true,
      awaiting_approval: false,
      approved_at: new Date().toISOString(),
    })
    .eq("id", deviceId);

  if (error) throw error;
}

export async function replaceDevice(deviceId: string, showroomId: string) {
  const supabase = createSupabaseServiceClient();

  // Deactivate other devices
  await supabase
    .from("device_auth")
    .update({ active: false })
    .eq("showroom_id", showroomId)
    .eq("active", true);

  // Activate this device
  const { error } = await supabase
    .from("device_auth")
    .update({
      active: true,
      awaiting_approval: false,
      approved_at: new Date().toISOString(),
    })
    .eq("id", deviceId);

  if (error) throw error;
}

export async function rejectDevice(deviceId: string) {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("device_auth")
    .delete()
    .eq("id", deviceId);

  if (error) throw error;
}