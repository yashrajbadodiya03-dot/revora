"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

type OpportunityStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "recovered"
  | "closed"
  | "lost";

type OpportunityType =
  | "missed_call"
  | "unanswered_inquiry"
  | "old_estimate"
  | "no_follow_up";

type Opportunity = {
  id: string;
  title: string;
  type: OpportunityType;
  estimated_value: number | null;
  priority_score: number | null;
  probability_score: number | null;
  status: OpportunityStatus;
  created_at: string;
};

type RevenueEvent = {
  amount: number | null;
};

type DashboardStats = {
  potentialRevenue: number;
  activeOpportunities: number;
  highPriority: number;
  recoveredRevenue: number;
  recoveryRate: number;
};

const emptyStats: DashboardStats = {
  potentialRevenue: 0,
  activeOpportunities: 0,
  highPriority: 0,
  recoveredRevenue: 0,
  recoveryRate: 0,
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isActiveOpportunity(opportunity: Opportunity) {
  return !["recovered", "closed", "lost"].includes(
    opportunity.status,
  );
}

function typeLabel(type: OpportunityType) {
  switch (type) {
    case "missed_call":
      return "Missed Call";
    case "unanswered_inquiry":
      return "Unanswered Inquiry";
    case "old_estimate":
      return "Old Estimate";
    case "no_follow_up":
      return "No Follow-Up";
    default:
      return type;
  }
}

function statusLabel(status: OpportunityStatus) {
  switch (status) {
    case "new":
      return "New";
    case "contacted":
      return "Contacted";
    case "qualified":
      return "Qualified";
    case "recovered":
      return "Recovered";
    case "closed":
      return "Closed";
    case "lost":
      return "Lost";
    default:
      return status;
  }
}

function statusClass(status: OpportunityStatus) {
  switch (status) {
    case "new":
      return "border-indigo-500/20 bg-indigo-500/10 text-indigo-300";
    case "contacted":
      return "border-sky-500/20 bg-sky-500/10 text-sky-300";
    case "qualified":
      return "border-amber-500/20 bg-amber-500/10 text-amber-300";
    case "recovered":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-300";
    case "closed":
      return "border-slate-500/20 bg-slate-500/10 text-slate-300";
    case "lost":
      return "border-rose-500/20 bg-rose-500/10 text-rose-300";
    default:
      return "border-white/10 bg-white/5 text-gray-400";
  }
}

function priorityClass(priority: number) {
  if (priority >= 80) return "text-rose-400";
  if (priority >= 75) return "text-amber-400";
  return "text-gray-400";
}

function Metric({
  title,
  value,
  subtitle,
  success = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  success?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-5 transition hover:border-white/15 sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{title}</p>

        <span
          className={`h-2 w-2 rounded-full ${
            success ? "bg-emerald-500" : "bg-indigo-500"
          }`}
        />
      </div>

      <p className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white">
        {value}
      </p>

      <p
        className={`mt-2 text-xs font-medium ${
          success ? "text-emerald-500" : "text-gray-500"
        }`}
      >
        {subtitle}
      </p>
    </div>
  );
}

function OpportunityCard({
  opportunity,
}: {
  opportunity: Opportunity;
}) {
  const priority = Number(opportunity.priority_score || 0);
  const probability = Number(opportunity.probability_score || 0);
  const value = Number(opportunity.estimated_value || 0);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-white/15">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-sm font-bold text-indigo-400">
              !
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 break-words text-base font-semibold text-white">
                  {opportunity.title}
                </h3>

                <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] capitalize text-gray-500">
                  {typeLabel(opportunity.type)}
                </span>

                <span
                  className={`rounded-md border px-2 py-1 text-[10px] font-medium ${statusClass(
                    opportunity.status,
                  )}`}
                >
                  {statusLabel(opportunity.status)}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Highest-priority active recovery opportunity
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 lg:min-w-[430px] lg:gap-6">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
              VALUE
            </p>

            <p className="mt-1 break-words text-lg font-semibold text-white">
              {formatMoney(value)}
            </p>

            <p className="mt-1 text-[10px] text-gray-600">
              Potential value
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
              PRIORITY
            </p>

            <p
              className={`mt-1 text-lg font-semibold ${priorityClass(
                priority,
              )}`}
            >
              {priority}
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
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
        <span className="text-xs text-gray-600">
          Created {formatDate(opportunity.created_at)}
        </span>

        <span className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-2.5 text-xs font-semibold text-indigo-300">
          Score {priority}
        </span>

        <Link
          href="/opportunities"
          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
        >
          View Opportunity
        </Link>
      </div>
    </div>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-3xl border border-white/10 bg-[#0c1016] p-6 transition hover:border-indigo-500/30 hover:bg-white/[0.03]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white">
          {title}
        </h3>

        <span className="text-indigo-400">→</span>
      </div>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>
    </Link>
  );
}

