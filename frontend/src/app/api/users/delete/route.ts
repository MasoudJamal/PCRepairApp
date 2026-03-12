import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔴 REQUIRED
);

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json(
        { error: "Missing user_id" },
        { status: 400 }
      );
    }

    // 1️⃣ Delete from auth.users FIRST
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) {
      console.error("Auth delete failed:", authError);
      throw authError;
    }

    // 2️⃣ Delete from public.users
    const { error: usersError } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", user_id);

    if (usersError) {
      console.error("Users delete failed:", usersError);
      throw usersError;
    }

    // 3️⃣ Delete from public.profiles
    const { error: profilesError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", user_id);

    if (profilesError) {
      console.error("Profiles delete failed:", profilesError);
      throw profilesError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: error.message || "Delete failed" },
      { status: 500 }
    );
  }
}