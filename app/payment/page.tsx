"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function PaymentPage() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadAccount() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data: profile } = await supabase
        .from("profiles")
        .select(
          `
            business:businesses (
              name,
              payment_status
            )
          `,
        )
        .eq("id", user.id)
        .maybeSingle();

      const business = Array.isArray(profile?.business)
        ? profile.business[0]
        : profile?.business;

      setBusinessName(business?.name || "Your workspace");
      setLoading(false);
    }

    loadAccount();
  }, []);

  async function requestPayment() {
    setRequesting(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("request_payment");

    if (error) {
      setMessage(error.message);
      setRequesting(false);
      return;
    }

    setMessage(
      "Payment request created. Checkout will be connected next.",
    );

    setRequesting(false);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07090d] text-white">
        <p className="text-sm text-gray-500">
          Loading account...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">

        <header className="mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-400">
            Revora
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Activate your Revora workspace
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-gray-400">
            Your demo has been approved. Continue with the Revora
            implementation to activate your full revenue recovery
            workspace.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">

          <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-7">

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
                  Implementation
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Revora Revenue Recovery
                </h2>
              </div>

              <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Demo Approved
              </div>
            </div>

            <div className="mt-8 space-y-4">

              <div className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm text-indigo-400">
                  01
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Revenue Opportunity Detection
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Identify missed calls, old estimates, inquiries,
                    and follow-up gaps.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm text-indigo-400">
                  02
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Priority Intelligence
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Rank opportunities by value, intent, probability,
                    and urgency.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-2xl border border-white/10 bg-black/10 p-5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-sm text-indigo-400">
                  03
                </div>

                <div>
                  <p className="text-sm font-semibold">
                    Recovery Operations
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Manage follow-ups and track recovered revenue
                    from one workspace.
                  </p>
                </div>
              </div>

            </div>
          </section>

          <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.025] p-7">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-600">
              Your Workspace
            </p>

            <p className="mt-2 text-sm font-semibold text-white">
              {businessName}
            </p>

            <p className="mt-1 text-xs text-gray-600">
              {email}
            </p>

            <div className="my-7 border-t border-white/10" />

            <p className="text-xs text-gray-500">
              One-time implementation
            </p>

            <div className="mt-2 flex items-end justify-between">
              <span className="text-4xl font-semibold">
                $10,000
              </span>

              <span className="pb-1 text-xs text-gray-600">
                USD
              </span>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-semibold text-amber-300">
                Payment setup
              </p>

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Create your payment request to continue with
                checkout setup.
              </p>
            </div>

            <button
              type="button"
              disabled={requesting}
              onClick={requestPayment}
              className="mt-6 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requesting
                ? "Creating payment request..."
                : "Continue to Payment"}
            </button>

            {message && (
              <p className="mt-4 text-center text-xs leading-5 text-gray-500">
                {message}
              </p>
            )}

            <p className="mt-4 text-center text-[10px] leading-5 text-gray-600">
              No payment is processed yet.
            </p>

          </aside>

        </div>
      </div>
    </main>
  );
}