"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase";

type Opportunity = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  estimated_value: number;
  priority_score: number;
  probability_score: number;
  status: string;
  customer?: {
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
};

type Business = {
  id: string;
  name: string;
};

type RecoveryRecommendation = {
  label: string;
  text: string;
};

export default function AIRecoveryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAIRecovery() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          window.location.href = "/login";
          return;
        }

        setUserEmail(user.email ?? "");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw new Error(`Profile error: ${profileError.message}`);
        }

        if (!profile?.business_id) {
          throw new Error(
            "Your account is not connected to a business workspace yet."
          );
        }

        const { data: businessData, error: businessError } =
          await supabase
            .from("businesses")
            .select("id, name")
            .eq("id", profile.business_id)
            .single();

        if (businessError) {
          throw new Error(`Business error: ${businessError.message}`);
        }

        setBusiness(businessData);

        const { data: opportunityData, error: opportunityError } =
          await supabase
            .from("opportunities")
            .select(
              `
              id,
              title,
              description,
              type,
              estimated_value,
              priority_score,
              probability_score,
              status,
              customer:customers(
                name,
                email,
                phone
              )
            `
            )
            .eq("business_id", profile.business_id)
            .neq("status", "recovered")
            .neq("status", "closed")
            .order("priority_score", {
              ascending: false,
            });

        if (opportunityError) {
          throw new Error(
            `Opportunities error: ${opportunityError.message}`
          );
        }

        setOpportunities(opportunityData ?? []);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading AI Recovery."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAIRecovery();
  }, [supabase]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const getInitials = (name: string) => {
    const parts = name.trim().split(" ");

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  function getRecoveryRecommendation(
    opportunity: Opportunity
  ): RecoveryRecommendation {
    const type = opportunity.type.toLowerCase();
    const probability = Number(opportunity.probability_score || 0);
    const priority = Number(opportunity.priority_score || 0);
    const value = Number(opportunity.estimated_value || 0);

    if (opportunity.status === "scheduled") {
      return {
        label: "Meeting scheduled",
        text: `Prepare for the scheduled conversation with the customer. This opportunity is worth ${formatMoney(
          value
        )} and has a ${probability}% estimated recovery probability.`,
      };
    }

    if (opportunity.status === "contacting") {
      return {
        label: "Follow up now",
        text: `Continue following up with this customer. The opportunity has a ${probability}% recovery probability and a priority score of ${priority}.`,
      };
    }

    if (type.includes("missed")) {
      return {
        label: "Call customer",
        text: `Contact this customer as soon as possible. A missed call represents a direct recovery opportunity worth ${formatMoney(
          value
        )}.`,
      };
    }

    if (type.includes("follow")) {
      return {
        label: "Send follow-up",
        text: `Send a follow-up to this customer. The current recovery probability is ${probability}%, making this worth another contact.`,
      };
    }

    if (type.includes("quote")) {
      return {
        label: "Follow up on quote",
        text: `Follow up on the quote before the opportunity goes cold. The estimated value is ${formatMoney(
          value
        )}.`,
      };
    }

    if (probability >= 80 && priority >= 80) {
      return {
        label: "Recover immediately",
        text: `This is a high-priority opportunity with an ${probability}% recovery probability. Contact the customer immediately.`,
      };
    }

    if (priority >= 80) {
      return {
        label: "High-priority follow-up",
        text: `Prioritize this customer because the opportunity has a priority score of ${priority}.`,
      };
    }

    return {
      label: "Follow up",
      text: `Follow up with this customer and assess whether the ${formatMoney(
        value
      )} opportunity can be recovered.`,
    };
  }

  const potentialRevenue = opportunities.reduce(
    (total, opportunity) =>
      total + Number(opportunity.estimated_value || 0),
    0
  );

  const highPriority = opportunities.filter(
    (opportunity) => opportunity.priority_score >= 80
  ).length;

  const averageProbability =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce(
            (total, opportunity) =>
              total + Number(opportunity.probability_score || 0),
            0
          ) / opportunities.length
        )
      : 0;

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[250px] shrink-0 border-r border-white/10 bg-[#0a0d12] p-6 lg:block">
          <div className="mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-black">
                R
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  REVORA
                </h1>

                <p className="text-xs text-gray-500">
                  Revenue Recovery
                </p>
              </div>
            </div>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => {
                window.location.href = "/";
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </button>

            <button
              onClick={() => {
                window.location.href = "/opportunities";
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Opportunities
            </button>

            <button className="w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-black">
              AI Recovery
            </button>

            <button
              onClick={() => {
                window.location.href = "/follow-ups";
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Follow-Ups
            </button>

            <button
              onClick={() => {
                window.location.href = "/roi";
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              ROI
            </button>

            <button
              onClick={() => {
                window.location.href = "/settings";
              }}
              className="w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Settings
            </button>
          </nav>

          {/* WORKSPACE */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-500">
              WORKSPACE
            </p>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-400">
                {business ? getInitials(business.name) : "RV"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {business?.name || "Loading..."}
                </p>

                <p className="truncate text-xs text-gray-500">
                  Business workspace
                </p>
              </div>
            </div>
          </div>

          {/* SYSTEM */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                System
              </span>

              <span className="flex items-center gap-1.5 text-xs text-emerald-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Operational
              </span>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">
          {/* HEADER */}
          <header className="flex h-[72px] items-center justify-between border-b border-white/10 bg-[#07090d] px-5 sm:px-6 lg:px-10">
            <div>
              <p className="text-sm font-medium text-gray-500">
                AI Recovery
              </p>
            </div>

            <div
              title={userEmail}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white"
            >
              {business ? getInitials(business.name) : "RV"}
            </div>
          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1450px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">
            {loading ? (
              <div className="flex min-h-[500px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

                  <p className="text-sm text-gray-500">
                    Loading AI Recovery...
                  </p>
                </div>
              </div>
            ) : error ? (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  AI Recovery Error
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Could not load AI Recovery
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  {error}
                </p>

                <button
                  onClick={() => {
                    window.location.reload();
                  }}
                  className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Try again
                </button>
              </div>
            ) : (
              <>
                {/* HERO */}
                <div className="mb-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-indigo-500" />

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      AI RECOVERY ENGINE
                    </p>
                  </div>

                  <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                    Turn missed revenue
                    <br />
                    into recovered revenue.
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-500">
                    AI-powered recovery recommendations for{" "}
                    {business?.name || "your business"}.
                  </p>
                </div>

                {/* METRICS */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Metric
                    title="Recoverable Revenue"
                    value={formatMoney(potentialRevenue)}
                    subtitle={`${opportunities.length} active opportunities`}
                  />

                  <Metric
                    title="High Priority"
                    value={String(highPriority)}
                    subtitle="Priority score 80+"
                  />

                  <Metric
                    title="Avg. Probability"
                    value={`${averageProbability}%`}
                    subtitle="AI recovery probability"
                  />
                </div>

                {/* AI ENGINE */}
                <div className="mt-6 rounded-3xl border border-white/10 bg-[#0c1016]">
                  <div className="border-b border-white/10 p-6">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                      AI RECOMMENDATIONS
                    </p>

                    <h3 className="mt-2 text-xl font-semibold tracking-tight">
                      Best opportunities to recover
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      Prioritized using opportunity value, priority and
                      recovery probability.
                    </p>
                  </div>

                  {opportunities.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl">
                        AI
                      </div>

                      <p className="mt-5 text-lg font-semibold">
                        No recovery opportunities
                      </p>

                      <p className="mt-2 text-sm text-gray-500">
                        Revora will show AI recovery recommendations when
                        active opportunities are available.
                      </p>
                    </div>
                  ) : (
                    <div>
                      {opportunities.map((opportunity, index) => {
                        const customerName =
                          opportunity.customer?.name ||
                          opportunity.title ||
                          "Unknown customer";

                        const recommendation =
                          getRecoveryRecommendation(opportunity);

                        return (
                          <div
                            key={opportunity.id}
                            className={`p-6 transition hover:bg-white/[0.025] ${
                              index !== opportunities.length - 1
                                ? "border-b border-white/10"
                                : ""
                            }`}
                          >
                            {/* OPPORTUNITY HEADER */}
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-bold text-indigo-400">
                                  {getInitials(customerName)}
                                </div>

                                <div className="min-w-0">
                                  <h4 className="font-semibold">
                                    {customerName}
                                  </h4>

                                  <p className="mt-1 text-sm text-gray-500">
                                    {opportunity.type}
                                  </p>

                                  {opportunity.description && (
                                    <p className="mt-2 max-w-xl text-sm leading-6 text-gray-400">
                                      {opportunity.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* STATS */}
                              <div className="grid grid-cols-3 gap-6 lg:min-w-[430px]">
                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    VALUE
                                  </p>

                                  <p className="mt-1 text-lg font-semibold">
                                    {formatMoney(
                                      Number(opportunity.estimated_value)
                                    )}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    PRIORITY
                                  </p>

                                  <p className="mt-1 text-lg font-semibold text-emerald-500">
                                    {opportunity.priority_score}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    PROBABILITY
                                  </p>

                                  <p className="mt-1 text-lg font-semibold text-indigo-400">
                                    {opportunity.probability_score}%
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* AI RECOMMENDATION */}
                            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500 text-xs font-bold text-white">
                                  AI
                                </div>

                                <div>
                                  <p className="text-sm font-semibold">
                                    Recommended recovery action
                                  </p>

                                  <p className="text-xs text-gray-500">
                                    {recommendation.label}
                                  </p>
                                </div>
                              </div>

                              <p className="mt-4 text-sm leading-6 text-gray-400">
                                {recommendation.text}
                              </p>

                              {/* ACTIONS */}
                              <div className="mt-5 flex flex-wrap gap-3">
                                {opportunity.customer?.phone && (
                                  <a
                                    href={`tel:${opportunity.customer.phone}`}
                                    className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                                  >
                                    Call Customer
                                  </a>
                                )}

                                {opportunity.customer?.email && (
                                  <a
                                    href={`mailto:${opportunity.customer.email}`}
                                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                                  >
                                    Email Customer
                                  </a>
                                )}

                                <button
                                  onClick={() => {
                                    window.location.href =
                                      "/opportunities";
                                  }}
                                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                                >
                                  View Opportunity
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* FOOTER */}
                <footer className="py-8 text-center text-xs text-gray-500">
                  REVORA · AI Revenue Recovery Engine
                </footer>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6 transition hover:border-white/20">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <span className="h-2 w-2 rounded-full bg-indigo-500" />
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-[-0.035em]">
        {value}
      </p>

      <p className="mt-2 text-xs font-medium text-emerald-500">
        {subtitle}
      </p>
    </div>
  );
}