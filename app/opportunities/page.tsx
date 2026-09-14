"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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
  title: string;
  description: string | null;
  estimated_value: number | null;
  priority_score: number | null;
  intent_score: number | null;
  probability_score: number | null;
  status: OpportunityStatus;
  created_at: string;
  updated_at: string | null;
  customer?: Customer | null;
};

type OpportunityForm = {
  customerId: string;
  type: OpportunityType;
  title: string;
  description: string;
  estimatedValue: string;
  priorityScore: string;
  probabilityScore: string;
};

type InboundForm = {
  customerId: string;
  eventType: "missed_call" | "inquiry" | "estimate";
  estimatedValue: string;
  description: string;
};

type FollowUpForm = {
  channel: "call" | "sms" | "email";
  message: string;
  scheduledAt: string;
};

const defaultOpportunityForm: OpportunityForm = {
  customerId: "",
  type: "missed_call",
  title: "",
  description: "",
  estimatedValue: "",
  priorityScore: "80",
  probabilityScore: "70",
};

const defaultInboundForm: InboundForm = {
  customerId: "",
  eventType: "missed_call",
  estimatedValue: "",
  description: "",
};

const defaultFollowUpForm: FollowUpForm = {
  channel: "call",
  message: "",
  scheduledAt: "",
};

const fieldClass =
  "w-full rounded-xl border border-white/10 bg-[#080b10] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10";

const selectClass = `${fieldClass} cursor-pointer`;

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

function cleanDisplayTitle(title: string) {
  return title.replace(/^\[REVORA DEMO\]\s*/i, "").trim();
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0]?.slice(0, 2).toUpperCase() || "CU";
  }

  return `${parts[0]?.[0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
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
  if (priority >= 70) return "text-amber-400";
  return "text-gray-400";
}

function nextStatus(
  status: OpportunityStatus,
): OpportunityStatus | null {
  switch (status) {
    case "new":
      return "contacted";
    case "contacted":
      return "qualified";
    case "qualified":
      return "recovered";
    default:
      return null;
  }
}

function nextStatusLabel(status: OpportunityStatus) {
  const next = nextStatus(status);
  return next ? `Mark ${statusLabel(next)}` : "";
}

function getDefaultFollowUpMessage(
  opportunity: Opportunity,
  channel: "call" | "sms" | "email",
) {
  const customerName = opportunity.customer?.name || "there";

  if (channel === "call") {
    if (opportunity.type === "missed_call") {
      return `Call ${customerName} back about their recent service request.`;
    }

    if (opportunity.type === "old_estimate") {
      return `Call ${customerName} to follow up on the previous estimate.`;
    }

    return `Call ${customerName} and follow up on their open opportunity.`;
  }

  if (channel === "sms") {
    if (opportunity.type === "missed_call") {
      return `Hi ${customerName}, this is Revora HVAC. We noticed we missed your call. Are you still looking for help with your service request?`;
    }

    if (opportunity.type === "old_estimate") {
      return `Hi ${customerName}, this is Revora HVAC following up on your previous estimate. Would you like us to help you move forward?`;
    }

    return `Hi ${customerName}, this is Revora HVAC. Just following up on your recent request. Are you still interested in getting this taken care of?`;
  }

  if (opportunity.type === "old_estimate") {
    return `Hi ${customerName},

I wanted to follow up on the estimate we previously provided. If you're still considering the work, we'd be happy to help with the next step.

Best,
Revora HVAC`;
  }

  return `Hi ${customerName},

We wanted to follow up on your recent request. If you still need help, we'd be happy to assist.

