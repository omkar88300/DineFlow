"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Please enter your email first.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();

    const { error: resetError } =
      await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setError("Password reset link sent to your email.");
    setLoading(false);
  }


  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          {/* HEADER */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              DineFlow
            </h1>

            <p className="text-gray-500 mt-2">
              Staff Login
            </p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-5 bg-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {/* EMAIL */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* PASSWORD */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* LOGIN */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <button
            type="button"
            onClick={handleForgotPassword}
            className="mt-3 w-full text-sm text-gray-600 hover:text-black underline"
          >
            Forgot password?
          </button>

        </div>

      </div>
    </main>
  );
}