import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("ENV CHECK:", {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20),
});

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase env variables");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const pg = new Client({
  connectionString: DATABASE_URL,
});

async function run() {
  await pg.connect();

  const result = await pg.query<{ email: string }>(`
    select email
    from auth.users
    where email is not null
    order by created_at
  `);

  console.log(
    "SQL USERS FOUND:",
    result.rows.map((r: { email: string }) => r.email)
  );

  for (const { email } of result.rows) {
    console.log(`Creating auth user: ${email}`);

    const { error } = await supabase.auth.admin.createUser({
      email,
      password: "TempPassword123!",
      email_confirm: true,
    });

    if (error) {
      console.error("FAILED:", error.message);
    } else {
      console.log("✅ CREATED");
    }
  }

  await pg.end();
}

run().catch(console.error);