"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase";

type FollowUp = {
  id: string;
  business_id: string;
  opportunity_id: string | null;
  channel: string | null;
  scheduled_at: string | null;
};

type Opportunity = {
  id: string;
  customer_id: string;
  title: string | null;
  estimated_value: number | null;
  priority_score: number | null;
  probability_score: number | null;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export default function FollowUpsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadFollowUps();
  }, []);

  async function loadFollowUps() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error("No business workspace found.");
      }

      const { data: followUpData, error: followUpError } =
        await supabase
          .from("follow_ups")
          .select(
            "id, business_id, opportunity_id, channel, scheduled_at"
          )
          .eq("business_id", profile.business_id)
          .order("scheduled_at", {
            ascending: true,
          });

      if (followUpError) {
        throw new Error(
          `Follow-ups error: ${followUpError.message}`
        );
      }

      const loadedFollowUps = followUpData ?? [];

      setFollowUps(loadedFollowUps);

      const opportunityIds = [
        ...new Set(
          loadedFollowUps
            .map((item) => item.opportunity_id)
            .filter(
              (id): id is string => Boolean(id)
            )
        ),
      ];

      if (opportunityIds.length === 0) {
        setOpportunities([]);
        setCustomers([]);
        return;
      }

      const { data: opportunityData, error: opportunityError } =
        await supabase
          .from("opportunities")
          .select(
            "id, customer_id, title, estimated_value, priority_score, probability_score"
          )
          .in("id", opportunityIds);

      if (opportunityError) {
        throw new Error(
          `Opportunities error: ${opportunityError.message}`
        );
      }

      const loadedOpportunities = opportunityData ?? [];

      setOpportunities(loadedOpportunities);

      const customerIds = [
        ...new Set(
          loadedOpportunities
            .map((item) => item.customer_id)
            .filter(
              (id): id is string => Boolean(id)
            )
        ),
      ];

      if (customerIds.length === 0) {
        setCustomers([]);
        return;
      }

      const { data: customerData, error: customerError } =
        await supabase
          .from("customers")
          .select("id, name, email, phone")
          .in("id", customerIds);

      if (customerError) {
        throw new Error(
          `Customers error: ${customerError.message}`
        );
      }

      setCustomers(customerData ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading follow-ups."
      );
    } finally {
      setLoading(false);
    }
  }

  function getOpportunity(opportunityId: string | null) {
    return opportunities.find(
      (opportunity) => opportunity.id === opportunityId
    );
  }

  function getCustomer(opportunityId: string | null) {
    const opportunity = getOpportunity(opportunityId);

    if (!opportunity) return undefined;

    return customers.find(
      (customer) => customer.id === opportunity.customer_id
    );
  }

  function formatDate(date: string | null) {
    if (!date) return "Not scheduled";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return date;
    }

    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(parsedDate);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] p-8 text-white">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

            <p className="mt-4 text-sm text-gray-500">
              Loading follow-ups...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8">
          <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
            REVORA
          </p>

          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            Follow-Ups
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Customers that need another touch.
          </p>
        </div>

        {error ? (
          <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
              Follow-Up Error
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Could not load follow-ups
            </h2>

            <p className="mt-3 text-sm text-gray-500">
              {error}
            </p>

            <button
              onClick={loadFollowUps}
              className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Try again
            </button>
          </div>
        ) : followUps.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-xl">
              ↗
            </div>

            <h2 className="mt-5 text-xl font-semibold">
              No follow-ups yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Customers that need another touch will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">

            <div className="border-b border-white/10 p-6">
              <h2 className="text-lg font-semibold">
                Follow-Up Queue
              </h2>

              <p className="mt-1 text-xs text-gray-500">
                {followUps.length} follow-up
                {followUps.length !== 1 ? "s" : ""} found
              </p>
            </div>

            <div className="divide-y divide-white/10">
              {followUps.map((followUp) => {
                const opportunity = getOpportunity(
                  followUp.opportunity_id
                );

                const customer = getCustomer(
                  followUp.opportunity_id
                );

                const customerName =
                  customer?.name ||
                  opportunity?.title ||
                  "Unknown Customer";

                return (
                  <div
                    key={followUp.id}
                    className="p-6 transition hover:bg-white/[0.025]"
                  >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 font-bold text-indigo-400">
                          {customerName
                            .split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>

                        <div>
                          <h3 className="font-semibold">
                            {customerName}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {customer?.email || "No email"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs capitalize text-indigo-400">
                              {followUp.channel || "follow-up"}
                            </span>

                            {opportunity && (
                              <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-400">
                                {opportunity.title || "Opportunity"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                          SCHEDULED
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatDate(followUp.scheduled_at)}
                        </p>
                      </div>

                      {opportunity && (
                        <div className="grid grid-cols-3 gap-6">

                          <div>
                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              VALUE
                            </p>

                            <p className="mt-1 text-lg font-semibold">
                              $
                              {Number(
                                opportunity.estimated_value || 0
                              ).toLocaleString()}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              PRIORITY
                            </p>

                            <p className="mt-1 text-lg font-semibold text-emerald-500">
                              {opportunity.priority_score ?? 0}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              PROBABILITY
                            </p>

                            <p className="mt-1 text-lg font-semibold text-indigo-400">
                              {opportunity.probability_score ?? 0}%
                            </p>
                          </div>

                        </div>
                      )}
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">

                      {customer?.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                        >
                          Call Customer
                        </a>
                      )}

                      {customer?.email && (
                        <a
                          href={`mailto:${customer.email}`}
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
                        className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5"
                      >
                        View Opportunity
                      </button>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <footer className="py-8 text-center text-xs text-gray-500">
          REVORA · Revenue Recovery Engine
        </footer>
      </div>
    </main>
  );
}