"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function PaymentPendingPage() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);

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
              plan,
              subscription_status
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07090d] text-white">
        <div className="text-sm text-gray-500">
          Loading account...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-6 py-12 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
        <div className="w-full text-center">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10">
            <div className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>

          <p className="mt-8 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400">
            Revora
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Your Revora workspace is ready
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-gray-400">
            Your demo has been approved. To activate the full Revora
            workspace, complete your purchase and our team will activate
            your account.
          </p>

          <div className="mx-auto mt-10 max-w-xl rounded-3xl border border-white/10 bg-white/[0.025] p-7 text-left">

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                Workspace
              </p>

              <p className="mt-2 text-sm font-medium text-gray-200">
                {businessName}
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                Account
              </p>

              <p className="mt-2 text-sm text-gray-400">
                {email}
              </p>
            </div>

            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="flex items-center justify-between">

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-600">
                    Plan
                  </p>

                  <p className="mt-2 text-sm font-semibold text-white">
                    Revora Pro
                  </p>
                </div>

                <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                  Payment Required
                </div>

              </div>
            </div>

            <div className="mt-7 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">

              <div className="flex items-end justify-between">

                <div>
                  <p className="text-xs font-medium text-gray-500">
                    Implementation
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-white">
                    $10,000
                  </p>
                </div>

                <p className="text-xs text-gray-500">
                  One-time
                </p>

              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Payment terms and activation details are provided directly
                by the Revora team.
              </p>

            </div>

            <button
              type="button"
              className="mt-7 w-full rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-gray-200"
              onClick={() => {
                alert(
                  "Payment setup will be connected here."
                );
              }}
            >
              Continue to Payment
            </button>

          </div>

          <p className="mt-8 text-xs text-gray-600">
            Need help? Contact the Revora team.
          </p>

        </div>
      </div>
    </main>
  );
}