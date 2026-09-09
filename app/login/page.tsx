"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/";
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-black">
            R
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to your Revora workspace.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-white/10 bg-[#0c1016] p-7 shadow-2xl"
        >
          <label className="mb-2 block text-sm text-gray-400">
            Email
          </label>

          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          <label className="mb-2 block text-sm text-gray-400">
            Password
          </label>

          <input
            required
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            className="mb-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>

          {error && (
            <p className="mt-4 text-center text-sm text-red-400">
              {error}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-white hover:underline">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}