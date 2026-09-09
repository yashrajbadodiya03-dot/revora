"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase";

export default function SignupPage() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSignup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          business_name: business,
        },
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (!data.user) {
      setMessage("Account could not be created.");
      setLoading(false);
      return;
    }

    setMessage(
      "Account created successfully. Check your email if confirmation is required."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-xl font-black text-black">
            R
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            Create Revora
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Start recovering revenue from your business.
          </p>
        </div>

        <form
          onSubmit={handleSignup}
          className="rounded-3xl border border-white/10 bg-[#0c1016] p-7 shadow-2xl"
        >
          <label className="mb-2 block text-sm text-gray-400">
            Your name
          </label>

          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Smith"
            className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          <label className="mb-2 block text-sm text-gray-400">
            Business name
          </label>

          <input
            required
            value={business}
            onChange={(e) => setBusiness(e.target.value)}
            placeholder="ABC Heating & Air"
            className="mb-5 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

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
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className="mb-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-indigo-500"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>

          {message && (
            <p className="mt-4 text-center text-sm text-gray-400">
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-white hover:underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}