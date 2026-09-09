"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase";

type Opportunity = {
  id: string;
  estimated_value: number;
  priority_score: number;
  probability_score: number;
  status: string;
};

type Business = {
  id: string;
  name: string;
};

export default function ROIPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
              estimated_value,
              priority_score,
              probability_score,
              status
            `
            )
            .eq("business_id", profile.business_id);

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
            : "Something went wrong while loading ROI."
        );
      } finally {
        setLoading(false);
      }
    }

    loadROI();
  }, [supabase]);

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const getInitials = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return "RV";
    }

    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const potentialRevenue = opportunities.reduce(
    (total, opportunity) =>
      total + Number(opportunity.estimated_value || 0),
    0
  );

  const recoveredRevenue = opportunities
    .filter((opportunity) => opportunity.status === "recovered")
    .reduce(
      (total, opportunity) =>
        total + Number(opportunity.estimated_value || 0),
      0
    );

  const activeOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.status !== "recovered" &&
      opportunity.status !== "closed"
  );

  const activePipeline = activeOpportunities.reduce(
    (total, opportunity) =>
      total + Number(opportunity.estimated_value || 0),
    0
  );

  const recoveryRate =
    potentialRevenue > 0
      ? (recoveredRevenue / potentialRevenue) * 100
      : 0;

  const expectedRevenue = activeOpportunities.reduce(
    (total, opportunity) =>
      total +
      Number(opportunity.estimated_value || 0) *
        (Number(opportunity.probability_score || 0) / 100),
    0
  );

  const highPriority = opportunities.filter(
    (opportunity) =>
      Number(opportunity.priority_score || 0) >= 80
  ).length;

  return (
    <main className="min-h-screen bg-[#07090d] text-white">

      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-[250px] shrink-0 border-r border-white/10 bg-[#0a0d12] p-6 lg:block">

          {/* LOGO */}
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

          {/* NAVIGATION */}
          <nav className="space-y-1.5">

            <Link
              href="/"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/opportunities"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Opportunities
            </Link>

            <Link
              href="/ai-recovery"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              AI Recovery
            </Link>

            <Link
              href="/follow-ups"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Follow-Ups
            </Link>

            <Link
              href="/roi"
              className="block w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-black"
            >
              ROI
            </Link>

            <Link
              href="/settings"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Settings
            </Link>

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

            <p className="text-sm font-medium text-gray-500">
              ROI
            </p>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
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
                    Loading ROI...
                  </p>

                </div>

              </div>

            ) : error ? (

              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">

                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  ROI Error
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Could not load ROI
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
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
                      ROI INTELLIGENCE
                    </p>

                  </div>

                  <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                    See the revenue
                    <br />
                    Revora can recover.
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-500">
                    Revenue recovery performance for{" "}
                    {business?.name || "your business"}.
                  </p>

                </div>

                {/* METRICS */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                  <Metric
                    title="Potential Revenue"
                    value={formatMoney(potentialRevenue)}
                    subtitle={`${opportunities.length} total opportunities`}
                  />

                  <Metric
                    title="Recovered Revenue"
                    value={formatMoney(recoveredRevenue)}
                    subtitle={`${recoveryRate.toFixed(1)}% recovery rate`}
                  />

                  <Metric
                    title="Expected Revenue"
                    value={formatMoney(expectedRevenue)}
                    subtitle="Probability-weighted pipeline"
                  />

                  <Metric
                    title="Active Pipeline"
                    value={formatMoney(activePipeline)}
                    subtitle={`${highPriority} high priority`}
                  />

                </div>

                {/* ROI SUMMARY */}
                <div className="mt-6 grid gap-6 lg:grid-cols-2">

                  {/* RECOVERY PERFORMANCE */}
                  <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6">

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      RECOVERY PERFORMANCE
                    </p>

                    <h3 className="mt-3 text-2xl font-semibold">
                      {recoveryRate.toFixed(1)}%
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Current revenue recovery rate.
                    </p>

                    <div className="mt-7 h-3 overflow-hidden rounded-full bg-white/10">

                      <div
                        style={{
                          width: `${Math.min(
                            Math.max(recoveryRate, 0),
                            100
                          )}%`,
                        }}
                        className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      />

                    </div>

                    <div className="mt-4 flex justify-between text-xs text-gray-500">

                      <span>
                        Recovered: {formatMoney(recoveredRevenue)}
                      </span>

                      <span>
                        Potential: {formatMoney(potentialRevenue)}
                      </span>

                    </div>

                  </div>

                  {/* EXPECTED VALUE */}
                  <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6">

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      EXPECTED VALUE
                    </p>

                    <h3 className="mt-3 text-2xl font-semibold">
                      {formatMoney(expectedRevenue)}
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      Estimated value based on each opportunity's recovery
                      probability.
                    </p>

                    <div className="mt-7 grid grid-cols-2 gap-4">

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

                        <p className="text-xs text-gray-500">
                          Active
                        </p>

                        <p className="mt-2 text-xl font-semibold">
                          {activeOpportunities.length}
                        </p>

                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">

                        <p className="text-xs text-gray-500">
                          High Priority
                        </p>

                        <p className="mt-2 text-xl font-semibold text-emerald-500">
                          {highPriority}
                        </p>

                      </div>

                    </div>

                  </div>

                </div>

                {/* OPPORTUNITY BREAKDOWN */}
                <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">

                  <div className="border-b border-white/10 p-6">

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      REVENUE BREAKDOWN
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Opportunity ROI
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Revenue and probability for each opportunity.
                    </p>

                  </div>

                  {opportunities.length === 0 ? (

                    <div className="p-10 text-center text-sm text-gray-500">
                      No opportunities available yet.
                    </div>

                  ) : (

                    <div>

                      {opportunities.map((opportunity, index) => (

                        <div
                          key={opportunity.id}
                          className={`grid gap-5 p-5 md:grid-cols-[1fr_150px_120px_120px] ${
                            index !== opportunities.length - 1
                              ? "border-b border-white/10"
                              : ""
                          }`}
                        >

                          <div>

                            <p className="font-semibold">
                              Opportunity #{index + 1}
                            </p>

                            <p className="mt-1 text-sm capitalize text-gray-500">
                              {opportunity.status}
                            </p>

                          </div>

                          <div>

                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              VALUE
                            </p>

                            <p className="mt-1 font-semibold">
                              {formatMoney(
                                Number(
                                  opportunity.estimated_value || 0
                                )
                              )}
                            </p>

                          </div>

                          <div>

                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              PROBABILITY
                            </p>

                            <p className="mt-1 font-semibold text-indigo-400">
                              {opportunity.probability_score}%
                            </p>

                          </div>

                          <div>

                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              EXPECTED
                            </p>

                           <p className="mt-1 font-semibold text-emerald-500">
  {formatMoney(
    opportunity.status === "recovered"
      ? 0
      : Number(opportunity.estimated_value || 0) *
          (Number(opportunity.probability_score || 0) / 100)
  )}
</p>

                          </div>

                        </div>

                      ))}

                    </div>

                  )}

                </div>

                <footer className="py-8 text-center text-xs text-gray-500">
                  REVORA · Revenue Recovery ROI
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

        <p className="text-sm text-gray-500">
          {title}
        </p>

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