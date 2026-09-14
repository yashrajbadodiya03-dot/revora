"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";
import { calculateOpportunityScore } from "@/lib/opportunity-scoring";

type Opportunity = {
  id: string;
  business_id: string;
  customer_id: string | null;
  type: string;
  title: string;
  description: string | null;
  estimated_value: number;
  priority_score: number;
  intent_score?: number;
  probability_score: number;
  status: string;
  created_at?: string;
  recoveryScore?: number;
  expectedRecovery?: number;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type RecommendedChannel = "call" | "email";

function scoringType(type: string) {
  if (type === "unanswered_inquiry") return "inquiry" as const;
  if (type === "missed_call") return "missed_call" as const;
  if (type === "old_estimate") return "old_estimate" as const;
  return "no_follow_up" as const;
}

function cleanTitle(title: string) {
  return title.replace(/^\[REVORA DEMO\]\s*/i, "").trim();
}

export default function AIRecoveryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [followUpOpportunity, setFollowUpOpportunity] =
    useState<Opportunity | null>(null);

  const [followUpChannel, setFollowUpChannel] =
    useState<RecommendedChannel>("email");

  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);

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

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
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

      const { data: opportunityData, error: opportunityError } =
        await supabase
          .from("opportunities")
          .select(
            `
              id,
              business_id,
              customer_id,
              type,
              title,
              description,
              estimated_value,
              priority_score,
              intent_score,
              probability_score,
              status,
              created_at
            `,
          )
          .eq("business_id", profile.business_id)
          .neq("status", "recovered")
          .neq("status", "closed")
          .neq("status", "lost")
          .order("created_at", {
            ascending: false,
          });

      if (opportunityError) {
        throw new Error(
          `Opportunities error: ${opportunityError.message}`,
        );
      }

      const loadedOpportunities = opportunityData ?? [];

      if (loadedOpportunities.length === 0) {
        setOpportunities([]);
        setCustomers([]);
        return;
      }

      const customerIds = [
        ...new Set(
          loadedOpportunities
            .map((item) => item.customer_id)
            .filter(
              (id): id is string => Boolean(id),
            ),
        ),
      ];

      let loadedCustomers: Customer[] = [];

      if (customerIds.length > 0) {
        const {
          data: customerData,
          error: customerError,
        } = await supabase
          .from("customers")
          .select("id, name, email, phone")
          .in("id", customerIds);

        if (customerError) {
          throw new Error(
            `Customers error: ${customerError.message}`,
          );
        }

        loadedCustomers = customerData ?? [];
      }

      setCustomers(loadedCustomers);

      const rankedOpportunities: Opportunity[] =
        loadedOpportunities
          .map((opportunity) => {
            const value = Math.max(
              0,
              Number(opportunity.estimated_value || 0),
            );

            // Keep the business scores stored in Supabase intact.
            // The AI Recovery score is a presentation/ranking score that
            // blends the existing business signals into one clear number.
            const priority = Math.max(
              0,
              Math.min(100, Number(opportunity.priority_score || 0)),
            );
            const probability = Math.max(
              0,
              Math.min(100, Number(opportunity.probability_score || 0)),
            );
            const intent = Math.max(
              0,
              Math.min(100, Number(opportunity.intent_score || 0)),
            );

            const recoveryScore = Math.round(
              priority * 0.5 +
                probability * 0.3 +
                intent * 0.2,
            );

            return {
              ...opportunity,
              recoveryScore,
              expectedRecovery: Math.round(
                value * (probability / 100),
              ),
            };
          })
          .sort(
            (a, b) =>
              (b.recoveryScore ?? 0) -
              (a.recoveryScore ?? 0),
          );

      setOpportunities(rankedOpportunities);
    } catch (err) {
      console.error(
        "AI Recovery load error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading AI Recovery.",
      );

      setOpportunities([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  }

  function getCustomer(customerId: string | null) {
    if (!customerId) {
      return undefined;
    }

    return customers.find(
      (customer) => customer.id === customerId,
    );
  }

  const recoverableRevenue = opportunities.reduce(
    (total, opportunity) =>
      total +
      Number(opportunity.estimated_value || 0),
    0,
  );

  const expectedRecovery = opportunities.reduce(
    (total, opportunity) =>
      total +
      Number(opportunity.expectedRecovery || 0),
    0,
  );

  const highPriority = opportunities.filter(
    (opportunity) =>
      Number(opportunity.recoveryScore || 0) >= 75,
  ).length;

  const averageProbability =
    opportunities.length > 0
      ? Math.round(
          opportunities.reduce(
            (total, opportunity) =>
              total +
              Number(
                opportunity.probability_score || 0,
              ),
            0,
          ) / opportunities.length,
        )
      : 0;

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function getScoreLabel(score: number) {
    if (score >= 85) {
      return {
        label: "Critical",
        className:
          "border-red-500/20 bg-red-500/10 text-red-400",
      };
    }

    if (score >= 75) {
      return {
        label: "High",
        className:
          "border-amber-500/20 bg-amber-500/10 text-amber-400",
      };
    }

    if (score >= 60) {
      return {
        label: "Medium",
        className:
          "border-indigo-500/20 bg-indigo-500/10 text-indigo-400",
      };
    }

    return {
      label: "Low",
      className:
        "border-white/10 bg-white/5 text-gray-400",
    };
  }

  function getRecommendation(
    opportunity: Opportunity,
  ) {
    const priority = Number(
      opportunity.priority_score || 0,
    );

    const probability = Number(
      opportunity.probability_score || 0,
    );

    const value = Number(
      opportunity.estimated_value || 0,
    );

    if (priority >= 90) {
      return "Contact immediately. This opportunity has exceptional recovery priority.";
    }

    if (probability >= 85) {
      return "Strong recovery probability. Follow up as soon as possible.";
    }

    if (value >= 30000) {
      return "High-value opportunity. Use personalized outreach and prioritize a direct conversation.";
    }

    if (opportunity.type === "missed_call") {
      return "Call back quickly. Missed calls are time-sensitive recovery opportunities.";
    }

    if (opportunity.type === "unanswered_inquiry") {
      return "Respond quickly and move the customer toward the next step.";
    }

    if (opportunity.type === "old_estimate") {
      return "Reconnect with the customer and determine whether they are still considering the estimate.";
    }

    if (opportunity.type === "no_follow_up") {
      return "Customer has not received timely follow-up. Re-engage now.";
    }

    return "Follow up with a personalized recovery message.";
  }

  function getRecommendedChannel(
    opportunity: Opportunity,
    customer?: Customer,
  ): RecommendedChannel {
    if (
      opportunity.type === "missed_call" ||
      opportunity.type === "no_follow_up"
    ) {
      return "call";
    }

    if (
      opportunity.priority_score >= 85 &&
      customer?.phone
    ) {
      return "call";
    }

    if (customer?.email) {
      return "email";
    }

    return "call";
  }

  function getWhyItMatters(
    opportunity: Opportunity,
  ) {
    const reasons: string[] = [];

    if (opportunity.priority_score >= 80) {
      reasons.push("high priority");
    }

    if (opportunity.probability_score >= 70) {
      reasons.push("strong recovery probability");
    }

    if (Number(opportunity.estimated_value) >= 5000) {
      reasons.push("meaningful revenue at risk");
    }

    if (opportunity.type === "missed_call") {
      reasons.push("time-sensitive missed call");
    }

    if (opportunity.type === "old_estimate") {
      reasons.push("existing buying intent");
    }

    if (opportunity.type === "unanswered_inquiry") {
      reasons.push("customer already initiated contact");
    }

    if (reasons.length === 0) {
      return "This opportunity has enough recovery potential to justify proactive follow-up.";
    }

    if (reasons.length === 1) {
      return `Revora identified ${reasons[0]} as the primary recovery signal.`;
    }

    return `Revora detected ${reasons
      .slice(0, 3)
      .join(", ")}.`;
  }

  function openFollowUp(
    opportunity: Opportunity,
    channel?: RecommendedChannel,
  ) {
    const customer = getCustomer(
      opportunity.customer_id,
    );

    const recommendedChannel =
      channel ??
      getRecommendedChannel(
        opportunity,
        customer,
      );

    setFollowUpOpportunity(opportunity);
    setFollowUpChannel(recommendedChannel);

    const aiRecommendation = getRecommendation(opportunity);

    setFollowUpMessage(
      recommendedChannel === "email"
        ? `Hi ${
            customer?.name || "there"
          },

I wanted to follow up regarding your recent request. ${aiRecommendation}

We would be happy to help with the next step and answer any questions you may have.

Please let us know a convenient time to connect.

Best regards`
        : `Call ${
            customer?.name || "customer"
          } and discuss the opportunity. ${aiRecommendation}`,
    );

    setFollowUpDate("");
  }

  async function createFollowUp() {
    if (!followUpOpportunity) {
      return;
    }

    if (!followUpDate) {
      alert(
        "Please select a follow-up date and time.",
      );
      return;
    }

    if (!followUpMessage.trim()) {
      alert(
        "Please enter a follow-up message.",
      );
      return;
    }

    setFollowUpSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        alert("You are not logged in.");
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

      if (
        profileError ||
        !profile?.business_id
      ) {
        alert(
          `Profile error: ${
            profileError?.message ||
            "Business not found."
          }`,
        );
        return;
      }

      const scheduledDate = new Date(
        followUpDate,
      );

      if (
        Number.isNaN(
          scheduledDate.getTime(),
        )
      ) {
        alert(
          "Please select a valid date and time.",
        );
        return;
      }

      const { error } = await supabase
        .from("follow_ups")
        .insert({
          business_id:
            profile.business_id,
          opportunity_id:
            followUpOpportunity.id,
          channel: followUpChannel,
          message:
            followUpMessage.trim(),
          scheduled_at:
            scheduledDate.toISOString(),
          status: "pending",
        });

      if (error) {
        console.error(
          "FOLLOW-UP ERROR:",
          error,
        );

        alert(
          `Could not schedule follow-up: ${error.message}`,
        );

        return;
      }

      setFollowUpOpportunity(null);
      setFollowUpMessage("");
      setFollowUpDate("");
      setFollowUpChannel("email");

      alert(
        "Follow-up scheduled successfully!",
      );
    } catch (err) {
      console.error(
        "Unexpected follow-up error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : String(err),
      );
    } finally {
      setFollowUpSaving(false);
    }
  }

  function viewOpportunity() {
    window.location.href =
      "/opportunities";
  }

  if (loading) {
    return (
      <main className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_28%),#07090d] text-white">
        <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
          <div className="relative hidden lg:block">
            <Sidebar />
          </div>

          <div className="lg:hidden">
            <Sidebar />
          </div>

          <main className="flex min-h-screen min-w-0 items-center justify-center p-6 lg:p-8">
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

                <p className="mt-4 text-sm text-gray-500">
                  Loading AI Recovery...
                </p>
              </div>
            </div>
          </main>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.10),_transparent_28%),#07090d] text-white">
      <div className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)]">
        <div className="relative hidden lg:block">
          <Sidebar />
        </div>

        <div className="lg:hidden">
          <Sidebar />
        </div>

        {/* MAIN CONTENT */}
        <main className="min-w-0 w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-[1500px]">

            {/* HEADER */}
            <div className="mb-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                    REVORA · RECOVERY ENGINE
                  </p>

                  <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
                    Revenue Recovery Intelligence
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Revora ranks active opportunities by recovery potential, explains why they matter, and turns the next best action into a workflow.
                  </p>
                </div>

                {opportunities.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/15 bg-[#0c1016]/90 px-4 py-3 shadow-lg shadow-black/20">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      </span>

                      <div>
                        <p className="text-xs font-semibold text-white">
                          Decision engine active
                        </p>

                        <p className="mt-0.5 text-[11px] text-gray-500">
                          Ranking{" "}
                          {opportunities.length}{" "}
                          active{" "}
                          {opportunities.length ===
                          1
                            ? "opportunity"
                            : "opportunities"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  AI Recovery Error
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  {error}
                </p>

                <button
                  onClick={loadData}
                  type="button"
                  className="mt-5 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Try again
                </button>
              </div>
            )}

            {/* METRICS */}
            <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Recoverable Revenue"
                value={formatCurrency(
                  recoverableRevenue,
                )}
                description="Active revenue still at risk"
                accent="indigo"
              />

              <MetricCard
                label="Expected Recovery"
                value={formatCurrency(
                  expectedRecovery,
                )}
                description="Probability-weighted value"
                accent="emerald"
              />

              <MetricCard
                label="Active Opportunities"
                value={opportunities.length.toString()}
                description="Require recovery action"
                accent="slate"
              />

              <MetricCard
                label="High Priority"
                value={highPriority.toString()}
                description={`Average probability ${averageProbability}%`}
                accent="amber"
              />
            </div>

            {/* DECISION ENGINE */}
            {opportunities.length > 0 && (
              <div className="mb-8 overflow-hidden rounded-[28px] border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.10] via-[#0c1016] to-[#0c1016] shadow-2xl shadow-black/20">
                <div className="flex flex-col gap-6 p-6 sm:p-7 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300">
                        ✦
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Revora decision engine</p>
                        <p className="mt-0.5 text-xs text-gray-500">Scores value, priority, intent, and recovery probability.</p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-2 sm:grid-cols-4">
                      {[
                        ["01", "Detect", "Signals"],
                        ["02", "Rank", "Recovery score"],
                        ["03", "Recommend", "Next action"],
                        ["04", "Recover", "ROI tracked"],
                      ].map(([step, title, caption]) => (
                        <div key={step} className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3">
                          <p className="text-[9px] font-semibold tracking-[0.18em] text-indigo-300">{step}</p>
                          <p className="mt-1 text-xs font-semibold text-white">{title}</p>
                          <p className="mt-0.5 text-[10px] text-gray-600">{caption}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 rounded-[24px] border border-white/10 bg-black/20 px-6 py-5 text-left lg:min-w-[180px] lg:text-center">
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-500">TOP RECOVERY SCORE</p>
                    <p className="mt-1 text-4xl font-semibold tracking-tight text-indigo-300">{opportunities[0]?.recoveryScore ?? 0}</p>
                    <p className="mt-1 text-[11px] text-gray-500">Highest-ranked opportunity</p>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION HEADER */}
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">
                    Priority recovery queue
                  </h2>

                  {opportunities.length > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                      AI PRIORITIZED
                    </span>
                  )}
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  Start at the top. Revora has already ranked the opportunities where action can have the greatest recovery impact.
                </p>
              </div>

              {opportunities.length > 0 && (
                <span className="text-sm text-gray-500">
                  {opportunities.length}{" "}
                  {opportunities.length ===
                  1
                    ? "opportunity"
                    : "opportunities"}
                </span>
              )}
            </div>

            {/* EMPTY STATE */}
            {opportunities.length === 0 ? (
              <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-2xl text-indigo-400">
                  ✦
                </div>

                <h2 className="mt-5 text-xl font-semibold">
                  No recovery opportunities
                </h2>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  New opportunities will appear here when Revora identifies recoverable revenue.
                </p>

                <Link
                  href="/opportunities"
                  className="mt-6 inline-flex rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white"
                >
                  View Opportunities
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {opportunities.map(
                  (opportunity, index) => {
                    const customer =
                      getCustomer(
                        opportunity.customer_id,
                      );

                    const score =
                      getScoreLabel(
                        opportunity.recoveryScore ??
                          0,
                      );

                    const recommendedChannel =
                      getRecommendedChannel(
                        opportunity,
                        customer,
                      );

                    const expected = Number(
                      opportunity.expectedRecovery ||
                        0,
                    );

                    const value = Number(
                      opportunity.estimated_value ||
                        0,
                    );

                    const recoveryProbability =
                      Number(
                        opportunity.probability_score ||
                          0,
                      );

                    return (
                      <div
                        key={opportunity.id}
                        className={`rounded-[28px] border bg-[#0c1016]/95 p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-indigo-500/25 sm:p-6 ${
                          index === 0
                            ? "border-indigo-500/20"
                            : "border-white/10"
                        }`}
                      >
                        {index === 0 && (
                          <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.05] px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/15 text-[10px] font-bold text-indigo-300">1</span>
                              <span className="text-[10px] font-semibold tracking-[0.16em] text-indigo-300">TOP RECOVERY OPPORTUNITY</span>
                            </div>
                            <span className="text-[10px] font-medium text-gray-500">Action first</span>
                          </div>
                        )}

                        {/* TOP ROW */}
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-4">
                            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-bold text-indigo-400">
                              {customer?.name
                                ?.split(" ")
                                .map(
                                  (word) =>
                                    word[0],
                                )
                                .join("")
                                .slice(0, 2)
                                .toUpperCase() ||
                                "C"}

                              {index === 0 && (
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[9px] font-bold text-white">
                                  1
                                </span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
                                  Recovery Score{" "}
                                  {
                                    opportunity.recoveryScore
                                  }
                                </span>

                                <span
                                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${score.className}`}
                                >
                                  {score.label}
                                </span>

                                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs capitalize text-gray-400">
                                  {opportunity.type.replaceAll(
                                    "_",
                                    " ",
                                  )}
                                </span>
                              </div>

                              <h3 className="text-lg font-semibold text-white">
                                {customer?.name ||
                                  cleanTitle(opportunity.title)}
                              </h3>

                              <p className="mt-1 text-xs font-medium text-indigo-300/80">
                                {cleanTitle(opportunity.title)}
                              </p>

                              <p className="mt-1 text-sm text-gray-500">
                                {opportunity.description ||
                                  "Revenue recovery opportunity"}
                              </p>
                            </div>
                          </div>

                          {/* EXPECTED RECOVERY */}
                          <div className="shrink-0 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-5 py-4 lg:min-w-[210px]">
                            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                              EXPECTED RECOVERY
                            </p>

                            <p className="mt-1 text-3xl font-semibold tracking-tight text-emerald-300">
                              {formatCurrency(
                                expected,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {
                                recoveryProbability
                              }
                              % probability
                            </p>
                          </div>
                        </div>

                        {/* AI INSIGHT GRID */}
                        <div className="mt-6 grid gap-4 lg:grid-cols-2">
                          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs text-indigo-400">
                                ✦
                              </span>

                              <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-500">
                                WHY THIS MATTERS
                              </p>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-gray-400">
                              {getWhyItMatters(
                                opportunity,
                              )}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-xs text-indigo-400">
                                  →
                                </span>

                                <p className="text-[10px] font-semibold tracking-[0.14em] text-indigo-400">
                                  RECOMMENDED ACTION
                                </p>
                              </div>

                              <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold capitalize text-gray-400">
                                {
                                  recommendedChannel
                                }
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-gray-300">
                              {getRecommendation(
                                opportunity,
                              )}
                            </p>
                          </div>
                        </div>

                        {/* DATA STRIP */}
                        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
                          <ScoreItem
                            label="Revenue at risk"
                            value={formatCurrency(
                              value,
                            )}
                          />

                          <ScoreItem
                            label="Priority"
                            value={String(
                              opportunity.priority_score,
                            )}
                          />

                          <ScoreItem
                            label="Intent"
                            value={`${Number(
                              opportunity.intent_score ||
                                0,
                            )}%`}
                          />

                          <ScoreItem
                            label="Probability"
                            value={`${recoveryProbability}%`}
                          />
                        </div>

                        {/* ACTION BAR */}
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openFollowUp(
                                  opportunity,
                                  "call",
                                )
                              }
                              className={`rounded-xl px-5 py-2.5 text-xs font-semibold text-white transition ${
                                recommendedChannel ===
                                "call"
                                  ? "bg-indigo-500 hover:bg-indigo-400"
                                  : "border border-white/10 bg-white/5 hover:bg-white/10"
                              }`}
                            >
                              Call customer

                              {recommendedChannel ===
                                "call" && (
                                <span className="ml-2 opacity-70">
                                  Recommended
                                </span>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openFollowUp(
                                  opportunity,
                                  "email",
                                )
                              }
                              disabled={
                                !customer?.email
                              }
                              className={`rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold transition ${
                                customer?.email
                                  ? "bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white"
                                  : "cursor-not-allowed bg-white/[0.02] text-gray-600"
                              }`}
                              title={
                                customer?.email
                                  ? "Schedule an email follow-up"
                                  : "Customer has no email address"
                              }
                            >
                              Draft email

                              {recommendedChannel ===
                                "email" && (
                                <span className="ml-2 text-indigo-400">
                                  Recommended
                                </span>
                              )}
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={
                              viewOpportunity
                            }
                            className="rounded-xl border border-white/10 px-5 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                          >
                            Open opportunity →
                          </button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            )}

            <footer className="py-10 text-center text-xs text-gray-600">
              REVORA · Recovery Intelligence
            </footer>
          </div>
        </main>
      </div>

      {/* FOLLOW-UP MODAL */}
      {followUpOpportunity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setFollowUpOpportunity(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#0c1016] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                  REVORA · RECOVERY ACTION
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Schedule Follow-Up
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Turn the AI recommendation into a scheduled recovery action.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFollowUpOpportunity(null)
                }
                className="rounded-lg px-3 py-2 text-gray-500 transition hover:bg-white/5 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* OPPORTUNITY SUMMARY */}
            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/[0.05] p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-white">
                    {getCustomer(
                      followUpOpportunity.customer_id,
                    )?.name ||
                      followUpOpportunity.title}
                  </p>

                  <p className="mt-1 text-xs capitalize text-gray-500">
                    {followUpOpportunity.type.replaceAll(
                      "_",
                      " ",
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Expected
                  </p>

                  <p className="text-sm font-semibold text-emerald-400">
                    {formatCurrency(
                      followUpOpportunity.expectedRecovery ??
                        0,
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {/* CUSTOMER */}
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500">
                  CUSTOMER
                </p>

                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                  {getCustomer(
                    followUpOpportunity.customer_id,
                  )?.name ||
                    "Unknown Customer"}
                </div>
              </div>

              {/* CHANNEL */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-gray-500">
                    CHANNEL
                  </p>

                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                    AI recommended
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFollowUpChannel(
                        "call",
                      )
                    }
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      followUpChannel ===
                      "call"
                        ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/5"
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      Call
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500">
                      Direct conversation
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFollowUpChannel(
                        "email",
                      )
                    }
                    disabled={
                      !getCustomer(
                        followUpOpportunity.customer_id,
                      )?.email
                    }
                    className={`rounded-xl border px-4 py-3 text-left transition ${
                      followUpChannel ===
                      "email"
                        ? "border-indigo-500/40 bg-indigo-500/10 text-white"
                        : "border-white/10 bg-white/[0.02] text-gray-400 hover:bg-white/5"
                    } ${
                      !getCustomer(
                        followUpOpportunity.customer_id,
                      )?.email
                        ? "cursor-not-allowed opacity-40"
                        : ""
                    }`}
                  >
                    <p className="text-sm font-semibold">
                      Email
                    </p>

                    <p className="mt-1 text-[11px] text-gray-500">
                      Personalized outreach
                    </p>
                  </button>
                </div>
              </div>

              {/* DATE */}
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wider text-gray-500">
                  SCHEDULED AT
                </p>

                <input
                  type="datetime-local"
                  value={followUpDate}
                  onChange={(event) =>
                    setFollowUpDate(
                      event.target.value,
                    )
                  }
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none [color-scheme:dark] focus:border-indigo-500"
                />
              </div>

              {/* MESSAGE */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-wider text-gray-500">
                    RECOVERY MESSAGE
                  </p>

                  <span className="text-[10px] text-gray-600">
                    Editable
                  </span>
                </div>

                <textarea
                  value={followUpMessage}
                  onChange={(event) =>
                    setFollowUpMessage(
                      event.target.value,
                    )
                  }
                  rows={6}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
                />
              </div>

              {/* SAVE */}
              <button
                type="button"
                onClick={createFollowUp}
                disabled={followUpSaving}
                className="w-full rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {followUpSaving
                  ? "Scheduling..."
                  : `Schedule ${
                      followUpChannel ===
                      "call"
                        ? "Call"
                        : "Email"
                    } Follow-Up`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  description,
  accent,
}: {
  label: string;
  value: string;
  description: string;
  accent:
    | "indigo"
    | "emerald"
    | "amber"
    | "slate";
}) {
  const accentClasses = {
    indigo:
      "bg-indigo-500/10 text-indigo-400",
    emerald:
      "bg-emerald-500/10 text-emerald-400",
    amber:
      "bg-amber-500/10 text-amber-400",
    slate:
      "bg-white/5 text-gray-400",
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016]/95 p-5 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:border-white/15">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">
          {label}
        </p>

        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${accentClasses[accent]}`}
        >
          ✦
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

function ScoreItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#0c1016] px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-gray-300">
        {value}
      </p>
    </div>
  );
}