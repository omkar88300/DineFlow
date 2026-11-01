"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Checking account...");

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: staff, error } = await supabase
        .from("staff")
        .select("name, role, hotel_id, is_active")
        .eq("auth_user_id", user.id)
        .single();

      if (error || !staff) {
        setMessage("Staff account not found.");
        setLoading(false);
        return;
      }

      if (!staff.is_active) {
        await supabase.auth.signOut();
        setMessage("Your staff account is inactive.");
        setLoading(false);
        return;
      }

      if (staff.role === "admin") {
        window.location.href = "/admin";
        return;
      }

      if (staff.role === "waiter") {
        window.location.href = "/waiter";
        return;
      }

      if (staff.role === "kitchen") {
        window.location.href = "/kitchen";
        return;
      }

      if (staff.role === "billing") {
        window.location.href = "/billing";
        return;
      }

      setMessage("Unknown staff role.");
      setLoading(false);
    }

    checkUser();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="text-center">
        {loading ? (
          <>
            <h1 className="text-2xl font-bold">
              DineFlow
            </h1>

            <p className="text-gray-500 mt-2">
              Checking your account...
            </p>
          </>
        ) : (
          <p className="text-red-600 font-semibold">
            {message}
          </p>
        )}
      </div>
    </main>
  );
}