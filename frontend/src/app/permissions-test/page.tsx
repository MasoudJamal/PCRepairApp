"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";

type TestResult = {
  label: string;
  status: "OK" | "FORBIDDEN" | "ERROR";
  message?: string;
};

export default function PermissionsTestPage() {
  const supabase = createSupabaseClient();

  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [results, setResults] = useState<TestResult[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error || !user) {
        setUserInfo(null);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, username, role, showroom_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setUserInfo({ error: profileError.message });
      } else {
        setUserInfo({
          email: user.email,
          ...profile,
        });
      }

      setLoading(false);
    };

    loadUser();
  }, []);

  const runTest = async (label: string, action: () => Promise<any>) => {
    try {
      await action();
      setResults((r) => [...r, { label, status: "OK" }]);
    } catch (err: any) {
      setResults((r) => [
        ...r,
        {
          label,
          status: "FORBIDDEN",
          message: err?.message ?? "Permission denied",
        },
      ]);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading user…</div>;
  }

  if (!userInfo) {
    return (
      <div style={{ padding: 24, color: "red" }}>
        Not authenticated. Please log in first.
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>
        Permissions Test Console
      </h1>

      <pre
        style={{
          background: "#020617",
          color: "#e5e7eb",
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
{JSON.stringify(userInfo, null, 2)}
      </pre>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          onClick={() =>
            runTest("Edit Intake", () =>
              supabase
                .from("repairs")
                .update({ intake_notes: "test" })
                .eq("id", "b4f2950a-212d-41a6-b817-c7d329368925")
            )
          }
        >
          Edit Intake
        </button>

        <button
          onClick={() =>
            runTest("Edit Diagnosis", () =>
              supabase
                .from("repairs")
                .update({ diagnosis: "test" })
                .eq("id", "b4f2950a-212d-41a6-b817-c7d329368925")
            )
          }
        >
          Edit Diagnosis
        </button>

        <button
          onClick={() =>
            runTest("Change Price", () =>
              supabase
                .from("repairs")
                .update({ price: 123 })
                .eq("id", "b4f2950a-212d-41a6-b817-c7d329368925")
            )
          }
        >
          Change Price
        </button>

        <button
          onClick={() =>
            runTest("Customer Approval", () =>
              supabase
                .from("repairs")
                .update({ customer_approved_at: new Date().toISOString() })
                .eq("id", "b4f2950a-212d-41a6-b817-c7d329368925")
            )
          }
        >
          Customer Approval
        </button>

        <button
          onClick={() =>
            runTest("Showroom Approval", () =>
              supabase
                .from("repairs")
                .update({ showroom_approved_at: new Date().toISOString() })
                .eq("id", "b4f2950a-212d-41a6-b817-c7d329368925")
            )
          }
        >
          Showroom Approval
        </button>
      </div>

      <h2 style={{ marginTop: 32 }}>Results</h2>

      <ul>
        {results.map((r, i) => (
          <li key={i}>
            <strong>{r.label}</strong>: {r.status}
            {r.message && ` — ${r.message}`}
          </li>
        ))}
      </ul>
    </div>
  );
}