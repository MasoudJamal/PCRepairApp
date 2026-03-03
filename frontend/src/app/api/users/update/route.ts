import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // REQUIRED
);

export async function POST(req: Request) {
  const body = await req.json();

  const {
    user_id,
    full_name,
    role,
    active,
    password,
    language,
    max_discount_percent,
  } = body;

  // Use parseFloat to support decimals (e.g., 10.5)
  // Clamp between 0 and 100 for safety
  const sanitizedDiscount = Math.min(Math.max(parseFloat(max_discount_percent) || 0, 0), 100);

  /* 🔄 UPDATE public.profiles */
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name,
      role,
      active,
      language,
      max_discount_percent: sanitizedDiscount,
    })
    .eq("id", user_id);

  if (profileError) {
    return NextResponse.json(
      { error: profileError.message },
      { status: 400 }
    );
  }

  /* 🔄 UPDATE public.users */
  const { error: usersError } = await supabase
    .from("users")
    .update({
      role,
      active,
      language,
      max_discount_percent: sanitizedDiscount,
    })
    .eq("id", user_id);

  if (usersError) {
    return NextResponse.json(
      { error: usersError.message },
      { status: 400 }
    );
  }

  /* 🔐 UPDATE PASSWORD (OPTIONAL) */
  if (password && password.length >= 6) {
    const { error: authError } = await supabase.auth.admin.updateUserById(
      user_id,
      { password }
    );

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({ success: true });
}