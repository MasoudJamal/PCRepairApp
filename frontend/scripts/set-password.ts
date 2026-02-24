import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log(
  'SERVICE KEY PREFIX:',
  process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20)
)

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabase.auth.admin.listUsers();

  if (error) {
    console.error("LIST FAILED:", error.message);
    return;
  }

  console.log(
    "AUTH USERS SEEN BY SCRIPT:",
    data.users.map(u => ({
      id: u.id,
      email: u.email ?? null,
    }))
  );
}

run();