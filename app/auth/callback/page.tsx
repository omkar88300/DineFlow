"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function AuthCallbackPage() {
  const [message, setMessage] = useState(
    "Completing your invitation..."
  );

  useEffect(() => {
    async function handleAuth() {
      const supabase = createClient();

      const url = new URL(window.location.href);

      // --------------------------------------------------
      // METHOD 1: Supabase PKCE flow (?code=...)
      // --------------------------------------------------

      const code = url.searchParams.get("code");

      if (code) {
        const { error } =
          await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error(
            "Code exchange error:",
            error.message
          );

          setMessage(
            "Your invitation link is invalid or expired."
          );

          return;
        }

        window.location.replace("/reset-password");
        return;
      }

      // --------------------------------------------------
      // METHOD 2: Supabase implicit flow (#access_token=...)
      // --------------------------------------------------

      const hash = window.location.hash;

      if (hash) {
        const params = new URLSearchParams(
          hash.substring(1)
        );

        const accessToken =
          params.get("access_token");

        const refreshToken =
          params.get("refresh_token");

        if (accessToken && refreshToken) {
          const { error } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (error) {
            console.error(
              "Session error:",
              error.message
            );

            setMessage(
              "Your invitation link is invalid or expired."
            );

            return;
          }

          window.location.replace("/reset-password");
          return;
        }
      }

      // --------------------------------------------------
      // Nothing usable found
      // --------------------------------------------------

      setMessage(
        "Invalid invitation link."
      );
    }

    handleAuth();
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">

        <h1 className="text-2xl font-bold text-gray-900">
          DineFlow
        </h1>

        <p className="text-gray-500 mt-3">
          {message}
        </p>

      </div>
    </main>
  );
}