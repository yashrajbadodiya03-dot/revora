"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase";

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

export default function Home() {
  const supabase = useMemo(() => createClient(), []);

  const [business, setBusiness] = useState<Business | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
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

        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select("id, name")
          .eq("id", profile.business_id)
          .single();

        if (businessError) {
          throw new Error(`Business error: ${businessError.message}`);
        }

        setBusiness(businessData);

        const {
          data: opportunityData,
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .select(`
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
          `)
          .eq("business_id", profile.business_id)
          .neq("status", "closed")
          .order("priority_score", {
            ascending: false,
          });

        if (opportunityError) {
          throw new Error(
            `Opportunities error: ${opportunityError.message}`
          );
        }

    setOpportunities(
  (opportunityData ?? []).map((opportunity) => ({
    ...opportunity,
    customer: Array.isArray(opportunity.customer)
      ? opportunity.customer[0] ?? null
      : opportunity.customer ?? null,
  }))
);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading Dashboard."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
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

  const expectedRevenue = opportunities.reduce(
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

  const activeOpportunities = opportunities.filter(
    (opportunity) =>
      opportunity.status !== "recovered" &&
      opportunity.status !== "lost" &&
      opportunity.status !== "closed"
  );

  const activePipeline = activeOpportunities.reduce(
    (total, opportunity) =>
      total + Number(opportunity.estimated_value || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">

{/* SIDEBAR */}
<aside className="hidden lg:block w-[250px] shrink-0 border-r border-white/10 bg-[#0a0d12] p-6">
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
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
    >
      Dashboard
    </Link>

    <Link
      href="/opportunities"
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
    >
      Opportunities
    </Link>

    <Link
      href="/ai-recovery"
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
    >
      AI Recovery
    </Link>

    <Link
      href="/follow-ups"
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
    >
      Follow-Ups
    </Link>

    <Link
      href="/roi"
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
    >
      ROI
    </Link>

    <Link
      href="/settings"
      className="block rounded-xl px-4 py-3 text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white"
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
<button
  type="button"
  onClick={async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }}
  className="mt-4 w-full rounded-xl border border-white/10 px-4 py-3 text-left text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400"
>
  Log out
</button>
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
              Dashboard
            </p>

            <div
              title={userEmail}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white"
            >
              {business
                ? getInitials(business.name)
                : "RV"}
            </div>

          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1450px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">

            {/* LOADING */}
            {loading && (
              <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

                  <p className="text-sm text-gray-500">
                    Loading Dashboard...
                  </p>

                </div>

              </div>
            )}

            {/* ERROR */}
            {!loading && error && (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">

                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Dashboard Error
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Could not load Dashboard
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
            )}

            {/* DASHBOARD */}
            {!loading && !error && (
              <>

                {/* HERO */}
                <div className="mb-10">

                  <div className="mb-4 flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-indigo-500" />

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      REVENUE RECOVERY
                    </p>

                  </div>

                  <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                    Recover revenue
                    <br />
                    you are leaving behind.
                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-500">
                    Revenue recovery intelligence for{" "}
                    {business?.name || "your business"}.
                  </p>

                </div>

                {/* METRICS */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <Metric
                    title="Potential Revenue"
                    value={formatMoney(potentialRevenue)}
                    subtitle={`${opportunities.length} total opportunities`}
                  />

                  <Metric
                    title="Expected Revenue"
                    value={formatMoney(expectedRevenue)}
                    subtitle="Probability-weighted pipeline"
                  />

                  <Metric
                    title="High Priority"
                    value={String(highPriority)}
                    subtitle="Priority score 80+"
                  />

                  <Metric
                    title="Active Pipeline"
                    value={formatMoney(activePipeline)}
                    subtitle={`${activeOpportunities.length} active opportunities`}
                  />

                </div>

                {/* OPPORTUNITIES */}
                <div className="mt-8 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                        RECOVERY PIPELINE
                      </p>

                      <h3 className="mt-2 text-2xl font-semibold">
                        Revenue opportunities
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Prioritized opportunities that need attention.
                      </p>

                    </div>

                    <Link
                      href="/opportunities"
                      className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-gray-300 transition hover:bg-white/5"
                    >
                      View all opportunities →
                    </Link>

                  </div>

                  {opportunities.length === 0 ? (

                    <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">

                      <p className="text-sm text-gray-500">
                        No revenue opportunities found.
                      </p>

                    </div>

                  ) : (

                    <div className="mt-8 space-y-4">

                      {opportunities
                        .slice(0, 5)
                        .map((opportunity) => {

                          const customerName =
                            opportunity.customer?.name ||
                            "Unknown customer";

                          return (
                            <div
                              key={opportunity.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                            >

                              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                                <div className="min-w-0">

                                  <div className="flex items-center gap-3">

                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                                      {getInitials(customerName)}
                                    </div>

                                    <div className="min-w-0">

                                      <h4 className="truncate text-base font-semibold">
                                        {customerName}
                                      </h4>

                                      <p className="text-xs text-gray-500">
                                        {opportunity.type ||
                                          "Opportunity"}
                                      </p>

                                    </div>

                                  </div>

                                  {opportunity.description && (
                                    <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
                                      {opportunity.description}
                                    </p>
                                  )}

                                </div>

                                <div className="grid grid-cols-3 gap-6 lg:min-w-[430px]">

                                  <div>
                                    <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                      VALUE
                                    </p>

                                    <p className="mt-1 text-lg font-semibold">
                                      {formatMoney(
                                        Number(
                                          opportunity.estimated_value || 0
                                        )
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

                              <div className="mt-5 flex flex-wrap items-center gap-3">

                                <span className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-gray-400">
                                  {opportunity.status}
                                </span>

                                {opportunity.customer?.email && (
                                  <a
                                    href={`mailto:${opportunity.customer.email}`}
                                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
                                  >
                                    Email Customer
                                  </a>
                                )}

                                <Link
                                  href="/opportunities"
                                  className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                                >
                                  View Opportunity
                                </Link>

                              </div>

                            </div>
                          );
                        })}

                    </div>
                  )}

                </div>

                {/* QUICK ACTIONS */}
                <div className="mt-8 grid gap-4 md:grid-cols-3">

                  <QuickAction
                    title="AI Recovery"
                    description="Find the best opportunities to recover."
                    href="/ai-recovery"
                  />

                  <QuickAction
                    title="Follow-Ups"
                    description="See customers that need another touch."
                    href="/follow-ups"
                  />

                  <QuickAction
                    title="ROI Intelligence"
                    description="Measure your potential recovered revenue."
                    href="/roi"
                  />

                </div>

                {/* FOOTER */}
                <footer className="py-8 text-center text-xs text-gray-500">
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
      className="block rounded-3xl border border-white/10 bg-[#0c1016] p-6 text-left transition hover:border-indigo-500/40 hover:bg-white/[0.03]"
    >

      <div className="flex items-center justify-between">

        <h3 className="text-base font-semibold">
          {title}
        </h3>

        <span className="text-indigo-400">
          →
        </span>

      </div>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {description}
      </p>

    </Link>
  );
}