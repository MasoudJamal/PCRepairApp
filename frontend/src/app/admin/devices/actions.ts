"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/serverServiceClient";

type ActionResult =
  | { success: true }
  | { success: false; message: string };

export async function approveDevice(deviceId: string): Promise<ActionResult> {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("device_auth")
    .update({
      active: true,
      awaiting_approval: false,
      approved_at: new Date().toISOString(),
    })
    .eq("id", deviceId);

  if (error) {
    console.error("approveDevice error:", error);
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function replaceDevice(
  deviceId: string,
  showroomId: string
): Promise<ActionResult> {
  const supabase = createSupabaseServiceClient();

  const { error: deactivateError } = await supabase
    .from("device_auth")
    .update({ active: false })
    .eq("showroom_id", showroomId)
    .eq("active", true);

  if (deactivateError) {
    console.error("replaceDevice deactivate error:", deactivateError);
    return { success: false, message: deactivateError.message };
  }

  const { error } = await supabase
    .from("device_auth")
    .update({
      active: true,
      awaiting_approval: false,
      approved_at: new Date().toISOString(),
    })
    .eq("id", deviceId);

  if (error) {
    console.error("replaceDevice activate error:", error);
    return { success: false, message: error.message };
  }

  return { success: true };
}

export async function rejectDevice(
  deviceId: string
): Promise<ActionResult> {
  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("device_auth")
    .delete()
    .eq("id", deviceId);

  if (error) {
    console.error("rejectDevice error:", error);
    return { success: false, message: error.message };
  }

  return { success: true };
}