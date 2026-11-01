"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword() {
    setError("");
    setSuccess("");

    if (!password || !confirmPassword) {
      setError("Please enter both password fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();

    const { error: updateError } =
      await supabase.auth.updateUser({
        password,
      });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setSuccess(
      "Password updated successfully. Redirecting to login..."
    );

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              DineFlow
            </h1>

            <p className="text-gray-500 mt-2">
              Set your password
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-100 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-5 bg-green-100 text-green-700 px-4 py-3 rounded-xl text-sm">
              {success}
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) =>
                setConfirmPassword(e.target.value)
              }
              placeholder="Confirm new password"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleUpdatePassword}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Set Password"}
          </button>

        </div>
      </div>
    </main>
  );
}