export default function DashboardPage() {
  const supabase = useMemo(() => createClient(), []);

  const [stats, setStats] =
    useState<DashboardStats>(emptyStats);

  const [activeOpportunities, setActiveOpportunities] =
    useState<Opportunity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadDashboard() {
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
        throw new Error(
          "You must be signed in to view the dashboard.",
        );
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!profile?.business_id) {
        throw new Error(
          "No business is associated with your account.",
        );
      }

      const [
        {
          data: opportunityData,
          error: opportunityError,
        },
        {
          data: revenueData,
          error: revenueError,
        },
      ] = await Promise.all([
        supabase
          .from("opportunities")
          .select(
            `
              id,
              title,
              type,
              estimated_value,
              priority_score,
              probability_score,
              status,
              created_at
            `,
          )
          .eq("business_id", profile.business_id)
          .order("priority_score", {
            ascending: false,
            nullsFirst: false,
          }),

        supabase
          .from("revenue_events")
          .select("amount")
          .eq("business_id", profile.business_id),
      ]);

      if (opportunityError) {
        throw opportunityError;
      }

      if (revenueError) {
        throw revenueError;
      }

      const opportunities =
        (opportunityData || []) as Opportunity[];

      const revenueRows =
        (revenueData || []) as RevenueEvent[];

      const activeRows =
        opportunities.filter(isActiveOpportunity);

      const potentialRevenue = activeRows.reduce(
        (sum, opportunity) =>
          sum +
          Number(opportunity.estimated_value || 0),
        0,
      );

      const highPriority = activeRows.filter(
        (opportunity) =>
          Number(opportunity.priority_score || 0) >= 75,
      ).length;

      const recoveredRevenue = revenueRows.reduce(
        (sum, event) =>
          sum + Number(event.amount || 0),
        0,
      );

      const totalIdentifiedRevenue =
        potentialRevenue + recoveredRevenue;

      const recoveryRate =
        totalIdentifiedRevenue > 0
          ? (recoveredRevenue /
              totalIdentifiedRevenue) *
            100
          : 0;

      setStats({
        potentialRevenue,
        activeOpportunities: activeRows.length,
        highPriority,
        recoveredRevenue,
        recoveryRate,
      });

      setActiveOpportunities(activeRows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load dashboard.",
      );

      setStats(emptyStats);
      setActiveOpportunities([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#07090d] text-white">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        {/* Desktop sidebar slot.
            The actual sidebar is fixed, while this 250px column
            keeps the dashboard content in the correct position. */}
        <div className="relative hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile sidebar/header */}
        <div className="lg:hidden">
          <Sidebar />
        </div>

        <section className="min-w-0 w-full">
  <div className="w-full px-4 py-6 sm:px-7 sm:py-8 lg:px-8 xl:px-10">
            <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  EXECUTIVE INTELLIGENCE
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Executive Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Revenue opportunities that need action.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/opportunities"
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                >
                  View Opportunities
                </Link>
              </div>
            </header>

            {error && (
              <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
                <p className="text-sm text-gray-500">
                  Loading dashboard...
                </p>
              </div>
            ) : (
              <>
                <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Metric
                    title="Potential Revenue"
                    value={formatMoney(
                      stats.potentialRevenue,
                    )}
                    subtitle={`${stats.activeOpportunities} active ${
                      stats.activeOpportunities === 1
                        ? "opportunity"
                        : "opportunities"
                    }`}
                  />

                  <Metric
                    title="Active Opportunities"
                    value={String(
                      stats.activeOpportunities,
                    )}
                    subtitle={
                      stats.activeOpportunities === 1
                        ? "Requires recovery action"
                        : "Require recovery action"
                    }
                  />

                  <Metric
                    title="Recovered Revenue"
                    value={formatMoney(
                      stats.recoveredRevenue,
                    )}
                    subtitle={`${stats.recoveryRate.toFixed(
                      1,
                    )}% recovery rate`}
                    success
                  />

                  <Metric
                    title="High Priority"
                    value={String(stats.highPriority)}
                    subtitle="Priority score ≥ 75"
                  />
                </section>

                <section className="mt-10">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                        ACTION REQUIRED
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-white">
                          Priority Queue
                        </h2>

                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-400">
                          {activeOpportunities.length}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-gray-500">
                        Highest-priority opportunities that need action.
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xs text-gray-500">
                        Recoverable pipeline
                      </p>

                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatMoney(
                          stats.potentialRevenue,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {activeOpportunities.length === 0 ? (
                      <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                          ✓
                        </div>

                        <h3 className="mt-5 text-base font-semibold text-white">
                          No active opportunities
                        </h3>

                        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                          Your recovery queue is clear. New missed calls,
                          inquiries, estimates, and follow-up gaps will
                          appear here.
                        </p>

                        <Link
                          href="/opportunities"
                          className="mt-6 inline-flex rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                        >
                          Open Opportunities
                        </Link>
                      </div>
                    ) : (
                      activeOpportunities
                        .slice(0, 6)
                        .map((opportunity) => (
                          <OpportunityCard
                            key={opportunity.id}
                            opportunity={opportunity}
                          />
                        ))
                    )}
                  </div>
                </section>

                <section className="mt-10">
                  <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-5 sm:p-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                          RECOVERY OVERVIEW
                        </p>

                        <h2 className="mt-2 text-xl font-semibold text-white">
                          Current revenue recovery position
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          Revenue identified and recovered by Revora.
                        </p>
                      </div>

                      <Link
                        href="/roi"
                        className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                      >
                        Open ROI →
                      </Link>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Metric
                        title="Recoverable Pipeline"
                        value={formatMoney(
                          stats.potentialRevenue,
                        )}
                        subtitle={`${stats.activeOpportunities} active ${
                          stats.activeOpportunities === 1
                            ? "opportunity"
                            : "opportunities"
                        }`}
                      />

                      <Metric
                        title="Recovered"
                        value={formatMoney(
                          stats.recoveredRevenue,
                        )}
                        subtitle="Actual recovered revenue"
                        success
                      />

                      <Metric
                        title="Recovery Rate"
                        value={`${stats.recoveryRate.toFixed(
                          1,
                        )}%`}
                        subtitle="Based on identified revenue"
                      />

                      <Metric
                        title="High Priority"
                        value={String(
                          stats.highPriority,
                        )}
                        subtitle="Priority score ≥ 75"
                      />
                    </div>
                  </div>
                </section>

                <section className="mt-10 grid gap-4 md:grid-cols-3">
                  <QuickAction
                    title="AI Recovery"
                    description="Let Revora surface the highest-value opportunities."
                    href="/ai-recovery"
                  />

                  <QuickAction
                    title="Follow-Ups"
                    description="Review scheduled recovery actions and follow-up status."
                    href="/follow-ups"
                  />

                  <QuickAction
                    title="ROI Intelligence"
                    description="Measure revenue recovered by Revora."
                    href="/roi"
                  />
                </section>

                <footer className="py-10 text-center text-xs text-gray-600">
                  REVORA · Revenue Recovery Engine
                </footer>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}