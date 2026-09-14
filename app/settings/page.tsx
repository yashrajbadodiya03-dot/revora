"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";
import {
  loadWorkspaceData,
  refreshWorkspaceData,
} from "@/lib/workspace";

type WorkspaceSettings = {
  emailNotifications: boolean;
  recoveryAlerts: boolean;
};

type DemoCustomer = {
  name: string;
  email: string;
  phone: string;
};

type DemoOpportunity = {
  customerIndex: number;
  type:
    | "missed_call"
    | "old_estimate"
    | "unanswered_inquiry"
    | "no_follow_up";
  title: string;
  description: string;
  estimated_value: number;
  priority_score: number;
  intent_score: number;
  probability_score: number;
};

const DEMO_EMAIL_DOMAIN = "demo.revora.local";
const DEMO_TAG = "[REVORA DEMO]";

const DEMO_CUSTOMERS: DemoCustomer[] = [
  {
    name: "Sarah Jenkins",
    email: "sarah.jenkins@demo.revora.local",
    phone: "(512) 555-0141",
  },
  {
    name: "Michael Chang",
    email: "michael.chang@demo.revora.local",
    phone: "(512) 555-0188",
  },
  {
    name: "Emily Rodriguez",
    email: "emily.rodriguez@demo.revora.local",
    phone: "(512) 555-0127",
  },
  {
    name: "James Wilson",
    email: "james.wilson@demo.revora.local",
    phone: "(512) 555-0174",
  },
  {
    name: "Daniel Brooks",
    email: "daniel.brooks@demo.revora.local",
    phone: "(512) 555-0199",
  },
  {
    name: "Olivia Carter",
    email: "olivia.carter@demo.revora.local",
    phone: "(512) 555-0162",
  },
];

