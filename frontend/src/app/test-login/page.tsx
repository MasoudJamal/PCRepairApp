"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TestLoginPage() {
  const testLogin = async () => {
    console.log("LOGIN ATTEMPT: jamal2@local.auth");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: "jamal2@local.auth",
      password: "MyTestPassword123",
    });

    console.log("DATA:", data);
    console.log("ERROR:", error);
  };

  return (
    <div style={{ padding: 40 }}>
      <button onClick={testLogin}>Test Login</button>
      <p>Open DevTools → Console</p>
    </div>
  );
}