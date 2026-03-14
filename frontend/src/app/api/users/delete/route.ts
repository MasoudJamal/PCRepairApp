import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/* Admin client (bypasses RLS) */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    /* Get session from cookies */
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    /* Get logged-in user */
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* Get current user role */
    const { data: currentUser } = await supabaseAdmin
      .from("profiles")
      .select("role, showroom_id")
      .eq("id", user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    /* Prevent self-delete */
    if (user.id === user_id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    /* Only admin or manager */
    if (!["admin", "manager"].includes(currentUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    /* Get target user */
    const { data: targetUser } = await supabaseAdmin
      .from("profiles")
      .select("role, showroom_id")
      .eq("id", user_id)
      .single();

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    /* Manager restrictions */
    if (currentUser.role === "manager") {
      if (targetUser.role === "admin") {
        return NextResponse.json(
          { error: "Managers cannot delete admins" },
          { status: 403 }
        );
      }

      if (targetUser.showroom_id !== currentUser.showroom_id) {
        return NextResponse.json(
          { error: "Managers can only delete users from their showroom" },
          { status: 403 }
        );
      }
    }
	
	/* Remove device_auth references */
    await supabaseAdmin
      .from("device_auth")
      .delete()
      .or(`requester_user_id.eq.${user_id},requesting_user_id.eq.${user_id}`);

    /* Delete auth user */
    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (authError) throw authError;

    /* Clean up other tables */
    await supabaseAdmin.from("users").delete().eq("id", user_id);
    await supabaseAdmin.from("profiles").delete().eq("id", user_id);

    return NextResponse.json({
  success: true,
  message_en: "User deleted successfully",
  message_fr: "Utilisateur supprimé avec succès"
});

  } catch (error: any) {
  console.error("Delete user error:", error);

  let message_en = "Delete failed";
  let message_fr = "Échec de la suppression";

  if (error.message?.includes("device_auth")) {
    message_en = "User cannot be deleted because device authorization records exist.";
    message_fr = "L'utilisateur ne peut pas être supprimé car des autorisations d'appareil existent.";
  }

  if (error.message?.includes("Unauthorized")) {
    message_en = "You are not authorized to delete this user.";
    message_fr = "Vous n'êtes pas autorisé à supprimer cet utilisateur.";
  }

  return NextResponse.json(
    {
      success: false,
      message_en,
      message_fr
    },
    { status: 500 }
  );
}