const DEMO_OPPORTUNITIES: DemoOpportunity[] = [
  {
    customerIndex: 0,
    type: "missed_call",
    title: `${DEMO_TAG} Missed Emergency HVAC Call`,
    description:
      "High-intent customer called outside business hours and has not received a response.",
    estimated_value: 12500,
    priority_score: 94,
    intent_score: 97,
    probability_score: 82,
  },
  {
    customerIndex: 1,
    type: "old_estimate",
    title: `${DEMO_TAG} AC Replacement Estimate`,
    description:
      "Customer received an estimate and has not responded after the initial proposal.",
    estimated_value: 7800,
    priority_score: 88,
    intent_score: 86,
    probability_score: 73,
  },
  {
    customerIndex: 2,
    type: "unanswered_inquiry",
    title: `${DEMO_TAG} Website Cooling Inquiry`,
    description:
      "Website inquiry arrived during a busy period and remains unanswered.",
    estimated_value: 4200,
    priority_score: 81,
    intent_score: 89,
    probability_score: 68,
  },
  {
    customerIndex: 3,
    type: "no_follow_up",
    title: `${DEMO_TAG} Furnace Service Follow-Up`,
    description:
      "Initial conversation happened, but no follow-up was sent after the service discussion.",
    estimated_value: 3600,
    priority_score: 73,
    intent_score: 71,
    probability_score: 61,
  },
  {
    customerIndex: 4,
    type: "old_estimate",
    title: `${DEMO_TAG} Full System Replacement`,
    description:
      "Large replacement estimate is aging without a clear next step from the customer.",
    estimated_value: 9800,
    priority_score: 79,
    intent_score: 82,
    probability_score: 65,
  },
  {
    customerIndex: 5,
    type: "missed_call",
    title: `${DEMO_TAG} Preventive Maintenance Call`,
    description:
      "Customer called about seasonal maintenance but the opportunity was not followed up.",
    estimated_value: 2400,
    priority_score: 62,
    intent_score: 66,
    probability_score: 58,
  },
  {
    customerIndex: 1,
    type: "old_estimate",
    title: `${DEMO_TAG} AC Repair Estimate`,
    description:
      "Customer accepted the estimate after a successful follow-up sequence.",
    estimated_value: 5000,
    priority_score: 85,
    intent_score: 84,
    probability_score: 71,
  },
  {
    customerIndex: 3,
    type: "unanswered_inquiry",
    title: `${DEMO_TAG} Emergency Cooling Inquiry`,
    description:
      "High-value cooling inquiry was recovered after a fast outbound response.",
    estimated_value: 6500,
    priority_score: 91,
    intent_score: 94,
    probability_score: 77,
  },
];

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("");
  const [settings, setSettings] =
    useState<WorkspaceSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoAction, setDemoAction] = useState<
    "load" | "clear" | null
  >(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        setLoading(true);
        setError("");

        const supabase = createClient();
        const workspace = await loadWorkspaceData();

        if (!active) return;

        setBusinessName(
          workspace.businessName || "",
        );

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          throw new Error("You must be signed in.");
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
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

        const {
          data: business,
          error: businessError,
        } = await supabase
          .from("businesses")
          .select(
            "email_notifications,recovery_alerts",
          )
          .eq("id", profile.business_id)
          .maybeSingle();

        if (businessError) throw businessError;

        if (!active) return;

        setSettings({
          emailNotifications:
            business?.email_notifications ?? true,
          recoveryAlerts:
            business?.recovery_alerts ?? true,
        });
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load workspace settings.",
        );

        setSettings(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  async function getBusinessContext() {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("You must be signed in.");
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
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

    return {
      supabase,
      businessId: profile.business_id,
    };
  }

  async function clearDemoWorkspace(
    supabase: ReturnType<typeof createClient>,
    businessId: string,
  ) {
    const {
      data: demoCustomers,
      error: customerLookupError,
    } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId)
      .like("email", `%@${DEMO_EMAIL_DOMAIN}`);

    if (customerLookupError) {
      throw new Error(
        `Demo customer lookup failed: ${customerLookupError.message}`,
      );
    }

    const customerIds =
      (demoCustomers ?? []).map(
        (customer) => customer.id,
      );

    if (customerIds.length === 0) {
      return;
    }

    const {
      data: demoOpportunities,
      error: opportunityLookupError,
    } = await supabase
      .from("opportunities")
      .select("id")
      .eq("business_id", businessId)
      .in("customer_id", customerIds);

    if (opportunityLookupError) {
      throw new Error(
        `Demo opportunity lookup failed: ${opportunityLookupError.message}`,
      );
    }

    const opportunityIds =
      (demoOpportunities ?? []).map(
        (opportunity) => opportunity.id,
      );

    if (opportunityIds.length > 0) {
      const {
        error: followUpDeleteError,
      } = await supabase
        .from("follow_ups")
        .delete()
        .eq("business_id", businessId)
        .in(
          "opportunity_id",
          opportunityIds,
        );

      if (followUpDeleteError) {
        throw new Error(
          `Demo follow-up cleanup failed: ${followUpDeleteError.message}`,
        );
      }

      const {
        error: revenueDeleteError,
      } = await supabase
        .from("revenue_events")
        .delete()
        .eq("business_id", businessId)
        .in(
          "opportunity_id",
          opportunityIds,
        );

      if (revenueDeleteError) {
        throw new Error(
          `Demo revenue cleanup failed: ${revenueDeleteError.message}`,
        );
      }

      const {
        error: opportunityDeleteError,
      } = await supabase
        .from("opportunities")
        .delete()
        .eq("business_id", businessId)
        .in("id", opportunityIds);

      if (opportunityDeleteError) {
        throw new Error(
          `Demo opportunity cleanup failed: ${opportunityDeleteError.message}`,
        );
      }
    }

    const {
      error: customerDeleteError,
    } = await supabase
      .from("customers")
      .delete()
      .eq("business_id", businessId)
      .in("id", customerIds);

    if (customerDeleteError) {
      throw new Error(
        `Demo customer cleanup failed: ${customerDeleteError.message}`,
      );
    }
  }

  async function loadDemoWorkspace() {
    setMessage("");
    setError("");
    setDemoLoading(true);
    setDemoAction("load");

    try {
      const { supabase, businessId } =
        await getBusinessContext();

      try {
        await clearDemoWorkspace(
          supabase,
          businessId,
        );
      } catch (err) {
        throw new Error(
          `Demo cleanup failed: ${
            err instanceof Error
              ? err.message
              : String(err)
          }`,
        );
      }

      let insertedCustomers: {
        id: string;
      }[] = [];

      try {
        const {
          data,
          error: customerInsertError,
        } = await supabase
          .from("customers")
          .insert(
            DEMO_CUSTOMERS.map(
              (customer) => ({
                business_id: businessId,
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
              }),
            ),
          )
          .select("id");

        if (customerInsertError) {
          throw customerInsertError;
        }

        insertedCustomers = data ?? [];
      } catch (err) {
        throw new Error(
          `Customer creation failed: ${
            err instanceof Error
              ? err.message
              : String(err)
          }`,
        );
      }

      if (
        insertedCustomers.length !==
        DEMO_CUSTOMERS.length
      ) {
        throw new Error(
          `Customer creation failed: expected ${DEMO_CUSTOMERS.length}, created ${insertedCustomers.length}.`,
        );
      }

      const opportunityPayload =
        DEMO_OPPORTUNITIES.map(
          (opportunity) => ({
            business_id: businessId,
            customer_id:
              insertedCustomers[
                opportunity.customerIndex
              ].id,
            type: opportunity.type,
            title: opportunity.title,
            description:
              opportunity.description,
            estimated_value:
              opportunity.estimated_value,
            priority_score:
              opportunity.priority_score,
            intent_score:
              opportunity.intent_score,
            probability_score:
              opportunity.probability_score,
            status: "new" as const,
          }),
        );

      try {
        const {
          error: opportunityError,
        } = await supabase
          .from("opportunities")
          .insert(opportunityPayload);

        if (opportunityError) {
          throw opportunityError;
        }
      } catch (err) {
        throw new Error(
          `Opportunity creation failed: ${
            err instanceof Error
              ? err.message
              : String(err)
          }`,
        );
      }

      const {
        data: createdOpportunities,
        error: opportunityLookupError,
      } = await supabase
        .from("opportunities")
        .select(
          "id,title,estimated_value",
        )
        .eq("business_id", businessId)
        .like("title", `${DEMO_TAG}%`);

      if (opportunityLookupError) {
        throw new Error(
          `Opportunity lookup failed: ${opportunityLookupError.message}`,
        );
      }

      const opportunityMap = new Map<
        string,
        {
          id: string;
          title: string;
          estimated_value: number;
        }
      >(
        (createdOpportunities ?? []).map(
          (item) => [
            item.title,
            item,
          ],
        ),
      );

      const recoveredTitles = [
        `${DEMO_TAG} Preventive Maintenance Call`,
        `${DEMO_TAG} AC Repair Estimate`,
        `${DEMO_TAG} Emergency Cooling Inquiry`,
      ];

      for (const title of recoveredTitles) {
        const opportunity =
          opportunityMap.get(title);

        if (!opportunity) {
          throw new Error(
            `Could not find demo opportunity: ${title}`,
          );
        }

        try {
          const {
            error: updateError,
          } = await supabase
            .from("opportunities")
            .update({
              status: "recovered",
              updated_at:
                new Date().toISOString(),
            })
            .eq("id", opportunity.id)
            .eq(
              "business_id",
              businessId,
            );

          if (updateError) {
            throw updateError;
          }
        } catch (err) {
          throw new Error(
            `Revenue recovery failed for "${title}": ${
              err instanceof Error
                ? err.message
                : String(err)
            }`,
          );
        }
      }

      const followUps = [
        {
          title: `${DEMO_TAG} Missed Emergency HVAC Call`,
          channel: "call" as const,
          message:
            "Call Sarah about the missed emergency HVAC request and offer the earliest available service window.",
          scheduled_at:
            new Date(
              Date.now() +
                45 * 60 * 1000,
            ).toISOString(),
          status: "pending" as const,
        },
        {
          title: `${DEMO_TAG} Website Cooling Inquiry`,
          channel: "email" as const,
          message:
            "Hi Emily, we saw your cooling inquiry and would be happy to help. Let us know a convenient time to connect.",
          scheduled_at:
            new Date(
              Date.now() +
                2 * 60 * 60 * 1000,
            ).toISOString(),
          status: "pending" as const,
        },
        {
          title: `${DEMO_TAG} AC Replacement Estimate`,
          channel: "email" as const,
          message:
            "Following up on your AC replacement estimate and next steps.",
          scheduled_at:
            new Date(
              Date.now() -
                90 * 60 * 1000,
            ).toISOString(),
          status: "sent" as const,
        },
        {
          title: `${DEMO_TAG} Furnace Service Follow-Up`,
          channel: "call" as const,
          message:
            "Discuss the furnace service quote and confirm whether the customer would like to proceed.",
          scheduled_at:
            new Date(
              Date.now() -
                24 * 60 * 60 * 1000,
            ).toISOString(),
          status: "completed" as const,
        },
      ];

      const followUpPayload =
        followUps
          .map((item) => {
            const opportunity =
              opportunityMap.get(
                item.title,
              );

            if (!opportunity) {
              return null;
            }

            return {
              business_id: businessId,
              opportunity_id:
                opportunity.id,
              channel: item.channel,
              message: item.message,
              scheduled_at:
                item.scheduled_at,
              status: item.status,
            };
          })
          .filter(
            (
              item,
            ): item is NonNullable<
              typeof item
            > => Boolean(item),
          );

      if (followUpPayload.length > 0) {
        try {
          const {
            error: followUpError,
          } = await supabase
            .from("follow_ups")
            .insert(
              followUpPayload,
            );

          if (followUpError) {
            throw followUpError;
          }
        } catch (err) {
          throw new Error(
            `Follow-up creation failed: ${
              err instanceof Error
                ? err.message
                : String(err)
            }`,
          );
        }
      }

      setMessage(
        "Demo workspace loaded successfully.",
      );

      refreshWorkspaceData();

      window.dispatchEvent(
        new Event("workspaceUpdated"),
      );
    } catch (err) {
      console.error(
        "REVORA DEMO WORKSPACE ERROR:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : `Demo workspace failed: ${String(err)}`,
      );
    } finally {
      setDemoLoading(false);
      setDemoAction(null);
    }
  }

  async function handleClearDemo() {
    setMessage("");
    setError("");
    setDemoLoading(true);
    setDemoAction("clear");

    try {
      const { supabase, businessId } =
        await getBusinessContext();

      await clearDemoWorkspace(
        supabase,
        businessId,
      );

      setMessage(
        "Demo workspace cleared successfully.",
      );

      refreshWorkspaceData();

      window.dispatchEvent(
        new Event("workspaceUpdated"),
      );
    } catch (err) {
      console.error(
        "REVORA DEMO CLEAR ERROR:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to clear demo workspace.",
      );
    } finally {
      setDemoLoading(false);
      setDemoAction(null);
    }
  }

  async function handleSave() {
    setMessage("");
    setError("");

    if (!settings) {
      setError(
        "Settings are still loading.",
      );
      return;
    }

    const trimmedName =
      businessName.trim();

    if (!trimmedName) {
      setError(
        "Workspace name cannot be empty.",
      );
      return;
    }

    if (trimmedName.length > 100) {
      setError(
        "Workspace name must be 100 characters or less.",
      );
      return;
    }

    try {
      setSaving(true);

      const supabase = createClient();

      const {
        data: updatedBusiness,
        error: nameError,
      } = await supabase.rpc(
        "update_my_business_name",
        {
          new_name: trimmedName,
        },
      );

      if (nameError) {
        throw nameError;
      }

      if (!updatedBusiness) {
        throw new Error(
          "Supabase returned no updated business.",
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error(
          "You must be signed in.",
        );
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
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

      const {
        error: settingsError,
      } = await supabase
        .from("businesses")
        .update({
          email_notifications:
            settings.emailNotifications,
          recovery_alerts:
            settings.recoveryAlerts,
        })
        .eq(
          "id",
          profile.business_id,
        );

      if (settingsError) {
        throw settingsError;
      }

      setMessage(
        "Settings saved successfully.",
      );

      refreshWorkspaceData();

      window.dispatchEvent(
        new Event("workspaceUpdated"),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unexpected error while saving.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070a0f] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="mb-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-500">
                WORKSPACE CONTROL
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em]">
                Settings
              </h1>

              <p className="mt-2 text-sm text-gray-500">
                Manage your Revora workspace and
                notification preferences.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm font-medium text-rose-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm font-medium text-emerald-400">
                <span>
                  ✓ {message}
                </span>

                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider">
                  Saved
                </span>
              </div>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold">
                  Workspace
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Update the business workspace name.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <label
                  htmlFor="businessName"
                  className="text-sm font-medium text-gray-300"
                >
                  Workspace name
                </label>

                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(event) =>
                    setBusinessName(
                      event.target.value,
                    )
                  }
                  disabled={
                    loading || saving
                  }
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0f16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-700 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/10 disabled:opacity-60"
                />
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.025]">
              <div className="border-b border-white/10 px-5 py-5 sm:px-6">
                <h2 className="text-base font-semibold">
                  Notifications
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Choose which Revora alerts your workspace
                  receives.
                </p>
              </div>

              {settings === null ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-gray-500">
                    Loading notification settings...
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  <ToggleRow
                    title="Email Notifications"
                    description="Receive important workspace updates and notification emails."
                    enabled={
                      settings.emailNotifications
                    }
                    disabled={saving}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current!,
                          emailNotifications:
                            value,
                        }),
                      )
                    }
                  />

                  <ToggleRow
                    title="Recovery Alerts"
                    description="Get notified when Revora identifies recovery opportunities that need attention."
                    enabled={
                      settings.recoveryAlerts
                    }
                    disabled={saving}
                    onChange={(value) =>
                      setSettings(
                        (current) => ({
                          ...current!,
                          recoveryAlerts:
                            value,
                        }),
                      )
                    }
                  />
                </div>
              )}
            </section>

            <section className="mt-6 overflow-hidden rounded-3xl border border-indigo-500/20 bg-indigo-500/[0.035]">
              <div className="border-b border-indigo-500/10 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
                    ✦
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
                      DEMO ENVIRONMENT
                    </p>

                    <h2 className="mt-1 text-base font-semibold">
                      Demo Workspace
                    </h2>
                  </div>
                </div>

                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500">
                  Load a realistic HVAC dataset to
                  demonstrate Revora across Dashboard,
                  Opportunities, Customers, AI Recovery,
                  Follow-Ups, and ROI. Demo records are
                  tagged internally and can be cleared without
                  touching normal customer data.
                </p>
              </div>

              <div className="p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      void loadDemoWorkspace()
                    }
                    disabled={
                      demoLoading || loading
                    }
                    className="group rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 text-left transition hover:border-indigo-400/40 hover:bg-indigo-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {demoAction === "load"
                            ? "Loading Demo..."
                            : "Load Demo Workspace"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Creates customers, revenue
                          opportunities, follow-ups, and
                          recovered revenue.
                        </p>
                      </div>

                      <span className="text-lg text-indigo-400 transition group-hover:translate-x-0.5">
                        →
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      void handleClearDemo()
                    }
                    disabled={
                      demoLoading || loading
                    }
                    className="group rounded-2xl border border-white/10 bg-white/[0.025] p-5 text-left transition hover:border-rose-500/20 hover:bg-rose-500/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {demoAction === "clear"
                            ? "Clearing Demo..."
                            : "Clear Demo Workspace"}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          Removes only Revora demo records
                          from this workspace.
                        </p>
                      </div>

                      <span className="text-lg text-gray-500 transition group-hover:text-rose-400">
                        ×
                      </span>
                    </div>
                  </button>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                  <p className="text-[11px] leading-5 text-gray-600">
                    Recommended flow for client demos:
                    Load Demo → Dashboard → AI Recovery →
                    Follow-Ups → ROI → Clear Demo.
                  </p>
                </div>
              </div>
            </section>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Workspace changes
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Save the workspace name and notification
                    preferences together.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    loading ||
                    saving ||
                    !settings
                  }
                  className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/10 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading
                    ? "Loading..."
                    : saving
                      ? "Saving..."
                      : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 px-5 py-5 sm:px-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            {title}
          </h3>

          <span
            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
              enabled
                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-gray-500"
            }`}
          >
            {enabled ? "On" : "Off"}
          </span>
        </div>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
          enabled
            ? "border-indigo-400/40 bg-indigo-500 shadow-[0_0_16px_rgba(99,102,241,0.2)]"
            : "border-white/10 bg-white/[0.06]"
        } ${
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer"
        }`}
      >
        <span
          className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow-sm transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}