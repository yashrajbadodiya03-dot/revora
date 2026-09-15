"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Opportunity = {
  id: string;
  title: string | null;
  estimated_value: number | null;
  priority_score: number | null;
  probability_score: number | null;
  status: string;
};

type RevenueEvent = {
  id: string;
  opportunity_id: string | null;
  amount: number | null;
  source: string | null;
  occurred_at: string | null;
};

export default function ROIPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<RevenueEvent[]>([]);
  const [businessName, setBusinessName] = useState("Business workspace");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadROI();
  }, []);

  async function loadROI() {
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

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.business_id) {
        throw new Error("No business workspace found.");
      }

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select("name")
        .eq("id", profile.business_id)
        .single();

      if (businessError) {
        throw businessError;
      }

      if (business?.name) {
        setBusinessName(business.name);
      }

      const {
        data: opportunityData,
        error: opportunityError,
      } = await supabase
        .from("opportunities")
        .select(
          "id, title, estimated_value, priority_score, probability_score, status",
        )
        .eq("business_id", profile.business_id)
        .order("created_at", {
          ascending: false,
        });

      if (opportunityError) {
        throw new Error(
          `Opportunities error: ${opportunityError.message}`,
        );
      }

      const {
        data: revenueData,
        error: revenueError,
      } = await supabase
        .from("revenue_events")
        .select(
          "id, opportunity_id, amount, source, occurred_at",
        )
        .eq("business_id", profile.business_id)
        .order("occurred_at", {
          ascending: false,
        });

      if (revenueError) {
        throw new Error(
          `Revenue events error: ${revenueError.message}`,
        );
      }

      setOpportunities(opportunityData ?? []);
      setRevenueEvents(revenueData ?? []);
    } catch (err) {
      console.error("ROI load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading ROI.",
      );
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return `$${Math.round(value).toLocaleString()}`;
  }

  function cleanTitle(title: string | null) {
    return (title ?? "Untitled Opportunity")
      .replace(/^\[REVORA DEMO\]\s*/i, "")
      .trim();
  }

  const activeOpportunities = opportunities.filter(
    (opportunity) =>
      !["recovered", "closed", "lost"].includes(
        opportunity.status,
      ),
  );

  const totalPotentialRevenue =
    activeOpportunities.reduce(
      (total, opportunity) =>
        total +
        Number(opportunity.estimated_value || 0),
      0,
    );

  const recoveredRevenue =
    revenueEvents.reduce(
      (total, event) =>
        total +
        Number(event.amount || 0),
      0,
    );

  const totalIdentifiedRevenue =
    opportunities.reduce(
      (total, opportunity) =>
        total +
        Number(opportunity.estimated_value || 0),
      0,
    );

  const expectedRevenue =
    activeOpportunities.reduce(
      (total, opportunity) => {
        const value = Number(
          opportunity.estimated_value || 0,
        );

        const probability = Number(
          opportunity.probability_score || 0,
        );

        return total + value * (probability / 100);
      },
      0,
    );

  const activePipeline =
    activeOpportunities.reduce(
      (total, opportunity) =>
        total +
        Number(opportunity.estimated_value || 0),
      0,
    );

  // High priority starts at 75.
  const highPriorityCount =
    activeOpportunities.filter(
      (opportunity) =>
        Number(opportunity.priority_score || 0) >= 75,
    ).length;

  const recoveryRate =
    totalIdentifiedRevenue > 0
      ? Math.min(
          (recoveredRevenue / totalIdentifiedRevenue) * 100,
          100,
        )
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white">
        <div className="flex min-h-screen">
          <Sidebar />

          <main className="flex-1 p-8">
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

                <p className="mt-4 text-sm text-gray-500">
                  Loading ROI...
                </p>
              </div>
            </div>
          </main>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-12">
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                REVORA · REVENUE INTELLIGENCE
              </p>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                ROI
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Measure the revenue Revora is identifying and
                recovering for {businessName}.
              </p>
            </div>

            {error && (
              <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  ROI Error
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => void loadROI()}
                  className="mt-5 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Try again
                </button>
              </div>
            )}

            {!error && (
              <>
                <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricCard
                    label="Potential Revenue"
                    value={formatCurrency(totalPotentialRevenue)}
                    description={`${activeOpportunities.length} active ${
                      activeOpportunities.length === 1
                        ? "opportunity"
                        : "opportunities"
                    }`}
                  />

                  <MetricCard
                    label="Recovered Revenue"
                    value={formatCurrency(recoveredRevenue)}
                    description={`${recoveryRate.toFixed(
                      1,
                    )}% recovery rate`}
                    valueClass="text-emerald-400"
                  />

                  <MetricCard
                    label="Expected Revenue"
                    value={formatCurrency(expectedRevenue)}
                    description="Probability-weighted active pipeline"
                    valueClass="text-indigo-400"
                  />

                  <MetricCard
                    label="Active Pipeline"
                    value={formatCurrency(activePipeline)}
                    description={`${highPriorityCount} high-priority active opportunities`}
                  />
                </div>

                <section className="rounded-3xl border border-white/10 bg-[#0c1016] p-8">
                  <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                    RECOVERY PERFORMANCE
                  </p>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-5xl font-semibold tracking-tight">
                        {recoveryRate.toFixed(1)}%
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        Current revenue recovery rate.
                      </p>
                    </div>

                    <p className="text-sm text-emerald-400">
                      {formatCurrency(recoveredRevenue)} recovered
                    </p>
                  </div>

                  <div className="mt-8 h-3 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{
                        width: `${Math.min(
                          Math.max(recoveryRate, 0),
                          100,
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs">
                    <span className="text-emerald-400">
                      Recovered: {formatCurrency(recoveredRevenue)}
                    </span>

                    <span className="text-gray-500">
                      Potential: {formatCurrency(totalPotentialRevenue)}
                    </span>
                  </div>
                </section>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <section className="rounded-3xl border border-white/10 bg-[#0c1016] p-8 lg:col-span-2">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                      EXPECTED REVENUE
                    </p>

                    <h2 className="mt-3 text-4xl font-semibold text-indigo-400">
                      {formatCurrency(expectedRevenue)}
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-gray-500">
                      Estimated revenue based on the recovery
                      probability of active opportunities.
                    </p>
                  </section>

                  <section className="rounded-3xl border border-white/10 bg-[#0c1016] p-8">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                      PIPELINE
                    </p>

                    <div className="mt-6 grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-500">Active</p>

                        <p className="mt-2 text-3xl font-semibold">
                          {activeOpportunities.length}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-500">
                          High Priority
                        </p>

                        <p className="mt-2 text-3xl font-semibold text-emerald-400">
                          {highPriorityCount}
                        </p>
                      </div>
                    </div>
                  </section>
                </div>

                <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">
                  <div className="border-b border-white/10 p-6">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                      REVENUE BREAKDOWN
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Opportunity Performance
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Revenue value, probability, and expected recovery
                      for each opportunity.
                    </p>
                  </div>

                  <div className="divide-y divide-white/10">
                    {opportunities.length === 0 ? (
                      <div className="p-10 text-center">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl text-indigo-400">
                          $
                        </div>

                        <h3 className="mt-5 text-lg font-semibold">
                          No revenue opportunities
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                          Revenue opportunities will appear here when
                          Revora identifies recoverable business.
                        </p>
                      </div>
                    ) : (
                      opportunities.map((opportunity, index) => {
                        const value = Number(
                          opportunity.estimated_value || 0,
                        );

                        const probability = Number(
                          opportunity.probability_score || 0,
                        );

                        const isInactive =
                          opportunity.status === "recovered" ||
                          opportunity.status === "lost" ||
                          opportunity.status === "closed";

                        const expected = isInactive
                          ? 0
                          : value * (probability / 100);

                        const opportunityRecovered =
                          revenueEvents
                            .filter(
                              (event) =>
                                event.opportunity_id === opportunity.id,
                            )
                            .reduce(
                              (total, event) =>
                                total + Number(event.amount || 0),
                              0,
                            );

                        return (
                          <div
                            key={opportunity.id}
                            className="p-6 transition hover:bg-white/[0.025]"
                          >
                            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">
                                  Opportunity #{index + 1}
                                </p>

                                <h3 className="mt-1 font-semibold text-white">
                                  {cleanTitle(opportunity.title)}
                                </h3>

                                <p className="mt-1 text-xs capitalize text-gray-500">
                                  {opportunity.status.replaceAll("_", " ")}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    VALUE
                                  </p>

                                  <p className="mt-1 text-lg font-semibold">
                                    {formatCurrency(value)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    PROBABILITY
                                  </p>

                                  <p className="mt-1 text-lg font-semibold text-indigo-400">
                                    {probability}%
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    EXPECTED
                                  </p>

                                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                                    {formatCurrency(expected)}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                    RECOVERED
                                  </p>

                                  <p className="mt-1 text-lg font-semibold text-emerald-400">
                                    {formatCurrency(opportunityRecovered)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">
                  <div className="border-b border-white/10 p-6">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                      REVENUE EVENTS
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Actual Recovered Revenue
                    </h2>

                    <p className="mt-1 text-sm text-gray-500">
                      Revenue recorded by Revora.
                    </p>
                  </div>

                  {revenueEvents.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm text-gray-500">
                        No revenue events recorded yet.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {revenueEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold">
                              {formatCurrency(
                                Number(event.amount || 0),
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              Source: {event.source || "Unknown"}
                            </p>
                          </div>

                          <p className="text-xs text-gray-500">
                            {event.occurred_at
                              ? new Date(
                                  event.occurred_at,
                                ).toLocaleString()
                              : "No date"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )}

            <footer className="py-8 text-center text-xs text-gray-500">
              REVORA · Revenue Recovery Engine
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  valueClass = "",
}: {
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6">
      <p className="text-sm font-medium text-gray-400">
        {label}
      </p>

      <p
        className={`mt-2 text-3xl font-semibold tracking-tight ${valueClass}`}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}