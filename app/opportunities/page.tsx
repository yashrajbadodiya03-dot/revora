"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";

type Opportunity = {
  id: string;
  business_id: string;
  customer_id: string;
  type: string;
  title: string;
  description: string | null;
  estimated_value: number;
  priority_score: number;
  status: string;
  intent_score: number;
  probability_score: number;
  created_at: string;
};

type Customer = {
  id: string;
  name: string;
  email: string | null;
};

export default function OpportunitiesPage() {
  const supabase = createClient();

  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [value, setValue] = useState("");
  const [type, setType] = useState("missed_call");
  const [description, setDescription] = useState("");

  const [followUpOpportunity, setFollowUpOpportunity] =
    useState<Opportunity | null>(null);
  const [followUpChannel, setFollowUpChannel] = useState("email");
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpSaving, setFollowUpSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const { data: opportunitiesData, error: opportunitiesError } =
      await supabase
        .from("opportunities")
        .select("*")
        .order("priority_score", { ascending: false });

    const { data: customersData, error: customersError } =
      await supabase
        .from("customers")
        .select("id, name, email");

    if (opportunitiesError) {
      console.error("Opportunities error:", opportunitiesError);
    }

    if (customersError) {
      console.error("Customers error:", customersError);
    }

    setOpportunities(opportunitiesData || []);
    setCustomers(customersData || []);
    setLoading(false);
  }

  function getCustomer(customerId: string) {
    return customers.find((customer) => customer.id === customerId);
  }

  async function createOpportunity() {
    if (!name.trim()) {
      alert("Customer name is required.");
      return;
    }

    if (!value || Number(value) <= 0) {
      alert("Enter a valid estimated value.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("You are not logged in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileError || !profile?.business_id) {
        console.error("Profile error:", profileError);
        alert("Business not found for this account.");
        return;
      }

      let customer = customers.find(
        (item) =>
          item.name.toLowerCase() === name.trim().toLowerCase() &&
          (email.trim() === "" || item.email === email.trim())
      );

      if (!customer) {
        const { data: newCustomer, error: customerError } =
          await supabase
            .from("customers")
            .insert({
              business_id: profile.business_id,
              name: name.trim(),
              email: email.trim() || null,
            })
            .select("id, name, email")
            .single();

        if (customerError || !newCustomer) {
          console.error("Customer creation error:", customerError);
          alert("Could not create customer.");
          return;
        }

        customer = newCustomer;
        setCustomers((current) => [...current, newCustomer]);
      }

      const { data: newOpportunity, error: opportunityError } =
        await supabase
          .from("opportunities")
          .insert({
            business_id: profile.business_id,
            customer_id: customer.id,
            type,
            title: `${type.replaceAll("_", " ")} - ${customer.name}`,
            description: description.trim() || null,
            estimated_value: Number(value),
            priority_score: 80,
            intent_score: 80,
            probability_score: 70,
            status: "new",
          })
          .select("*")
          .single();

      if (opportunityError || !newOpportunity) {
        const errorInfo = {
          message: opportunityError?.message,
          details: opportunityError?.details,
          hint: opportunityError?.hint,
          code: opportunityError?.code,
        };

        console.error(
          "OPPORTUNITY ERROR:",
          JSON.stringify(errorInfo, null, 2)
        );

        alert(
          `OPPORTUNITY ERROR\n\n${JSON.stringify(
            errorInfo,
            null,
            2
          )}`
        );

        return;
      }

      setOpportunities((current) => [
        newOpportunity,
        ...current,
      ]);

      setName("");
      setEmail("");
      setValue("");
      setType("missed_call");
      setDescription("");
      setShowForm(false);

      alert("Opportunity created successfully.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Status update error:", error);
      alert(`Could not update status: ${error.message}`);
      return;
    }

    setOpportunities((current) =>
      current.map((opportunity) =>
        opportunity.id === id
          ? { ...opportunity, status }
          : opportunity
      )
    );
  }

  function openFollowUp(opportunity: Opportunity) {
    const customer = getCustomer(opportunity.customer_id);

    setFollowUpOpportunity(opportunity);
    setFollowUpChannel(customer?.email ? "email" : "call");
    setFollowUpMessage(
      `Follow up with ${
        customer?.name || "customer"
      } regarding this opportunity.`
    );
    setFollowUpDate("");
  }

  async function createFollowUp() {
    if (!followUpOpportunity) return;

    if (!followUpDate) {
      alert("Please select a follow-up date and time.");
      return;
    }

    if (!followUpMessage.trim()) {
      alert("Please enter a follow-up message.");
      return;
    }

    setFollowUpSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        alert(`User error: ${userError.message}`);
        return;
      }

      if (!user) {
        alert("You are not logged in.");
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .single();

      if (profileError || !profile?.business_id) {
        alert(
          `Profile error: ${
            profileError?.message || "Business not found."
          }`
        );
        return;
      }

      const followUpData = {
        business_id: profile.business_id,
        opportunity_id: followUpOpportunity.id,
        channel: followUpChannel,
        message: followUpMessage.trim(),
        scheduled_at: new Date(
          followUpDate
        ).toISOString(),
        status: "pending",
      };

      const { data, error } = await supabase
        .from("follow_ups")
        .insert(followUpData)
        .select()
        .single();

      if (error) {
        const errorInfo = {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        };

        console.error(
          "FOLLOW-UP ERROR:",
          JSON.stringify(errorInfo, null, 2)
        );

        alert(
          `FOLLOW-UP ERROR\n\n${JSON.stringify(
            errorInfo,
            null,
            2
          )}`
        );

        return;
      }

      console.log("Follow-up created:", data);

      setFollowUpOpportunity(null);
      setFollowUpMessage("");
      setFollowUpDate("");

      alert("Follow-up scheduled successfully!");
    } catch (err) {
      console.error("Unexpected follow-up error:", err);

      alert(
        `Unexpected error: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    } finally {
      setFollowUpSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] p-8 text-white">
        <p className="text-gray-400">
          Loading opportunities...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] px-5 py-8 text-white sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
              REVORA
            </p>

            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Opportunities
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Revenue opportunities that need attention.
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
          >
            {showForm ? "Close" : "+ Add Opportunity"}
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-3xl border border-white/10 bg-[#0c1016] p-6">
            <h2 className="text-lg font-semibold">
              Add Revenue Opportunity
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Add a potential missed-revenue opportunity.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">

              <input
                type="text"
                placeholder="Customer name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
              />

              <input
                type="email"
                placeholder="Customer email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
              />

              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-xl border border-white/10 bg-[#10151d] px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
              >
                <option value="missed_call">Missed call</option>
                <option value="follow_up">Follow-up</option>
                <option value="new_lead">New lead</option>
                <option value="quote">Quote</option>
                <option value="inquiry">Inquiry</option>
              </select>

              <input
                type="number"
                placeholder="Estimated value ($)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
              />

              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500 md:col-span-2"
              />

              <div className="flex justify-end md:col-span-2">
                <button
                  onClick={createOpportunity}
                  disabled={saving}
                  className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Opportunity"}
                </button>
              </div>

            </div>
          </div>
        )}

        {opportunities.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-10 text-center">
            <h2 className="text-xl font-semibold">
              No opportunities yet
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              When Revora finds missed revenue, opportunities will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">

            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">

                <div>
                  <h2 className="text-lg font-semibold">
                    Revenue Opportunities
                  </h2>

                  <p className="mt-1 text-xs text-gray-500">
                    {opportunities.length}{" "}
                    {opportunities.length === 1
                      ? "opportunity"
                      : "opportunities"}{" "}
                    found
                  </p>
                </div>

                <div className="rounded-xl bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-400">
                  $
                  {opportunities
                    .reduce(
                      (total, opportunity) =>
                        total +
                        Number(opportunity.estimated_value),
                      0
                    )
                    .toLocaleString()}
                </div>

              </div>
            </div>

            <div className="divide-y divide-white/10">

              {opportunities.map((opportunity) => {
                const customer = getCustomer(
                  opportunity.customer_id
                );

                return (
                  <div
                    key={opportunity.id}
                    className="p-6 transition hover:bg-white/[0.025]"
                  >

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                      <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 font-bold text-indigo-400">
                          {customer?.name
                            ?.split(" ")
                            .map((word) => word[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase() || "C"}
                        </div>

                        <div>

                          <h3 className="font-semibold">
                            {customer?.name || "Unknown Customer"}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {customer?.email || "No email"}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">

                            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs capitalize text-indigo-400">
                              {opportunity.type.replaceAll("_", " ")}
                            </span>

                            <span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-gray-400">
                              {opportunity.status}
                            </span>

                          </div>

                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-6">

                        <div>
                          <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                            VALUE
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            ${Number(
                              opportunity.estimated_value
                            ).toLocaleString()}
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

                    <div className="mt-5 flex flex-wrap gap-2">

                      {[
                        "new",
                        "contacting",
                        "scheduled",
                        "recovered",
                        "lost",
                      ].map((status) => (
                        <button
                          key={status}
                          onClick={() =>
                            updateStatus(
                              opportunity.id,
                              status
                            )
                          }
                          className={`rounded-lg border px-3 py-2 text-xs capitalize transition ${
                            opportunity.status === status
                              ? "border-indigo-500 bg-indigo-500 text-white"
                              : "border-white/10 text-gray-400 hover:bg-white/5"
                          }`}
                        >
                          {status}
                        </button>
                      ))}

                      <button
                        onClick={() =>
                          openFollowUp(opportunity)
                        }
                        className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-400 transition hover:bg-indigo-500/20"
                      >
                        + Schedule Follow-Up
                      </button>

                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {followUpOpportunity && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">

            <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c1016] p-6 shadow-2xl">

              <div className="flex items-center justify-between">

                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                    REVORA
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Schedule Follow-Up
                  </h2>
                </div>

                <button
                  onClick={() =>
                    setFollowUpOpportunity(null)
                  }
                  className="rounded-lg px-3 py-2 text-gray-500 hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>

              </div>

              <div className="mt-6 space-y-4">

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    CUSTOMER
                  </p>

                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                    {getCustomer(
                      followUpOpportunity.customer_id
                    )?.name || "Unknown Customer"}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    CHANNEL
                  </p>

                  <select
                    value={followUpChannel}
                    onChange={(e) =>
                      setFollowUpChannel(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#10151d] px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  >
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    SCHEDULED AT
                  </p>

                  <input
                    type="datetime-local"
                    value={followUpDate}
                    onChange={(e) =>
                      setFollowUpDate(e.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-gray-500">
                    MESSAGE
                  </p>

                  <textarea
                    value={followUpMessage}
                    onChange={(e) =>
                      setFollowUpMessage(e.target.value)
                    }
                    rows={5}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={createFollowUp}
                  disabled={followUpSaving}
                  className="w-full rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                >
                  {followUpSaving
                    ? "Scheduling..."
                    : "Schedule Follow-Up"}
                </button>

              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}