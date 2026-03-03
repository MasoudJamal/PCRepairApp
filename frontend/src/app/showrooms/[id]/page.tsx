"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ShowroomDetailsCard from "@/components/showrooms/ShowroomDetailsCard";
import { createSupabaseClient } from "@/lib/supabase/client";


export default function ShowroomDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  const supabase = createSupabaseClient();

  const [showroom, setShowroom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!id) return;

    const fetchShowroom = async () => {
      const { data, error } = await supabase
        .from("showrooms")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Failed to load showroom", error);
      } else {
        setShowroom(data);
      }

      setLoading(false);
    };

    fetchShowroom();
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 text-gray-400">
        Loading showroom…
      </div>
    );
  }

  if (!showroom) {
    return (
      <div className="p-6 text-red-400">
        Showroom not found
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ShowroomDetailsCard showroom={showroom} />

      {/* Back button */}
      <div className="mt-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-gray-400 hover:text-white"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}