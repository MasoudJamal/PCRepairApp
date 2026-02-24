import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔴 REQUIRED
);

export async function POST(req: Request) {
  const { user_id } = await req.json();

  // 1️⃣ Delete from custom users table
  await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", user_id);

  // 2️⃣ Delete profile
  await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", user_id);

  // 3️⃣ Delete auth user (LAST)
  await supabaseAdmin.auth.admin.deleteUser(user_id);

  return NextResponse.json({ success: true });
}