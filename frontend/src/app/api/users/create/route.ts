import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const {
      full_name,
      username,
      password,
      role,
      showroom_id,
      language,
      active,
      created_by_role,
    } = await req.json();

    /* 🔐 ROLE ENFORCEMENT */
    if (created_by_role === "manager" && role === "admin") {
      return NextResponse.json(
        { error: "Managers cannot create admins" },
        { status: 403 }
      );
    }

    const email = `${username}@local.auth`;

    /* 👤 CREATE AUTH USER */
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || "Auth creation failed" },
        { status: 400 }
      );
    }

    const userId = authData.user.id;

/* 🧾 INSERT profiles */
const { error: profileError } = await supabase
  .from("profiles")
  .insert({
    id: userId,
    username,
    full_name,
    role,
    showroom_id: role === "admin" ? null : showroom_id,
    language,
    active,
  });

if (profileError) {
  return NextResponse.json(
    { error: profileError.message },
    { status: 400 }
  );
}

/* 🧾 INSERT public.users */
const { error: usersError } = await supabase
  .from("users")
  .insert({
    id: userId,
    username,
    password_hash: "AUTH_MANAGED",
    full_name,
    role,
    showroom_id: role === "admin" ? null : showroom_id,
    language,
    active,
  });

if (usersError) {
  return NextResponse.json(
    { error: usersError.message },
    { status: 400 }
  );
}
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 500 }
    );
  }
}