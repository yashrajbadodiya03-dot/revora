"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function OnboardingPage() {
  const [businessId, setBusinessId] = useState("");
  const [step, setStep] = useState(1);

  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("HVAC");
  const [serviceArea, setServiceArea] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [missedCallRecovery, setMissedCallRecovery] = useState(true);
  const [estimateRecovery, setEstimateRecovery] = useState(true);
  const [inquiryRecovery, setInquiryRecovery] = useState(true);
  const [noFollowUpRecovery, setNoFollowUpRecovery] = useState(true);
  const [recoveryDelayMinutes, setRecoveryDelayMinutes] = useState(15);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadWorkspace() {
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
              id,
              name,
              industry,
              service_area,
              contact_phone,
              onboarding_status,
              plan,
              subscription_status,
              missed_call_recovery,
              estimate_recovery,
              inquiry_recovery,
              no_follow_up_recovery,
              recovery_delay_minutes
            )
          `,
        )
        .eq("id", user.id)
        .maybeSingle();

      const business = Array.isArray(profile?.business)
        ? profile.business[0]
        : profile?.business;

      if (!business) {
        setMessage("Workspace could not be loaded.");
        setLoading(false);
        return;
      }

      const isPaid =
        business.plan === "paid" &&
        business.subscription_status === "active";

      if (!isPaid) {
        window.location.href = "/";
        return;
      }

      if (business.onboarding_status === "complete") {
        window.location.href = "/";
        return;
      }

      setBusinessId(business.id);
      setBusinessName(business.name || "");
      setIndustry(business.industry || "HVAC");
      setServiceArea(business.service_area || "");
      setContactPhone(business.contact_phone || "");

      setMissedCallRecovery(
        business.missed_call_recovery ?? true,
      );
      setEstimateRecovery(
        business.estimate_recovery ?? true,
      );
      setInquiryRecovery(
        business.inquiry_recovery ?? true,
      );
      setNoFollowUpRecovery(
        business.no_follow_up_recovery ?? true,
      );
      setRecoveryDelayMinutes(
        business.recovery_delay_minutes ?? 15,
      );

      setLoading(false);
    }

    loadWorkspace();
  }, []);

  function continueToRecovery() {
    if (!businessName.trim() || !serviceArea.trim()) {
      setMessage(
        "Business name and service area are required.",
      );
      return;
    }

    setMessage("");
    setStep(2);
  }

  async function completeSetup() {
    if (!businessId) return;

    setSaving(true);
    setMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("businesses")
      .update({
        name: businessName.trim(),
        industry: industry.trim(),
        service_area: serviceArea.trim(),
        contact_phone: contactPhone.trim() || null,
        missed_call_recovery: missedCallRecovery,
        estimate_recovery: estimateRecovery,
        inquiry_recovery: inquiryRecovery,
        no_follow_up_recovery: noFollowUpRecovery,
        recovery_delay_minutes: recoveryDelayMinutes,
        onboarding_status: "complete",
      })
      .eq("id", businessId);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-slate-400">
            Loading workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-400">
            REVORA · Workspace Setup
          </p>

          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Configure your recovery workspace.
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Set up your business and choose which revenue
            recovery workflows Revora should monitor.
          </p>
        </div>

        <div className="mb-6 flex items-center gap-3">
          <div
            className={`h-2 flex-1 rounded-full ${
              step >= 1
                ? "bg-emerald-400"
                : "bg-white/10"
            }`}
          />

          <div
            className={`h-2 flex-1 rounded-full ${
              step >= 2
                ? "bg-emerald-400"
                : "bg-white/10"
            }`}
          />
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl">
          {step === 1 ? (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold text-white">
                  Step 1 · Business profile
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Basic information for your Revora workspace.
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Business name
                  </label>

                  <input
                    value={businessName}
                    onChange={(event) =>
                      setBusinessName(event.target.value)
                    }
                    placeholder="Your HVAC company"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Industry
                  </label>

                  <select
                    value={industry}
                    onChange={(event) =>
                      setIndustry(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50"
                  >
                    <option value="HVAC">HVAC</option>
                    <option value="Plumbing">
                      Plumbing
                    </option>
                    <option value="Electrical">
                      Electrical
                    </option>
                    <option value="Home Services">
                      Home Services
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Primary service area
                  </label>

                  <input
                    value={serviceArea}
                    onChange={(event) =>
                      setServiceArea(event.target.value)
                    }
                    placeholder="Dallas, TX"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-300">
                    Business phone
                  </label>

                  <input
                    value={contactPhone}
                    onChange={(event) =>
                      setContactPhone(event.target.value)
                    }
                    placeholder="+1 (555) 123-4567"
                    className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-emerald-400/50"
                  />
                </div>
              </div>

              {message && (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {message}
                </div>
              )}

              <div className="mt-8 flex justify-end">
                <button
                  onClick={continueToRecovery}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Continue →
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <p className="text-sm font-semibold text-white">
                  Step 2 · Recovery configuration
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Choose which revenue opportunities Revora
                  should recover.
                </p>
              </div>

              <div className="space-y-3">
                <RecoveryToggle
                  title="Missed-call recovery"
                  description="Recover revenue from calls your team does not answer."
                  enabled={missedCallRecovery}
                  onChange={setMissedCallRecovery}
                />

                <RecoveryToggle
                  title="Estimate recovery"
                  description="Follow up with customers whose estimates have gone cold."
                  enabled={estimateRecovery}
                  onChange={setEstimateRecovery}
                />

                <RecoveryToggle
                  title="Website inquiry recovery"
                  description="Respond to website inquiries before they go cold."
                  enabled={inquiryRecovery}
                  onChange={setInquiryRecovery}
                />

                <RecoveryToggle
                  title="No-follow-up recovery"
                  description="Surface opportunities that have stopped receiving follow-up."
                  enabled={noFollowUpRecovery}
                  onChange={setNoFollowUpRecovery}
                />
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
                <label className="block text-sm font-semibold text-white">
                  Recovery delay
                </label>

                <p className="mt-1 text-xs text-slate-500">
                  How long Revora should wait before scheduling
                  a recovery action.
                </p>

                <select
                  value={recoveryDelayMinutes}
                  onChange={(event) =>
                    setRecoveryDelayMinutes(
                      Number(event.target.value),
                    )
                  }
                  className="mt-4 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400/50"
                >
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 hour</option>
                </select>
              </div>

              {message && (
                <div className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {message}
                </div>
              )}

              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => {
                    setMessage("");
                    setStep(1);
                  }}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5"
                >
                  ← Back
                </button>

                <button
                  onClick={completeSetup}
                  disabled={saving}
                  className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : "Complete Workspace Setup →"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function RecoveryToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-5 text-left transition hover:border-white/20"
    >
      <div className="pr-6">
        <p className="text-sm font-semibold text-white">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      </div>

      <div
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          enabled ? "bg-emerald-400" : "bg-slate-700"
        }`}
      >
        <div
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </div>
    </button>
  );
}