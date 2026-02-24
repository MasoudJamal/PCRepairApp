import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user: actor },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !actor) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { user_id, active } = await req.json();

    // 🚫 HARD BLOCK: self-deactivation (SERVER WINS)
    if (actor.id === user_id && active === false) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account." },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", user_id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}