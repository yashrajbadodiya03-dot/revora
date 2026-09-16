"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function UpgradePage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);
      }
    }

    void loadAccount();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    const { error: insertError } = await supabase
      .from("access_requests")
      .insert({
        user_id: user.id,
        business_id: profile?.business_id ?? null,
        name: name.trim(),
        business_name: businessName.trim(),
        email: user.email ?? email,
        note: note.trim() || null,
      });

  if (insertError) {
  console.error("Access request error:", insertError);

  setError(
    `${insertError.message}${insertError.details ? ` — ${insertError.details}` : ""}`,
  );

  setLoading(false);
  return;
}

    setSubmitted(true);
    setLoading(false);
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-[#070a0f] px-6 py-12 text-white">
        <div className="flex min-h-[80vh] items-center justify-center">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/[0.025] p-10 text-center shadow-2xl sm:p-14">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
              <span className="text-2xl text-emerald-400">✓</span>
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-400">
              REVORA
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Request received
            </h1>

            <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-gray-500">
              Thanks. Your request has been sent to the Revora team.
              We&apos;ll review your workspace and contact you about the
              next step.
            </p>

            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="mt-8 rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200"
            >
              Back to Revora
            </button>

            <p className="mt-8 text-[11px] text-gray-700">
              Recover the revenue you&apos;re leaving behind.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a0f] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <div className="w-full max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.025] p-8 shadow-2xl sm:p-12">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-2xl font-semibold text-indigo-400">
              R
            </div>

            <p className="mt-7 text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-400">
              REVORA
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Ready for full workspace access?
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-gray-500 sm:text-base">
              Tell us a little about your business and the Revora team
              will get in touch about bringing revenue recovery
              intelligence into your operation.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-10 max-w-2xl space-y-5"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Your name
                </label>

                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="John Smith"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400">
                  Business name
                </label>

                <input
                  required
                  value={businessName}
                  onChange={(event) =>
                    setBusinessName(event.target.value)
                  }
                  placeholder="Smith HVAC"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Email
              </label>

              <input
                value={email}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-sm text-gray-500 outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-gray-400">
                Anything you&apos;d like us to know?
                <span className="ml-1 text-gray-700">(optional)</span>
              </label>

              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={4}
                placeholder="Tell us about your current follow-up process..."
                className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-indigo-500/50"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending request..." : "Request Full Access"}
            </button>
          </form>

          <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  Find
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Identify missed revenue opportunities.
                </p>
              </div>

              <div>
                <div className="text-sm font-semibold text-white">
                  Prioritize
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Focus on the opportunities that matter most.
                </p>
              </div>

              <div>
                <div className="text-sm font-semibold text-white">
                  Recover
                </div>
                <p className="mt-1 text-xs leading-5 text-gray-600">
                  Turn opportunities into recovered revenue.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              className="text-xs text-gray-600 transition hover:text-gray-400"
            >
              ← Back to Revora
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}