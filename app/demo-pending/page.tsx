"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function DemoPendingPage() {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setEmail(user.email);
      }
    }

    loadUser();
  }, []);

  async function checkAccess() {
    setChecking(true);
    setMessage("");

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
      .select(
        `
          business_id,
          business:businesses (
            plan,
            subscription_status,
            demo_access
          )
        `,
      )
      .eq("id", user.id)
      .maybeSingle();

    const business = Array.isArray(profile?.business)
      ? profile.business[0]
      : profile?.business;

    const isPaid =
      business?.plan === "paid" &&
      business?.subscription_status === "active";

    const hasDemoAccess =
      business?.demo_access === true;

    if (isPaid || hasDemoAccess) {
      window.location.href = "/";
      return;
    }

    setMessage(
      "Your demo is still pending approval. Please check again later.",
    );

    setChecking(false);
  }

  return (
    <main className="min-h-screen bg-[#070b12] text-white">
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-xl text-center">
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" />
          </div>

          <div className="mb-3 text-sm font-semibold uppercase tracking-[0.22em] text-emerald-400">
            Revora
          </div>

          <h1 className="text-4xl font-semibold tracking-tight">
            Demo access pending
          </h1>

          <p className="mx-auto mt-5 max-w-md text-base leading-7 text-slate-400">
            Your Revora demo request has been received. Our team is
            reviewing your workspace.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Account
            </div>

            <div className="mt-2 text-sm text-slate-200">
              {email || "Loading account..."}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5">
              <div>
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Status
                </div>

                <div className="mt-1 flex items-center gap-2 text-sm font-medium text-amber-300">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Pending approval
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Access
                </div>

                <div className="mt-1 text-sm text-slate-300">
                  Demo requested
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={checkAccess}
            disabled={checking}
            className="mt-8 w-full rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? "Checking access..." : "Check access status"}
          </button>

          {message && (
            <p className="mt-4 text-sm text-slate-400">
              {message}
            </p>
          )}

          <p className="mt-8 text-xs leading-5 text-slate-600">
            Once your demo is approved, this page will automatically
            allow you to enter your Revora workspace.
          </p>
        </div>
      </div>
    </main>
  );
}