"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { calculateOpportunityScore } from "@/lib/opportunity-scoring";

type OpportunityType =
  | "missed_call"
  | "unanswered_inquiry"
  | "old_estimate"
  | "no_follow_up";

type OpportunityStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "recovered"
  | "closed"
  | "lost";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type Opportunity = {
  id: string;
  business_id: string;
  customer_id: string | null;
  type: OpportunityType;
  title: string | null;
  description: string | null;
  estimated_value: number | null;
  priority_score: number | null;
  probability_score: number | null;
  status: OpportunityStatus;
  created_at: string;
  customer?: Customer | null;
};

type RecoveryOpportunity = Opportunity & {
  customer: Customer | null;
  recoveryScore: number;
  recoveryProbability: number;
  expectedRecovery: number;
  urgency: "critical" | "high" | "medium" | "low";
  recommendedAction: string;
  reason: string;
  recoveryChannel: "call" | "email";
  actionScheduled: boolean;
};

type WorkspaceConfig = {
  missed_calls_enabled: boolean;
  estimates_enabled: boolean;
  inquiries_enabled: boolean;
  no_follow_up_enabled: boolean;
  recovery_delay_minutes: number;
};

const defaultConfig: WorkspaceConfig = {
  missed_calls_enabled: true,
  estimates_enabled: true,
  inquiries_enabled: true,
  no_follow_up_enabled: true,
  recovery_delay_minutes: 5,
};

