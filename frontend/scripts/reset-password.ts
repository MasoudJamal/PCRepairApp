import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const email = "jamal2@local.auth";
  const newPassword = "MyTestPassword123";

  const { data: users, error: listError } =
    await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("LIST FAILED:", listError.message);
    return;
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error("USER NOT FOUND IN AUTH:", email);
    return;
  }

  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: newPassword,
  });

  if (error) {
    console.error("PASSWORD UPDATE FAILED:", error.message);
  } else {
    console.log("✅ PASSWORD RESET SUCCESSFUL FOR", email);
  }
}

run();