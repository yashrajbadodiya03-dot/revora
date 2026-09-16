"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setGoogleLoading(false);
      return;
    }

    if (data?.url) {
      window.location.assign(data.url);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#07090d] text-white">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-220px] h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-indigo-500/[0.08] blur-[120px]" />
        <div className="absolute bottom-[-250px] left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-blue-500/[0.04] blur-[120px]" />
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="w-full max-w-[410px]">
          {/* Logo */}
          <div className="mb-10 flex justify-center">
            <a href="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-black shadow-lg shadow-white/5">
                R
              </div>

              <div className="text-left">
                <div className="text-sm font-bold tracking-[0.18em]">
                  REVORA
                </div>

                <div className="text-[10px] tracking-wide text-white/30">
                  REVENUE RECOVERY
                </div>
              </div>
            </a>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
           <h1 className="text-[30px] font-semibold tracking-[-0.03em]">
  Welcome back
</h1>

            <p className="mt-2 text-sm text-white/40">
              Sign in to your Revora workspace.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#0d1117]/90 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl">
            <form onSubmit={handleLogin}>
              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-medium text-white/60">
                  Email
                </label>

                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  autoComplete="email"
                  className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#080b10] px-4 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              {/* Password */}
              <div className="mt-5">
                <label className="mb-2 block text-xs font-medium text-white/60">
                  Password
                </label>

                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-xl border border-white/[0.09] bg-[#080b10] px-4 text-sm text-white placeholder:text-white/20 outline-none transition focus:border-indigo-500/70 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Sign in */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="mt-6 h-12 w-full rounded-xl bg-white text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-white/[0.08]" />

              <span className="text-[10px] font-medium tracking-[0.16em] text-white/25">
                OR
              </span>

              <div className="h-px flex-1 bg-white/[0.08]" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/[0.10] bg-white text-sm font-semibold text-[#111] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21.805 12.23c0-.79-.07-1.55-.225-2.28H12v4.31h5.495a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.67Z"
                  fill="#4285F4"
                />

                <path
                  d="M12 22c2.755 0 5.065-.91 6.755-2.47l-3.3-2.56c-.91.61-2.07.97-3.455.97-2.66 0-4.91-1.8-5.72-4.22H3.87v2.64A10.2 10.2 0 0 0 12 22Z"
                  fill="#34A853"
                />

                <path
                  d="M6.28 13.72A6.13 6.13 0 0 1 5.96 12c0-.6.11-1.18.32-1.72V7.64H3.87A10.2 10.2 0 0 0 1.8 12c0 1.64.39 3.19 1.07 4.36l3.41-2.64Z"
                  fill="#FBBC05"
                />

                <path
                  d="M12 6.06c1.5 0 2.84.52 3.9 1.54l2.93-2.93C17.06 3.05 14.755 2 12 2a10.2 10.2 0 0 0-8.13 4.64l3.41 2.64C8.09 7.86 9.34 6.06 12 6.06Z"
                  fill="#EA4335"
                />
              </svg>

              {googleLoading ? "Connecting..." : "Continue with Google"}
            </button>
          </div>

          {/* Signup */}
          <p className="mt-7 text-center text-sm text-white/35">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="font-medium text-white transition hover:text-indigo-300"
            >
              Create one
            </a>
          </p>

          {/* Bottom */}
          <div className="mt-8 text-center text-[10px] uppercase tracking-[0.14em] text-white/15">
            Revora · Revenue Recovery Platform
          </div>
        </div>
      </div>
    </main>
  );
}