export default function AIRecoveryPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<
    RecoveryOpportunity[]
  >([]);

  const [businessName, setBusinessName] = useState(
    "Business workspace",
  );

  const [config, setConfig] =
    useState<WorkspaceConfig>(defaultConfig);

  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] =
    useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

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

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error(
          "No business workspace found.",
        );
      }

      const businessId = profile.business_id;

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select(
          `
            name,
            missed_calls_enabled,
            estimates_enabled,
            inquiries_enabled,
            no_follow_up_enabled,
            recovery_action_delay_minutes
          `,
        )
        .eq("id", businessId)
        .single();

      if (businessError) throw businessError;

      const workspaceConfig: WorkspaceConfig = {
        missed_calls_enabled:
          business?.missed_calls_enabled ?? true,

        estimates_enabled:
          business?.estimates_enabled ?? true,

        inquiries_enabled:
          business?.inquiries_enabled ?? true,

        no_follow_up_enabled:
          business?.no_follow_up_enabled ?? true,

        recovery_delay_minutes: Math.min(
          Math.max(
            Number(
              business?.recovery_action_delay_minutes ??
                5,
            ),
            1,
          ),
          1440,
        ),
      };

      setConfig(workspaceConfig);

      if (business?.name) {
        setBusinessName(business.name);
      }

      const {
        data: opportunityData,
        error: opportunityError,
      } = await supabase
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
            probability_score,
            status,
            created_at,
            customer:customers (
              id,
              name,
              email,
              phone
            )
          `,
        )
        .eq("business_id", businessId)
        .in("status", [
          "new",
          "contacted",
          "qualified",
        ])
        .order("priority_score", {
          ascending: false,
        });

      if (opportunityError) {
        throw new Error(
          `Opportunities error: ${opportunityError.message}`,
        );
      }

      const {
        data: followUpData,
        error: followUpError,
      } = await supabase
        .from("follow_ups")
        .select(
          `
            id,
            opportunity_id,
            channel,
            status,
            scheduled_at
          `,
        )
        .eq("business_id", businessId)
        .eq("status", "pending");

      if (followUpError) {
        throw new Error(
          `Follow-ups error: ${followUpError.message}`,
        );
      }

      const pendingIds = new Set(
        (followUpData ?? [])
          .map(
            (followUp) =>
              followUp.opportunity_id,
          )
          .filter(Boolean),
      );

      const mapped: RecoveryOpportunity[] =
        (opportunityData ?? [])
          .filter((opportunity) => {
            if (
              opportunity.type ===
              "missed_call"
            ) {
              return workspaceConfig.missed_calls_enabled;
            }

            if (
              opportunity.type ===
              "old_estimate"
            ) {
              return workspaceConfig.estimates_enabled;
            }

            if (
              opportunity.type ===
              "unanswered_inquiry"
            ) {
              return workspaceConfig.inquiries_enabled;
            }

            if (
              opportunity.type ===
              "no_follow_up"
            ) {
              return workspaceConfig.no_follow_up_enabled;
            }

            return false;
          })
          .map((opportunity) => {
            const customer = Array.isArray(
              opportunity.customer,
            )
              ? opportunity.customer[0] ?? null
              : opportunity.customer ?? null;

            const hoursSinceCreated =
              Math.max(
                0,
                (Date.now() -
                  new Date(
                    opportunity.created_at,
                  ).getTime()) /
                  (1000 * 60 * 60),
              );

            let scoringType:
              | "missed_call"
              | "old_estimate"
              | "inquiry"
              | "no_follow_up";

            switch (opportunity.type) {
              case "missed_call":
                scoringType =
                  "missed_call";
                break;

              case "old_estimate":
                scoringType =
                  "old_estimate";
                break;

              case "unanswered_inquiry":
                scoringType = "inquiry";
                break;

              default:
                scoringType =
                  "no_follow_up";
            }

            const calculatedScore =
              calculateOpportunityScore({
                type: scoringType,
                revenue: Number(
                  opportunity.estimated_value ||
                    0,
                ),
                hoursSinceCreated,
                status:
                  opportunity.status ===
                  "qualified"
                    ? "in_progress"
                    : opportunity.status ===
                        "new"
                      ? "new"
                      : "contacted",
                customerResponded: false,
                followUpCount: 0,
              });

            const recoveryScore =
              opportunity.priority_score ??
              calculatedScore.score;

            const recoveryProbability =
              opportunity.probability_score ??
              calculatedScore.recoveryProbability;

            const value = Number(
              opportunity.estimated_value ||
                0,
            );

            const urgency =
              recoveryScore >= 85
                ? "critical"
                : recoveryScore >= 75
                  ? "high"
                  : recoveryScore >= 50
                    ? "medium"
                    : "low";

            let recommendedAction =
              "Start follow-up sequence";

            if (recoveryScore >= 85) {
              recommendedAction =
                "Immediate personal outreach";
            } else if (
              opportunity.type ===
              "missed_call"
            ) {
              recommendedAction =
                "Priority callback";
            } else if (
              opportunity.type ===
              "old_estimate"
            ) {
              recommendedAction =
                "Send estimate follow-up";
            } else if (
              opportunity.type ===
              "unanswered_inquiry"
            ) {
              recommendedAction =
                "Respond to inquiry";
            }

            const recoveryChannel =
              opportunity.type ===
              "old_estimate"
                ? "email"
                : "call";

            return {
              ...opportunity,
              customer,
              recoveryScore,
              recoveryProbability,
              expectedRecovery:
                value *
                (recoveryProbability / 100),
              urgency,
              recommendedAction,
              reason:
                calculatedScore.reason,
              recoveryChannel,
              actionScheduled:
                pendingIds.has(
                  opportunity.id,
                ),
            };
          })
          .sort(
            (a, b) =>
              b.recoveryScore -
              a.recoveryScore,
          );

      setOpportunities(mapped);
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
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number) {
    return `$${Math.round(
      value,
    ).toLocaleString("en-US")}`;
  }

  function cleanTitle(
    title: string | null,
  ) {
    return (
      title ??
      "Untitled Opportunity"
    )
      .replace(
        /^\[REVORA DEMO\]\s*/i,
        "",
      )
      .trim();
  }

  function getDefaultMessage(
    opportunity: RecoveryOpportunity,
  ) {
    const customerName =
      opportunity.customer?.name ||
      "there";

    if (
      opportunity.type ===
      "old_estimate"
    ) {
      return `Hi ${customerName}, this is the team at ${businessName}. I wanted to follow up on your HVAC estimate. We’re available to answer any questions and help you with next steps.`;
    }

    if (
      opportunity.type ===
      "missed_call"
    ) {
      return `Hi ${customerName}, this is the team at ${businessName}. We noticed we missed your call and wanted to make sure we get you taken care of. Please let us know a good time to connect.`;
    }

    if (
      opportunity.type ===
      "unanswered_inquiry"
    ) {
      return `Hi ${customerName}, this is the team at ${businessName}. We received your HVAC inquiry and wanted to follow up. We’d be happy to help with your request.`;
    }

    return `Hi ${customerName}, this is the team at ${businessName}. We wanted to follow up and see how we can help with your HVAC needs.`;
  }

  async function createRecoveryAction(
    opportunity: RecoveryOpportunity,
  ) {
    if (opportunity.actionScheduled) {
      setMessage(
        "A recovery action is already scheduled for this opportunity.",
      );
      return;
    }

    setWorkingId(opportunity.id);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

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
        throw new Error(
          "No business workspace found.",
        );
      }

      const businessId =
        profile.business_id;

      const {
        data: business,
        error: businessError,
      } = await supabase
        .from("businesses")
        .select(
          `
            recovery_action_delay_minutes,
            missed_calls_enabled,
            estimates_enabled,
            inquiries_enabled,
            no_follow_up_enabled
          `,
        )
        .eq("id", businessId)
        .single();

      if (businessError) {
        throw businessError;
      }

      const delayMinutes = Math.min(
        Math.max(
          Number(
            business?.recovery_action_delay_minutes ??
              5,
          ),
          1,
        ),
        1440,
      );

      const workflowEnabled =
        opportunity.type ===
        "missed_call"
          ? business?.missed_calls_enabled
          : opportunity.type ===
              "old_estimate"
            ? business?.estimates_enabled
            : opportunity.type ===
                "unanswered_inquiry"
              ? business?.inquiries_enabled
              : business?.no_follow_up_enabled;

      if (!workflowEnabled) {
        throw new Error(
          "This recovery workflow is currently disabled in Workspace Settings.",
        );
      }

      const {
        data: existingPending,
        error: existingError,
      } = await supabase
        .from("follow_ups")
        .select(
          "id, channel, status",
        )
        .eq(
          "business_id",
          businessId,
        )
        .eq(
          "opportunity_id",
          opportunity.id,
        )
        .eq("status", "pending")
        .limit(1);

      if (existingError) {
        throw existingError;
      }

      if (
        existingPending &&
        existingPending.length > 0
      ) {
        setOpportunities(
          (current) =>
            current.map(
              (item) =>
                item.id ===
                opportunity.id
                  ? {
                      ...item,
                      actionScheduled:
                        true,
                    }
                  : item,
            ),
        );

        setMessage(
          "A recovery action is already scheduled for this opportunity.",
        );

        return;
      }

      const scheduledAt =
        new Date(
          Date.now() +
            delayMinutes *
              60 *
              1000,
        );

      const {
        error: insertError,
      } = await supabase
        .from("follow_ups")
        .insert({
          business_id:
            businessId,

          opportunity_id:
            opportunity.id,

          channel:
            opportunity.recoveryChannel,

          message:
            getDefaultMessage(
              opportunity,
            ),

          scheduled_at:
            scheduledAt.toISOString(),

          status: "pending",
        });

      if (insertError) {
        throw insertError;
      }

      setOpportunities(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              opportunity.id
                ? {
                    ...item,
                    actionScheduled:
                      true,
                  }
                : item,
          ),
      );

      setMessage(
        `${
          opportunity.recoveryChannel ===
          "email"
            ? "Email"
            : "Call"
        } recovery action scheduled for ${delayMinutes} minutes from now.`,
      );
    } catch (err) {
      console.error(
        "Recovery action error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Could not create recovery action.",
      );
    } finally {
      setWorkingId(null);
    }
  }

  const activeCount =
    opportunities.length;

  const highPriority =
    opportunities.filter(
      (opportunity) =>
        opportunity.recoveryScore >= 75,
    ).length;

  const recoverableRevenue =
    opportunities.reduce(
      (total, opportunity) =>
        total +
        Number(
          opportunity.estimated_value ||
            0,
        ),
      0,
    );

  const expectedRecovery =
    opportunities.reduce(
      (total, opportunity) =>
        total +
        opportunity.expectedRecovery,
      0,
    );

  const topScore =
    opportunities.length > 0
      ? opportunities[0].recoveryScore
      : 0;

  const scheduledCount =
    opportunities.filter(
      (opportunity) =>
        opportunity.actionScheduled,
    ).length;

  const enabledWorkflows =
    [
      config.missed_calls_enabled,
      config.estimates_enabled,
      config.inquiries_enabled,
      config.no_follow_up_enabled,
    ].filter(Boolean).length;

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
                  Loading Recovery Intelligence...
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

            {/* HEADER */}
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                REVORA · DECISION ENGINE
              </p>

              <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h1 className="text-4xl font-semibold tracking-tight">
                    AI Recovery
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                    Revenue recovery decisions ranked by
                    urgency, value, and recovery probability
                    for {businessName}.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-4 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />

                  <span className="text-xs font-semibold text-emerald-400">
                    DECISION ENGINE ACTIVE
                  </span>
                </div>
              </div>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-6 rounded-3xl border border-red-500/20 bg-red-500/5 p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  Recovery Error
                </p>

                <p className="mt-2 text-sm text-gray-400">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    void loadData()
                  }
                  className="mt-5 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Try again
                </button>
              </div>
            )}

            {message && (
              <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4">
                <p className="text-sm text-indigo-300">
                  {message}
                </p>
              </div>
            )}

            {!error && (
              <>
                {/* WORKSPACE CONFIGURATION */}
                <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                        WORKSPACE CONFIGURATION
                      </p>

                      <h2 className="mt-2 text-xl font-semibold">
                        Recovery workflows
                      </h2>

                      <p className="mt-2 text-sm text-gray-500">
                        {enabledWorkflows} of 4 recovery
                        workflows enabled · actions scheduled
                        after {config.recovery_delay_minutes} minutes
                      </p>
                    </div>

                    <a
                      href="/settings"
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-gray-300 transition hover:bg-white/[0.06]"
                    >
                      Configure Workspace
                    </a>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-2">
                    <WorkflowBadge
                      label="Missed Calls"
                      enabled={
                        config.missed_calls_enabled
                      }
                    />

                    <WorkflowBadge
                      label="Estimates"
                      enabled={
                        config.estimates_enabled
                      }
                    />

                    <WorkflowBadge
                      label="Inquiries"
                      enabled={
                        config.inquiries_enabled
                      }
                    />

                    <WorkflowBadge
                      label="No Follow-Up"
                      enabled={
                        config.no_follow_up_enabled
                      }
                    />
                  </div>
                </section>

                {/* KPI GRID */}
                <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <MetricCard
                    label="Recoverable Revenue"
                    value={formatCurrency(
                      recoverableRevenue,
                    )}
                    description="Active revenue at risk"
                  />

                  <MetricCard
                    label="Expected Recovery"
                    value={formatCurrency(
                      expectedRecovery,
                    )}
                    description="Probability-weighted recovery"
                    valueClass="text-emerald-400"
                  />

                  <MetricCard
                    label="Active Opportunities"
                    value={String(activeCount)}
                    description="Currently recoverable"
                  />

                  <MetricCard
                    label="High Priority"
                    value={String(highPriority)}
                    description="Score 75+"
                    valueClass="text-amber-400"
                  />

                  <MetricCard
                    label="Actions Scheduled"
                    value={String(scheduledCount)}
                    description="Pending recovery actions"
                    valueClass="text-indigo-400"
                  />
                </div>

                {/* COMMAND CENTER */}
                <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                        RECOVERY COMMAND CENTER
                      </p>

                      <h2 className="mt-2 text-2xl font-semibold">
                        What Revora wants you to recover next
                      </h2>

                      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                        Opportunities are ranked using the Revora
                        scoring engine. Higher scores indicate greater
                        urgency and revenue-recovery potential.
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                      <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                        TOP RECOVERY SCORE
                      </p>

                      <p className="mt-1 text-3xl font-semibold text-indigo-400">
                        {topScore}
                      </p>
                    </div>
                  </div>
                </section>

                {/* QUEUE */}
                <section className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">
                  <div className="border-b border-white/10 p-6">
                    <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                      PRIORITIZED QUEUE
                    </p>

                    <h2 className="mt-2 text-xl font-semibold">
                      Revenue recovery opportunities
                    </h2>
                  </div>

                  {opportunities.length === 0 ? (
                    <div className="p-12 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-2xl text-emerald-400">
                        ✓
                      </div>

                      <h3 className="mt-5 text-lg font-semibold">
                        Recovery queue is clear
                      </h3>

                      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                        No enabled active opportunities
                        currently require recovery action.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {opportunities.map(
                        (opportunity, index) => {
                          const value =
                            Number(
                              opportunity.estimated_value ||
                                0,
                            );

                          const urgencyClass =
                            opportunity.urgency ===
                            "critical"
                              ? "text-red-400"
                              : opportunity.urgency ===
                                  "high"
                                ? "text-amber-400"
                                : opportunity.urgency ===
                                    "medium"
                                  ? "text-indigo-400"
                                  : "text-gray-400";

                          return (
                            <div
                              key={opportunity.id}
                              className="p-6 transition hover:bg-white/[0.025] sm:p-8"
                            >
                              <div className="flex flex-col gap-7">

                                {/* TOP ROW */}
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">

                                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-gray-500">
                                        #{index + 1}
                                      </span>

                                      <span
                                        className={`rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${urgencyClass}`}
                                      >
                                        {opportunity.urgency}
                                      </span>

                                      {opportunity.recoveryScore >=
                                        75 && (
                                        <span className="rounded-full border border-indigo-500/20 bg-indigo-500/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-indigo-400">
                                          RECOVERY READY
                                        </span>
                                      )}

                                    </div>

                                    <h3 className="mt-3 text-xl font-semibold">
                                      {cleanTitle(
                                        opportunity.title,
                                      )}
                                    </h3>

                                    <p className="mt-1 text-sm text-gray-500">
                                      {opportunity.customer
                                        ?.name ||
                                        "Unknown customer"}{" "}
                                      ·{" "}
                                      {opportunity.type.replaceAll(
                                        "_",
                                        " ",
                                      )}
                                    </p>
                                  </div>

                                  {/* SCORE */}
                                  <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                                    <div>
                                      <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                        RECOVERY SCORE
                                      </p>

                                      <p className="mt-1 text-3xl font-semibold text-indigo-400">
                                        {opportunity.recoveryScore}
                                      </p>
                                    </div>

                                    <div className="h-10 w-px bg-white/10" />

                                    <div>
                                      <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                                        PROBABILITY
                                      </p>

                                      <p className="mt-1 text-xl font-semibold text-emerald-400">
                                        {
                                          opportunity.recoveryProbability
                                        }
                                        %
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* REASON */}
                                <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                                  <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-500">
                                    ENGINE REASON
                                  </p>

                                  <p className="mt-2 text-sm text-gray-300">
                                    {opportunity.reason}
                                  </p>
                                </div>

                                {/* DATA */}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                  <DataPoint
                                    label="Revenue at risk"
                                    value={formatCurrency(
                                      value,
                                    )}
                                  />

                                  <DataPoint
                                    label="Expected recovery"
                                    value={formatCurrency(
                                      opportunity.expectedRecovery,
                                    )}
                                    valueClass="text-emerald-400"
                                  />

                                  <DataPoint
                                    label="Recommended action"
                                    value={
                                      opportunity.recommendedAction
                                    }
                                  />

                                  <DataPoint
                                    label="Channel"
                                    value={
                                      opportunity.recoveryChannel ===
                                      "email"
                                        ? "Email"
                                        : "Call"
                                    }
                                  />
                                </div>

                                {/* ACTION */}
                                {opportunity.recoveryScore >=
                                  75 && (
                                  <div className="flex flex-col gap-4 rounded-2xl border border-indigo-500/10 bg-indigo-500/[0.025] p-5 sm:flex-row sm:items-center sm:justify-between">

                                    <div>
                                      <p className="text-sm font-semibold">
                                        {opportunity.actionScheduled
                                          ? "Recovery action scheduled"
                                          : "Recovery action ready"}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-500">
                                        {opportunity.actionScheduled
                                          ? "This opportunity already has a pending recovery action."
                                          : `Revora can schedule a ${opportunity.recoveryChannel} recovery action after ${config.recovery_delay_minutes} minutes.`}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      disabled={
                                        opportunity.actionScheduled ||
                                        workingId ===
                                          opportunity.id
                                      }
                                      onClick={() =>
                                        void createRecoveryAction(
                                          opportunity,
                                        )
                                      }
                                      className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                                        opportunity.actionScheduled
                                          ? "cursor-default border border-white/10 bg-white/[0.03] text-gray-500"
                                          : "bg-indigo-500 text-white hover:bg-indigo-400"
                                      }`}
                                    >
                                      {workingId ===
                                      opportunity.id
                                        ? "Creating..."
                                        : opportunity.actionScheduled
                                          ? "Action Scheduled"
                                          : opportunity.recoveryChannel ===
                                              "email"
                                            ? "Create Email Recovery Action"
                                            : "Create Recovery Action"}
                                    </button>

                                  </div>
                                )}

                              </div>
                            </div>
                          );
                        },
                      )}
                    </div>
                  )}
                </section>

                {/* HOW ENGINE WORKS */}
                <section className="mt-6 grid gap-4 md:grid-cols-3">
                  <InfoCard
                    number="01"
                    title="Detect"
                    text="Revora identifies enabled revenue opportunities from missed calls, inquiries, estimates, and follow-up gaps."
                  />

                  <InfoCard
                    number="02"
                    title="Prioritize"
                    text="The scoring engine weighs opportunity type, revenue value, timing, customer response, and follow-up history."
                  />

                  <InfoCard
                    number="03"
                    title="Recover"
                    text="High-priority enabled opportunities can generate recovery actions using your workspace timing configuration."
                  />
                </section>
              </>
            )}

            <footer className="py-8 text-center text-xs text-gray-500">
              REVORA · Revenue Recovery Decision Engine
            </footer>

          </div>
        </div>
      </div>
    </main>
  );
}

function WorkflowBadge({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider ${
        enabled
          ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-400"
          : "border-white/10 bg-white/[0.02] text-gray-600"
      }`}
    >
      {label} · {enabled ? "ON" : "OFF"}
    </span>
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

function DataPoint({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
      <p className="text-[10px] font-semibold tracking-wider text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-sm font-semibold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6">
      <p className="text-xs font-semibold tracking-[0.16em] text-indigo-500">
        {number}
      </p>

      <h3 className="mt-3 text-lg font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {text}
      </p>
    </div>
  );
}