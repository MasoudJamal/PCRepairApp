import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const users = [
    {
      id: "93c5cbe1-a7fe-4033-9806-6f431f5ec3fb",
      email: "jamal@local.auth",
      password: "Test123!",
    },
    {
      id: "0bb51d82-c566-45c4-bd3a-eac988ed5004",
      email: "jamal2@local.auth",
      password: "MyTestPassword123",
    },
  ];

  for (const u of users) {
    const { error } = await supabase.auth.admin.createUser({
      id: u.id,                // 🔗 links to public.users.id
      email: u.email,
      password: u.password,
      email_confirm: true,
    });

    if (error) {
      console.error("FAILED:", u.email, error.message);
    } else {
      console.log("✅ CREATED AUTH USER:", u.email);
    }
  }
}

run();