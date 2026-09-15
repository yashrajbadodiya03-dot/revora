 "use client";

import { useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

type FollowUpStatus = "pending" | "sent" | "completed" | "cancelled";

type FollowUp = {
  id: string;
  business_id: string;
  opportunity_id: string | null;
  channel: "call" | "sms" | "email";
  message: string | null;
  scheduled_at: string;
  status: FollowUpStatus;
  created_at?: string;
};

type Opportunity = {
  id: string;
  title: string;
  estimated_value: number;
  priority_score: number;
  probability_score: number;
  customer_id: string | null;
  type: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

const STATUS_LABELS: Record<FollowUpStatus, string> = {
  pending: "Pending",
  sent: "Sent",
  completed: "Completed",
  cancelled: "Cancelled",
};

function cleanDisplayEmail(email: string) {
  return email.replace(/@demo\.revora\.local$/i, "@example.com");
}

export default function FollowUpsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | FollowUpStatus>("all");
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
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

      const { data: followUpData, error: followUpError } = await supabase
        .from("follow_ups")
        .select(
          "id, business_id, opportunity_id, channel, message, scheduled_at, status, created_at",
        )
        .eq("business_id", profile.business_id)
        .order("scheduled_at", { ascending: true });

      if (followUpError) throw followUpError;

      const loadedFollowUps = (followUpData ?? []) as FollowUp[];
      setFollowUps(loadedFollowUps);

      const opportunityIds = [
        ...new Set(
          loadedFollowUps
            .map((item) => item.opportunity_id)
            .filter((id): id is string => Boolean(id)),
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
            "id, title, estimated_value, priority_score, probability_score, customer_id, type",
          )
          .in("id", opportunityIds);

      if (opportunityError) throw opportunityError;

      const loadedOpportunities = (opportunityData ?? []) as Opportunity[];
      setOpportunities(loadedOpportunities);

      const customerIds = [
        ...new Set(
          loadedOpportunities
            .map((item) => item.customer_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];

      if (customerIds.length === 0) {
        setCustomers([]);
        return;
      }

      const { data: customerData, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email, phone")
        .in("id", customerIds);

      if (customerError) throw customerError;

      setCustomers((customerData ?? []) as Customer[]);
    } catch (err) {
      console.error("Follow-ups load error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading follow-ups.",
      );
      setFollowUps([]);
      setOpportunities([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  function getOpportunity(id: string | null) {
    if (!id) return undefined;
    return opportunities.find((item) => item.id === id);
  }

  function getCustomer(opportunityId: string | null) {
    const opportunity = getOpportunity(opportunityId);
    if (!opportunity?.customer_id) return undefined;
    return customers.find((item) => item.id === opportunity.customer_id);
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "Invalid date";

    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function statusClass(status: FollowUpStatus) {
    if (status === "completed") {
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    }

    if (status === "sent") {
      return "border-indigo-500/20 bg-indigo-500/10 text-indigo-400";
    }

    if (status === "cancelled") {
      return "border-white/10 bg-white/5 text-gray-500";
    }

    return "border-amber-500/20 bg-amber-500/10 text-amber-400";
  }

  async function updateStatus(id: string, status: FollowUpStatus) {
    setUpdatingId(id);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("follow_ups")
        .update({ status })
        .eq("id", id);

      if (updateError) throw updateError;

      await loadData();
    } catch (err) {
      console.error("Follow-up update error:", err);
      setError(
        err instanceof Error
          ? `Update failed: ${err.message}`
          : "Failed to update follow-up.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function rescheduleFollowUp() {
    if (!rescheduleId || !rescheduleValue) return;

    const date = new Date(rescheduleValue);

    if (Number.isNaN(date.getTime())) {
      setError("Please select a valid date and time.");
      return;
    }

    setUpdatingId(rescheduleId);
    setError("");

    try {
      const { error: updateError } = await supabase
        .from("follow_ups")
        .update({
          scheduled_at: date.toISOString(),
          status: "pending",
        })
        .eq("id", rescheduleId);

      if (updateError) throw updateError;

      setRescheduleId(null);
      setRescheduleValue("");
      await loadData();
    } catch (err) {
      console.error("Follow-up reschedule error:", err);
      setError(
        err instanceof Error
          ? `Reschedule failed: ${err.message}`
          : "Failed to reschedule follow-up.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const visibleFollowUps =
    filter === "all"
      ? followUps
      : followUps.filter((item) => item.status === filter);

  const pendingCount = followUps.filter(
    (item) => item.status === "pending",
  ).length;

  const sentCount = followUps.filter((item) => item.status === "sent").length;

  const completedCount = followUps.filter(
    (item) => item.status === "completed",
  ).length;

  const overdueCount = followUps.filter(
    (item) =>
      item.status === "pending" &&
      new Date(item.scheduled_at).getTime() < Date.now(),
  ).length;

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1 lg:ml-[250px]">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  REVORA · EXECUTION
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Follow-Ups
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Turn recovery recommendations into scheduled actions and track
                  every customer touchpoint.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadData()}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
              >
                Refresh
              </button>
            </header>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Follow-Up Error
                </p>
                <p className="mt-1 text-sm text-gray-400">{error}</p>
              </div>
            )}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Pending"
                value={pendingCount}
                description="Scheduled recovery actions"
              />
              <Metric
                label="Overdue"
                value={overdueCount}
                description="Need attention now"
                warning
              />
              <Metric
                label="Sent"
                value={sentCount}
                description="Actions already sent"
              />
              <Metric
                label="Completed"
                value={completedCount}
                description="Completed follow-ups"
                success
              />
            </div>

            <div className="mt-10 flex flex-wrap gap-2">
              {(["all", "pending", "sent", "completed", "cancelled"] as const).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    className={`rounded-xl border px-4 py-2.5 text-xs font-semibold capitalize transition ${
                      filter === item
                        ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                        : "border-white/10 bg-white/[0.02] text-gray-500 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {item === "all" ? "All" : STATUS_LABELS[item]}
                  </button>
                ),
              )}
            </div>

            <section className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">
              <div className="border-b border-white/10 p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  RECOVERY WORKFLOW
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Scheduled recovery actions
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Every follow-up created from AI Recovery appears here.
                </p>
              </div>

              {loading ? (
                <div className="flex min-h-[320px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
                    <p className="mt-4 text-sm text-gray-500">
                      Loading follow-ups...
                    </p>
                  </div>
                </div>
              ) : visibleFollowUps.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-xl text-indigo-400">
                    →
                  </div>

                  <h3 className="mt-5 text-lg font-semibold">
                    No follow-ups here
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    Schedule a recovery action from AI Recovery and it will
                    appear in this execution queue.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {visibleFollowUps.map((followUp) => {
                    const opportunity = getOpportunity(
                      followUp.opportunity_id,
                    );
                    const customer = getCustomer(followUp.opportunity_id);
                    const isOverdue =
                      followUp.status === "pending" &&
                      new Date(followUp.scheduled_at).getTime() < Date.now();

                    return (
                      <div
                        key={followUp.id}
                        className="p-6 transition hover:bg-white/[0.02]"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                {followUp.channel}
                              </span>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${statusClass(
                                  followUp.status,
                                )}`}
                              >
                                {STATUS_LABELS[followUp.status]}
                              </span>

                              {isOverdue && (
                                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-400">
                                  Overdue
                                </span>
                              )}
                            </div>

                            <h3 className="mt-3 text-lg font-semibold">
                              {customer?.name ||
                                opportunity?.title ||
                                "Recovery follow-up"}
                            </h3>

                            <p className="mt-1 text-xs text-gray-600">
                              {opportunity?.type?.replaceAll("_", " ") ||
                                "recovery action"}
                            </p>

                            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                              <DataItem
                                label="Scheduled"
                                value={formatDate(followUp.scheduled_at)}
                              />
                              <DataItem
                                label="Value"
                                value={formatCurrency(
                                  Number(opportunity?.estimated_value || 0),
                                )}
                              />
                              <DataItem
                                label="Priority"
                                value={String(
                                  Number(opportunity?.priority_score || 0),
                                )}
                              />
                              <DataItem
                                label="Probability"
                                value={`${Number(
                                  opportunity?.probability_score || 0,
                                )}%`}
                              />
                            </div>

                            {followUp.message && (
                              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                  RECOVERY MESSAGE
                                </p>
                                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-400">
                                  {followUp.message}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2 xl:max-w-[300px] xl:justify-end">
                            {followUp.status === "pending" && (
                              <>
                                <button
                                  type="button"
                                  disabled={updatingId === followUp.id}
                                  onClick={() =>
                                    void updateStatus(followUp.id, "sent")
                                  }
                                  className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                                >
                                  Mark Sent
                                </button>

                                <button
                                  type="button"
                                  disabled={updatingId === followUp.id}
                                  onClick={() =>
                                    void updateStatus(followUp.id, "completed")
                                  }
                                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 transition hover:bg-emerald-500/15 disabled:opacity-50"
                                >
                                  Complete
                                </button>

                                <button
                                  type="button"
                                  disabled={updatingId === followUp.id}
                                  onClick={() => {
                                    setRescheduleId(followUp.id);
                                    setRescheduleValue("");
                                  }}
                                  className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                                >
                                  Reschedule
                                </button>
                              </>
                            )}

                            {followUp.status === "sent" && (
                              <button
                                type="button"
                                disabled={updatingId === followUp.id}
                                onClick={() =>
                                  void updateStatus(followUp.id, "completed")
                                }
                                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-50"
                              >
                                Mark Completed
                              </button>
                            )}

                            {(followUp.status === "pending" ||
                              followUp.status === "sent") && (
                              <button
                                type="button"
                                disabled={updatingId === followUp.id}
                                onClick={() =>
                                  void updateStatus(followUp.id, "cancelled")
                                }
                                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            )}

                            {customer?.email && (
                              <a
                                href={`mailto:${cleanDisplayEmail(customer.email)}`}
                                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                              >
                                Email
                              </a>
                            )}

                            {customer?.phone && (
                              <a
                                href={`tel:${customer.phone}`}
                                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                              >
                                Call
                              </a>
                            )}
                          </div>
                        </div>

                        {rescheduleId === followUp.id && (
                          <div className="mt-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                              <div className="min-w-0 flex-1">
                                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                  New scheduled time
                                </p>

                                <input
                                  type="datetime-local"
                                  value={rescheduleValue}
                                  onChange={(event) =>
                                    setRescheduleValue(event.target.value)
                                  }
                                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none [color-scheme:dark] focus:border-indigo-500"
                                />
                              </div>

                              <button
                                type="button"
                                disabled={
                                  updatingId === followUp.id ||
                                  !rescheduleValue
                                }
                                onClick={() => void rescheduleFollowUp()}
                                className="rounded-xl bg-indigo-500 px-5 py-3 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                              >
                                Save New Time
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRescheduleId(null);
                                  setRescheduleValue("");
                                }}
                                className="rounded-xl border border-white/10 px-5 py-3 text-xs font-semibold text-gray-500 hover:bg-white/5 hover:text-white"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <footer className="py-10 text-center text-xs text-gray-600">
              REVORA · Revenue Recovery Execution
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
  description,
  success = false,
  warning = false,
}: {
  label: string;
  value: number;
  description: string;
  success?: boolean;
  warning?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{label}</p>
        <span
          className={`h-2 w-2 rounded-full ${
            success
              ? "bg-emerald-500"
              : warning
                ? "bg-amber-500"
                : "bg-indigo-500"
          }`}
        />
      </div>

      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-xs text-gray-600">{description}</p>
    </div>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-gray-300">
        {value}
      </p>
    </div>
  );
}