Best,
Revora HVAC`;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  count,
  value,
}: {
  eyebrow: string;
  title: string;
  description: string;
  count?: number;
  value?: number;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
          {eyebrow}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-white">{title}</h2>

          {typeof count === "number" && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-400">
              {count}
            </span>
          )}
        </div>

        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>

      {typeof value === "number" && (
        <div className="text-left sm:text-right">
          <p className="text-xs text-gray-500">Total value</p>

          <p className="mt-1 text-lg font-semibold text-white">
            {formatMoney(value)}
          </p>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  opportunity,
  onUpdateStatus,
  onScheduleFollowUp,
  recovered = false,
  updating = false,
}: {
  opportunity: Opportunity;
  onUpdateStatus: (
    opportunity: Opportunity,
    status: OpportunityStatus,
  ) => void;
  onScheduleFollowUp: (opportunity: Opportunity) => void;
  recovered?: boolean;
  updating?: boolean;
}) {
  const customerName =
    opportunity.customer?.name || "Unknown customer";

  const priority = Number(opportunity.priority_score || 0);
  const probability = Number(opportunity.probability_score || 0);
  const value = Number(opportunity.estimated_value || 0);

  const next = nextStatus(opportunity.status);

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        recovered
          ? "border-emerald-500/10 bg-emerald-500/[0.025]"
          : "border-white/10 bg-white/[0.02] hover:border-white/15"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                recovered
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-indigo-500/15 text-indigo-400"
              }`}
            >
              {getInitials(customerName)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-base font-semibold text-white">
                  {customerName}
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
                {cleanDisplayTitle(opportunity.title)}
              </p>

              {opportunity.description && (
                <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-500">
                  {opportunity.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 lg:min-w-[430px]">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-gray-500">
              VALUE
            </p>

            <p className="mt-1 text-lg font-semibold text-white">
              {formatMoney(value)}
            </p>

            <p className="mt-1 text-[10px] text-gray-600">
              {recovered ? "Recovered value" : "Potential value"}
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

        {!recovered && opportunity.customer?.email && (
          <a
            href={`mailto:${opportunity.customer.email}`}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
          >
            Email Customer
          </a>
        )}

        {!recovered && opportunity.customer?.phone && (
          <a
            href={`tel:${opportunity.customer.phone}`}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
          >
            Call Customer
          </a>
        )}

        {!recovered && next && (
          <button
            type="button"
            onClick={() => onUpdateStatus(opportunity, next)}
            disabled={updating}
            className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updating
              ? "Updating..."
              : nextStatusLabel(opportunity.status)}
          </button>
        )}

        {!recovered && (
          <button
            type="button"
            onClick={() => onScheduleFollowUp(opportunity)}
            disabled={updating}
            className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/15 disabled:opacity-50"
          >
            Schedule Follow-Up
          </button>
        )}

        {recovered && opportunity.customer_id && (
          <Link
            href="/customers"
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
          >
            View Customer
          </Link>
        )}

        {recovered && (
          <span className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 px-4 py-2.5 text-xs font-semibold text-emerald-300">
            Revenue recovered
          </span>
        )}
      </div>
    </div>
  );
}

export default function OpportunitiesPage() {
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] =
    useState<Opportunity[]>([]);

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [businessId, setBusinessId] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [updatingOpportunityId, setUpdatingOpportunityId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showCreateModal, setShowCreateModal] =
    useState(false);

  const [showInboundModal, setShowInboundModal] =
    useState(false);

  const [showFollowUpModal, setShowFollowUpModal] =
    useState(false);

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);

  const [opportunityForm, setOpportunityForm] =
    useState<OpportunityForm>(defaultOpportunityForm);

  const [inboundForm, setInboundForm] =
    useState<InboundForm>(defaultInboundForm);

  const [followUpForm, setFollowUpForm] =
    useState<FollowUpForm>(defaultFollowUpForm);

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
        throw new Error(
          "You must be signed in to view opportunities.",
        );
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error(
          "No business is associated with your account.",
        );
      }

      setBusinessId(profile.business_id);

      const [
        { data: opportunityData, error: opportunityError },
        { data: customerData, error: customerError },
      ] = await Promise.all([
        supabase
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
              created_at,
              updated_at,
              customer:customers (
                id,
                name,
                email,
                phone
              )
            `,
          )
          .eq("business_id", profile.business_id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("customers")
          .select("id, name, email, phone")
          .eq("business_id", profile.business_id)
          .order("name", {
            ascending: true,
          }),
      ]);

      if (opportunityError) {
        throw opportunityError;
      }

      if (customerError) {
        throw customerError;
      }

      const normalizedOpportunities: Opportunity[] =
        (opportunityData || []).map((opportunity) => ({
          ...opportunity,
          customer: Array.isArray(opportunity.customer)
            ? opportunity.customer[0] ?? null
            : opportunity.customer ?? null,
        }));

      setOpportunities(normalizedOpportunities);
      setCustomers((customerData || []) as Customer[]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load opportunities.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const activeOpportunities = useMemo(
    () =>
      opportunities.filter(
        (opportunity) =>
          !["recovered", "closed", "lost"].includes(
            opportunity.status,
          ),
      ),
    [opportunities],
  );

  const recoveredOpportunities = useMemo(
    () =>
      opportunities.filter(
        (opportunity) =>
          opportunity.status === "recovered",
      ),
    [opportunities],
  );

  const closedOrLostOpportunities = useMemo(
    () =>
      opportunities.filter(
        (opportunity) =>
          opportunity.status === "closed" ||
          opportunity.status === "lost",
      ),
    [opportunities],
  );

  const totalPotential = useMemo(
    () =>
      activeOpportunities.reduce(
        (sum, opportunity) =>
          sum + Number(opportunity.estimated_value || 0),
        0,
      ),
    [activeOpportunities],
  );

  const recoveredRevenue = useMemo(
    () =>
      recoveredOpportunities.reduce(
        (sum, opportunity) =>
          sum + Number(opportunity.estimated_value || 0),
        0,
      ),
    [recoveredOpportunities],
  );

  const highPriorityCount = useMemo(
    () =>
      activeOpportunities.filter(
        (opportunity) =>
          Number(opportunity.priority_score || 0) >= 75,
      ).length,
    [activeOpportunities],
  );

  function resetMessages() {
    setError("");
    setSuccess("");
  }

  function resetOpportunityForm() {
    setOpportunityForm(defaultOpportunityForm);
  }

  function resetInboundForm() {
    setInboundForm(defaultInboundForm);
  }

  function closeCreateModal() {
    setShowCreateModal(false);
    resetOpportunityForm();
  }

  function closeInboundModal() {
    setShowInboundModal(false);
    resetInboundForm();
  }

  function closeFollowUpModal() {
    setShowFollowUpModal(false);
    setSelectedOpportunity(null);
    setFollowUpForm(defaultFollowUpForm);
  }

  async function createOpportunity(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    resetMessages();

    if (!businessId) {
      setError("Business information is not available.");
      return;
    }

    if (!opportunityForm.customerId) {
      setError("Please select a customer.");
      return;
    }

    const estimatedValue = Number(
      opportunityForm.estimatedValue,
    );

    if (!opportunityForm.estimatedValue.trim()) {
      setError("Please enter an estimated value.");
      return;
    }

    if (!Number.isFinite(estimatedValue) || estimatedValue <= 0) {
      setError("Estimated value must be greater than 0.");
      return;
    }

    const priorityScore = Number(
      opportunityForm.priorityScore,
    );

    if (
      !Number.isFinite(priorityScore) ||
      priorityScore < 0 ||
      priorityScore > 100
    ) {
      setError("Priority Score must be between 0 and 100.");
      return;
    }

    const probabilityScore = Number(
      opportunityForm.probabilityScore,
    );

    if (
      !Number.isFinite(probabilityScore) ||
      probabilityScore < 0 ||
      probabilityScore > 100
    ) {
      setError("Probability Score must be between 0 and 100.");
      return;
    }

    if (!opportunityForm.title.trim()) {
      setError("Please enter an opportunity title.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("opportunities")
        .insert({
          business_id: businessId,
          customer_id: opportunityForm.customerId,
          type: opportunityForm.type,
          title: opportunityForm.title.trim(),
          description:
            opportunityForm.description.trim() || null,
          estimated_value: estimatedValue,
          priority_score: priorityScore,
          intent_score: priorityScore,
          probability_score: probabilityScore,
          status: "new",
        });

      if (insertError) throw insertError;

      closeCreateModal();

      setSuccess("Opportunity created successfully.");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create opportunity.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function createInboundEvent(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    resetMessages();

    if (!businessId) {
      setError("Business information is not available.");
      return;
    }

    if (!inboundForm.customerId) {
      setError("Please select a customer.");
      return;
    }

    const estimatedValue = Number(
      inboundForm.estimatedValue,
    );

    if (!inboundForm.estimatedValue.trim()) {
      setError("Please enter an estimated value.");
      return;
    }

    if (!Number.isFinite(estimatedValue) || estimatedValue <= 0) {
      setError("Estimated value must be greater than 0.");
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("inbound_events")
        .insert({
          business_id: businessId,
          customer_id: inboundForm.customerId,
          event_type: inboundForm.eventType,
          status: "open",
          estimated_value: estimatedValue,
          details: {
            description:
              inboundForm.description.trim() || null,
          },
        });

      if (insertError) throw insertError;

      closeInboundModal();

      setSuccess(
        "Inbound event created. Revora will create the recovery opportunity automatically.",
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create inbound event.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(
    opportunity: Opportunity,
    status: OpportunityStatus,
  ) {
    resetMessages();
    setSaving(true);
    setUpdatingOpportunityId(opportunity.id);

    try {
      if (status === "contacted") {
        const { data, error: rpcError } = await supabase.rpc(
          "mark_opportunity_contacted",
          {
            opportunity_id: opportunity.id,
          },
        );

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "Supabase did not return the updated opportunity.",
          );
        }

        setSuccess(
          `${opportunity.title} marked as contacted.`,
        );
      } else if (status === "qualified") {
        const { data, error: rpcError } = await supabase.rpc(
          "mark_opportunity_qualified",
          {
            opportunity_id: opportunity.id,
          },
        );

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "Supabase did not return the updated opportunity.",
          );
        }

        setSuccess(
          `${opportunity.title} marked as qualified.`,
        );
      } else if (status === "recovered") {
        const { data, error: rpcError } = await supabase.rpc(
          "mark_opportunity_recovered",
          {
            opportunity_id: opportunity.id,
          },
        );

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "Supabase did not return the updated opportunity.",
          );
        }

        setSuccess(
          `${opportunity.title} marked as recovered.`,
        );
      } else {
        const { error: updateError } = await supabase
          .from("opportunities")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", opportunity.id)
          .eq("business_id", businessId);

        if (updateError) {
          throw updateError;
        }

        setSuccess(
          `${opportunity.title} moved to ${statusLabel(status)}.`,
        );
      }

      await loadData();
    } catch (err) {
      console.error(
        "Opportunity status update error:",
        err,
      );

      setError(
        err instanceof Error
          ? `Update failed: ${err.message}`
          : "Update failed: Unknown error",
      );
    } finally {
      setSaving(false);
      setUpdatingOpportunityId(null);
    }
  }

  function openFollowUpModal(
    opportunity: Opportunity,
  ) {
    resetMessages();

    const channel: "call" | "sms" | "email" = "call";

    setSelectedOpportunity(opportunity);

    setFollowUpForm({
      channel,
      message: getDefaultFollowUpMessage(
        opportunity,
        channel,
      ),
      scheduledAt: "",
    });

    setShowFollowUpModal(true);
  }

  async function createFollowUp(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    resetMessages();

    if (!businessId) {
      setError("Business information is not available.");
      return;
    }

    if (!selectedOpportunity) {
      setError("No opportunity selected.");
      return;
    }

    if (!followUpForm.message.trim()) {
      setError("Please enter a follow-up message.");
      return;
    }

    if (!followUpForm.scheduledAt) {
      setError(
        "Please select a scheduled date and time.",
      );
      return;
    }

    setSaving(true);

    try {
      const { error: insertError } = await supabase
        .from("follow_ups")
        .insert({
          business_id: businessId,
          opportunity_id: selectedOpportunity.id,
          channel: followUpForm.channel,
          message: followUpForm.message.trim(),
          scheduled_at: new Date(
            followUpForm.scheduledAt,
          ).toISOString(),
          status: "pending",
        });

      if (insertError) throw insertError;

      closeFollowUpModal();

      setSuccess("Follow-up scheduled successfully.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to schedule follow-up.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleFollowUpChannelChange(
    channel: "call" | "sms" | "email",
  ) {
    if (!selectedOpportunity) return;

    setFollowUpForm((current) => ({
      ...current,
      channel,
      message: getDefaultFollowUpMessage(
        selectedOpportunity,
        channel,
      ),
    }));
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
            <header className="flex flex-col gap-6 border-b border-white/10 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  OPPORTUNITY INTELLIGENCE
                </p>

                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                  Revenue opportunities
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Find, prioritize, and recover revenue that would otherwise
                  be left behind.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-0">
                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setShowInboundModal(true);
                  }}
                  className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:border-white/20 hover:bg-white/5"
                >
                  Log New Opportunity
                </button>

                <span className="mx-3 hidden h-6 w-px bg-white/10 sm:block" />

                <button
                  type="button"
                  onClick={() => {
                    resetMessages();
                    setShowCreateModal(true);
                  }}
                  className="shrink-0 rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                >
                  + Create Opportunity
                </button>
              </div>
            </header>

            {error &&
              !showCreateModal &&
              !showInboundModal &&
              !showFollowUpModal && (
                <div className="mt-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm text-rose-300">
                  {error}
                </div>
              )}

            {success && (
              <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm text-emerald-300">
                {success}
              </div>
            )}

            {loading ? (
              <div className="mt-8 rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
                <p className="text-sm text-gray-500">
                  Loading opportunities...
                </p>
              </div>
            ) : (
              <>
                <section className="mt-8 grid gap-4 md:grid-cols-4">
                  <Metric
                    title="Potential Revenue"
                    value={formatMoney(totalPotential)}
                    subtitle={`${
                      activeOpportunities.length
                    } active ${
                      activeOpportunities.length === 1
                        ? "opportunity"
                        : "opportunities"
                    }`}
                  />

                  <Metric
                    title="Active Opportunities"
                    value={String(activeOpportunities.length)}
                    subtitle={
                      activeOpportunities.length === 1
                        ? "Requires recovery action"
                        : "Require recovery action"
                    }
                  />

                  <Metric
                    title="Recovered Revenue"
                    value={formatMoney(recoveredRevenue)}
                    subtitle={`${recoveredOpportunities.length} recovered`}
                    success
                  />

                  <Metric
                    title="High Priority"
                    value={String(highPriorityCount)}
                    subtitle="Priority score ≥ 75"
                  />
                </section>

                <section className="mt-10">
                  <SectionHeader
                    eyebrow="ACTION REQUIRED"
                    title="Active recovery opportunities"
                    description="These opportunities still require action."
                    count={activeOpportunities.length}
                    value={totalPotential}
                  />

                  <div className="mt-5 space-y-4">
                    {activeOpportunities.length === 0 ? (
                      <EmptyState
                        title="No active opportunities"
                        description="Your recovery queue is clear. New missed calls, inquiries, estimates, and follow-up gaps will appear here."
                        actionLabel="Log New Opportunity"
                        onAction={() => {
                          resetMessages();
                          setShowInboundModal(true);
                        }}
                      />
                    ) : (
                      activeOpportunities.map(
                        (opportunity) => (
                          <OpportunityCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onUpdateStatus={updateStatus}
                            onScheduleFollowUp={openFollowUpModal}
                            updating={
                              updatingOpportunityId === opportunity.id
                            }
                          />
                        ),
                      )
                    )}
                  </div>
                </section>

                {recoveredOpportunities.length > 0 && (
                  <section className="mt-10">
                    <div className="rounded-3xl border border-emerald-500/10 bg-[#0c1016] p-6 sm:p-8">
                      <SectionHeader
                        eyebrow="RECOVERY HISTORY"
                        title="Recovered revenue"
                        description="Completed recovery opportunities are kept here as historical revenue records."
                        count={recoveredOpportunities.length}
                        value={recoveredRevenue}
                      />

                      <div className="mt-5 space-y-4">
                        {recoveredOpportunities.map(
                          (opportunity) => (
                            <OpportunityCard
                              key={opportunity.id}
                              opportunity={opportunity}
                              onUpdateStatus={updateStatus}
                              onScheduleFollowUp={openFollowUpModal}
                              recovered
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </section>
                )}

                {closedOrLostOpportunities.length > 0 && (
                  <section className="mt-10">
                    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">
                      <SectionHeader
                        eyebrow="ARCHIVE"
                        title="Closed & lost"
                        description="Opportunities that are no longer part of the active recovery pipeline."
                        count={closedOrLostOpportunities.length}
                      />

                      <div className="mt-5 space-y-4">
                        {closedOrLostOpportunities.map(
                          (opportunity) => (
                            <OpportunityCard
                              key={opportunity.id}
                              opportunity={opportunity}
                              onUpdateStatus={updateStatus}
                              onScheduleFollowUp={openFollowUpModal}
                            />
                          ),
                        )}
                      </div>
                    </div>
                  </section>
                )}

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

      {showCreateModal && (
        <Modal
          title="Create Opportunity"
          description="Add a revenue opportunity directly to the recovery pipeline."
          onClose={closeCreateModal}
        >
          <form
            onSubmit={createOpportunity}
            className="space-y-5"
          >
            {error && <ModalError message={error} />}

            <Field label="Customer">
              <select
                value={opportunityForm.customerId}
                onChange={(event) =>
                  setOpportunityForm((current) => ({
                    ...current,
                    customerId: event.target.value,
                  }))
                }
                className={selectClass}
                style={{
                  colorScheme: "dark",
                }}
              >
                <option
                  value=""
                  className="bg-[#080b10] text-white"
                >
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                    className="bg-[#080b10] text-white"
                  >
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Type">
                <select
                  value={opportunityForm.type}
                  onChange={(event) =>
                    setOpportunityForm((current) => ({
                      ...current,
                      type: event.target.value as OpportunityType,
                    }))
                  }
                  className={selectClass}
                  style={{
                    colorScheme: "dark",
                  }}
                >
                  <option
                    value="missed_call"
                    className="bg-[#080b10] text-white"
                  >
                    Missed Call
                  </option>

                  <option
                    value="unanswered_inquiry"
                    className="bg-[#080b10] text-white"
                  >
                    Unanswered Inquiry
                  </option>

                  <option
                    value="old_estimate"
                    className="bg-[#080b10] text-white"
                  >
                    Old Estimate
                  </option>

                  <option
                    value="no_follow_up"
                    className="bg-[#080b10] text-white"
                  >
                    No Follow-Up
                  </option>
                </select>
              </Field>

              <Field label="Estimated Value">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={opportunityForm.estimatedValue}
                  onChange={(event) =>
                    setOpportunityForm((current) => ({
                      ...current,
                      estimatedValue: event.target.value,
                    }))
                  }
                  placeholder="5000"
                  className={fieldClass}
                />
              </Field>
            </div>

            <Field label="Title">
              <input
                type="text"
                value={opportunityForm.title}
                onChange={(event) =>
                  setOpportunityForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Missed Call - AC Service Request"
                className={fieldClass}
              />
            </Field>

            <Field label="Description">
              <textarea
                rows={3}
                value={opportunityForm.description}
                onChange={(event) =>
                  setOpportunityForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe the recovery opportunity..."
                className={`${fieldClass} resize-none`}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Priority Score">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={opportunityForm.priorityScore}
                  onChange={(event) =>
                    setOpportunityForm((current) => ({
                      ...current,
                      priorityScore: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>

              <Field label="Probability Score">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={opportunityForm.probabilityScore}
                  onChange={(event) =>
                    setOpportunityForm((current) => ({
                      ...current,
                      probabilityScore: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </Field>
            </div>

            <ModalActions
              onCancel={closeCreateModal}
              saving={saving}
              submitLabel="Create Opportunity"
            />
          </form>
        </Modal>
      )}

      {showInboundModal && (
        <Modal
          title="Log New Opportunity"
          description="Capture a new customer signal and let Revora turn it into a recovery opportunity."
          onClose={closeInboundModal}
        >
          <form
            onSubmit={createInboundEvent}
            className="space-y-5"
          >
            {error && <ModalError message={error} />}

            <Field label="Customer">
              <select
                value={inboundForm.customerId}
                onChange={(event) =>
                  setInboundForm((current) => ({
                    ...current,
                    customerId: event.target.value,
                  }))
                }
                className={selectClass}
                style={{
                  colorScheme: "dark",
                }}
              >
                <option
                  value=""
                  className="bg-[#080b10] text-white"
                >
                  Select customer
                </option>

                {customers.map((customer) => (
                  <option
                    key={customer.id}
                    value={customer.id}
                    className="bg-[#080b10] text-white"
                  >
                    {customer.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Event Type">
                <select
                  value={inboundForm.eventType}
                  onChange={(event) =>
                    setInboundForm((current) => ({
                      ...current,
                      eventType: event.target.value as
                        | "missed_call"
                        | "inquiry"
                        | "estimate",
                    }))
                  }
                  className={selectClass}
                  style={{
                    colorScheme: "dark",
                  }}
                >
                  <option
                    value="missed_call"
                    className="bg-[#080b10] text-white"
                  >
                    Missed Call
                  </option>

                  <option
                    value="inquiry"
                    className="bg-[#080b10] text-white"
                  >
                    Unanswered Inquiry
                  </option>

                  <option
                    value="estimate"
                    className="bg-[#080b10] text-white"
                  >
                    Old Estimate
                  </option>
                </select>
              </Field>

              <Field label="Estimated Value">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={inboundForm.estimatedValue}
                  onChange={(event) =>
                    setInboundForm((current) => ({
                      ...current,
                      estimatedValue: event.target.value,
                    }))
                  }
                  placeholder="5000"
                  className={fieldClass}
                />
              </Field>
            </div>

            <Field label="Description">
              <textarea
                rows={4}
                value={inboundForm.description}
                onChange={(event) =>
                  setInboundForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="After-hours AC repair request"
                className={`${fieldClass} resize-none`}
              />
            </Field>

            <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/5 p-4">
              <p className="text-xs font-semibold text-indigo-300">
                AUTOMATIC DETECTION
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Once submitted, Revora&apos;s database trigger will convert
                the open inbound event into the appropriate recovery
                opportunity.
              </p>
            </div>

            <ModalActions
              onCancel={closeInboundModal}
              saving={saving}
              submitLabel="Create Inbound Event"
            />
          </form>
        </Modal>
      )}

      {showFollowUpModal && selectedOpportunity && (
        <Modal
          title="Schedule Follow-Up"
          description={`Create a recovery action for ${
            selectedOpportunity.customer?.name || "this customer"
          }.`}
          onClose={closeFollowUpModal}
        >
          <form
            onSubmit={createFollowUp}
            className="space-y-5"
          >
            {error && <ModalError message={error} />}

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                  {getInitials(
                    selectedOpportunity.customer?.name ||
                      "Unknown customer",
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-white">
                    {selectedOpportunity.customer?.name ||
                      "Unknown customer"}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {selectedOpportunity.title} ·{" "}
                    {formatMoney(
                      Number(
                        selectedOpportunity.estimated_value || 0,
                      ),
                    )}
                  </p>
                </div>
              </div>
            </div>

            <Field label="Channel">
              <div className="grid grid-cols-3 gap-2">
                {(["call", "sms", "email"] as const).map(
                  (channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() =>
                        handleFollowUpChannelChange(channel)
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold capitalize transition ${
                        followUpForm.channel === channel
                          ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                          : "border-white/10 bg-white/[0.02] text-gray-500 hover:bg-white/5"
                      }`}
                    >
                      {channel}
                    </button>
                  ),
                )}
              </div>
            </Field>

            <Field label="Message / Action">
              <textarea
                rows={6}
                value={followUpForm.message}
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className={`${fieldClass} resize-none`}
              />
            </Field>

            <Field label="Scheduled At">
              <input
                type="datetime-local"
                value={followUpForm.scheduledAt}
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    scheduledAt: event.target.value,
                  }))
                }
                className={fieldClass}
                style={{
                  colorScheme: "dark",
                }}
              />
            </Field>

            <ModalActions
              onCancel={closeFollowUpModal}
              saving={saving}
              submitLabel="Schedule Follow-Up"
            />
          </form>
        </Modal>
      )}
    </main>
  );
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
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6 transition hover:border-white/15">
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

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        ✓
      </div>

      <h3 className="mt-5 text-base font-semibold text-white">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-6 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5"
        >
          {actionLabel}
        </button>
      )}
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

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0f15] text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-white/10 bg-[#0b0f15] px-6 py-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white">
              {title}
            </h2>

            <p className="mt-1 max-w-xl text-xs leading-5 text-gray-500">
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xl leading-none text-gray-500 transition hover:bg-white/5 hover:text-white"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ModalError({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
      {message}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-medium text-gray-400">
        {label}
      </span>

      {children}
    </label>
  );
}

function ModalActions({
  onCancel,
  saving,
  submitLabel,
}: {
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
}) {
  return (
    <div className="flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="rounded-xl border border-white/10 px-5 py-3 text-xs font-semibold text-gray-400 transition hover:bg-white/5 disabled:opacity-50"
      >
        Cancel
      </button>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-indigo-500 px-5 py-3 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving..." : submitLabel}
      </button>
    </div>
  );
}