"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

type Customer = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type Business = {
  id: string;
  name: string;
};

type Opportunity = {
  id: string;
  customer_id: string | null;
  title: string;
  type: string;
  estimated_value: number;
  priority_score: number;
  probability_score: number;
  status: string;
  created_at: string;
};

type FollowUp = {
  id: string;
  opportunity_id: string | null;
  channel: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
};

type RevenueEvent = {
  id: string;
  opportunity_id: string;
  amount: number;
  created_at: string;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
};

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [revenueEvents, setRevenueEvents] = useState<RevenueEvent[]>([]);

  const [business, setBusiness] = useState<Business | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);

  async function loadCustomers() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserEmail(user.email ?? "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error(
          "Your account is not connected to a business workspace yet."
        );
      }

      const currentBusinessId = profile.business_id;
      setBusinessId(currentBusinessId);

      const { data: businessData, error: businessError } =
        await supabase
          .from("businesses")
          .select("id, name")
          .eq("id", currentBusinessId)
          .single();

      if (businessError) throw businessError;

      setBusiness(businessData);

      const [
        customersResult,
        opportunitiesResult,
        followUpsResult,
        revenueEventsResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(
            "id, business_id, name, email, phone, address, created_at, updated_at"
          )
          .eq("business_id", currentBusinessId)
          .order("created_at", { ascending: false }),

        supabase
          .from("opportunities")
          .select(
            "id, customer_id, title, type, estimated_value, priority_score, probability_score, status, created_at"
          )
          .eq("business_id", currentBusinessId)
          .order("created_at", { ascending: false }),

        supabase
          .from("follow_ups")
          .select(
            "id, opportunity_id, channel, status, scheduled_at, created_at"
          )
          .eq("business_id", currentBusinessId)
          .order("created_at", { ascending: false }),

        supabase
          .from("revenue_events")
          .select("id, opportunity_id, amount, created_at")
          .eq("business_id", currentBusinessId)
          .order("created_at", { ascending: false }),
      ]);

      if (customersResult.error) throw customersResult.error;
      if (opportunitiesResult.error) throw opportunitiesResult.error;
      if (followUpsResult.error) throw followUpsResult.error;
      if (revenueEventsResult.error) throw revenueEventsResult.error;

      setCustomers(customersResult.data ?? []);
      setOpportunities(opportunitiesResult.data ?? []);
      setFollowUps(followUpsResult.data ?? []);
      setRevenueEvents(revenueEventsResult.data ?? []);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to load customers."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCustomers();
  }, []);

  function getInitials(name: string) {
    const value = name.trim();

    if (!value) return "CU";

    const parts = value.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "—";

    return value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(date: string | null) {
    if (!date) return "—";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "—";

    return value.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function openAddModal() {
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  function openEditModal(customer: Customer) {
    setEditingCustomer(customer);

    setForm({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
    });

    setError("");
    setShowModal(true);
  }

  function closeModal(force = false) {
    if (saving && !force) return;

    setShowModal(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessId) {
      setError("Business information is missing.");
      return;
    }

    if (!form.name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (editingCustomer) {
        const { error: updateError } = await supabase
          .from("customers")
          .update({
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCustomer.id)
          .eq("business_id", businessId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("customers")
          .insert({
            business_id: businessId,
            name: form.name.trim(),
            email: form.email.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
          });

        if (insertError) throw insertError;
      }

      closeModal(true);
      await loadCustomers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    const confirmed = window.confirm(
      `Delete customer "${customer.name}"? This cannot be undone.`
    );

    if (!confirmed || !businessId) return;

    try {
      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id)
        .eq("business_id", businessId);

      if (deleteError) throw deleteError;

      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
      }

      await loadCustomers();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to delete customer."
      );
    }
  }

  function getCustomerOpportunities(customerId: string) {
    return opportunities.filter(
      (item) => item.customer_id === customerId
    );
  }

  function getCustomerFollowUps(customerId: string) {
    const ids = new Set(
      getCustomerOpportunities(customerId).map((item) => item.id)
    );

    return followUps.filter(
      (item) =>
        item.opportunity_id !== null &&
        ids.has(item.opportunity_id)
    );
  }

  function getCustomerRevenue(customerId: string) {
    const ids = new Set(
      getCustomerOpportunities(customerId).map((item) => item.id)
    );

    return revenueEvents
      .filter((item) => ids.has(item.opportunity_id))
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  function getCustomerPipeline(customerId: string) {
    return getCustomerOpportunities(customerId)
      .filter(
        (item) =>
          item.status !== "recovered" &&
          item.status !== "lost" &&
          item.status !== "closed"
      )
      .reduce(
        (sum, item) => sum + Number(item.estimated_value || 0),
        0
      );
  }

  return (
    <main className="min-h-screen w-full overflow-x-hidden bg-[#07090d] text-white">
      <Sidebar />

      <section className="w-full min-w-0 lg:ml-[250px]">
        {/* Desktop top bar */}
        <header className="hidden h-[72px] items-center justify-between border-b border-white/10 px-8 lg:flex xl:px-10">
          <div>
            <p className="text-sm font-medium text-gray-400">
              Customers
            </p>

            <p className="mt-0.5 text-[11px] text-gray-600">
              {business?.name || "Revora"}
            </p>
          </div>

          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
            {business ? getInitials(business.name) : "RV"}
          </div>
        </header>

        {/* 
          IMPORTANT:
          No huge top padding.
          Mobile navigation occupies the first ~94px.
          Content starts immediately after it.
        */}
        <div className="px-5 pb-8 pt-[8px] sm:px-7 lg:px-8 lg:py-8 xl:px-10">
          {/* Mobile identity */}
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <div>
              <p className="text-sm font-medium text-gray-300">
                Customers
              </p>

              <p className="mt-0.5 text-[11px] text-gray-600">
                {business?.name || "Revora"}
              </p>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold">
              {business ? getInitials(business.name) : "RV"}
            </div>
          </div>

          {/* Hero */}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />

                <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                  CUSTOMER INTELLIGENCE
                </p>
              </div>

              <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Customers
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Understand every customer, their recovery opportunities,
                follow-ups, and recovered revenue.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddModal}
              className="w-fit rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              + Add Customer
            </button>
          </div>

          {error && !showModal && (
            <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Directory */}
          <section className="mt-8 rounded-3xl border border-white/10 bg-[#0c1016]">
            <div className="flex flex-col gap-2 border-b border-white/10 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                  CUSTOMER DIRECTORY
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Customer accounts
                </h2>
              </div>

              <p className="text-sm text-gray-500">
                {customers.length}{" "}
                {customers.length === 1 ? "customer" : "customers"}
              </p>
            </div>

            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />
              </div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
                  CU
                </div>

                <h3 className="mt-5 text-lg font-semibold">
                  No customers yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                  Add your first customer to start building a complete
                  revenue recovery history.
                </p>

                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold"
                >
                  + Add Customer
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {customers.map((customer) => {
                  const customerOpportunities =
                    getCustomerOpportunities(customer.id);

                  const customerFollowUps =
                    getCustomerFollowUps(customer.id);

                  const recovered =
                    getCustomerRevenue(customer.id);

                  const pipeline =
                    getCustomerPipeline(customer.id);

                  return (
                    <div
                      key={customer.id}
                      className="flex flex-col gap-5 px-6 py-6 sm:px-8 lg:flex-row lg:items-center lg:justify-between"
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedCustomer(customer)}
                        className="flex min-w-0 flex-1 items-center gap-4 text-left"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-xs font-bold text-indigo-400">
                          {getInitials(customer.name)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-base font-semibold">
                              {customer.name}
                            </h3>

                            {(customerOpportunities.length > 0 ||
                              customerFollowUps.length > 0 ||
                              recovered > 0) && (
                              <span className="rounded-md bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-400">
                                Active history
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
                            {customer.email && (
                              <span>{customer.email}</span>
                            )}

                            {customer.phone && (
                              <span>{customer.phone}</span>
                            )}

                            {customer.address && (
                              <span>{customer.address}</span>
                            )}
                          </div>
                        </div>
                      </button>

                      <div className="grid grid-cols-3 gap-5 sm:min-w-[360px]">
                        <div>
                          <p className="text-[10px] text-gray-500">
                            OPPORTUNITIES
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {customerOpportunities.length}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-gray-500">
                            PIPELINE
                          </p>

                          <p className="mt-1 text-lg font-semibold">
                            {formatMoney(pipeline)}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] text-gray-500">
                            RECOVERED
                          </p>

                          <p className="mt-1 text-lg font-semibold text-emerald-400">
                            {formatMoney(recovered)}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCustomer(customer)
                          }
                          className="rounded-xl border border-indigo-500/20 px-4 py-2.5 text-sm text-indigo-400 hover:bg-indigo-500/10"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(customer)}
                          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteCustomer(customer)}
                          className="rounded-xl border border-red-500/20 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <footer className="py-8 text-center text-xs text-gray-600">
            REVORA · Revenue Recovery Engine
          </footer>
        </div>
      </section>

      {/* Customer 360 */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-5">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0c1016]">
            <div className="sticky top-0 border-b border-white/10 bg-[#0c1016]/95 px-6 py-6 backdrop-blur">
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-sm font-bold text-indigo-400">
                    {getInitials(selectedCustomer.name)}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.18em] text-indigo-500">
                      CUSTOMER 360
                    </p>

                    <h2 className="mt-1 text-2xl font-semibold">
                      {selectedCustomer.name}
                    </h2>

                    <p className="text-sm text-gray-500">
                      {selectedCustomer.email ||
                        selectedCustomer.phone ||
                        "No contact information"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="text-2xl text-gray-500 hover:text-white"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              {(() => {
                const customerOpportunities =
                  getCustomerOpportunities(selectedCustomer.id);

                const customerFollowUps =
                  getCustomerFollowUps(selectedCustomer.id);

                const recovered =
                  getCustomerRevenue(selectedCustomer.id);

                const pipeline =
                  getCustomerPipeline(selectedCustomer.id);

                const potential =
                  customerOpportunities.reduce(
                    (sum, item) =>
                      sum + Number(item.estimated_value || 0),
                    0
                  );

                return (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Contact
                        </p>

                        <p className="mt-2 text-sm">
                          {selectedCustomer.email || "No email"}
                        </p>

                        <p className="mt-1 text-sm text-gray-500">
                          {selectedCustomer.phone || "No phone"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Address
                        </p>

                        <p className="mt-2 text-sm">
                          {selectedCustomer.address || "No address"}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                        <p className="text-[10px] uppercase tracking-wider text-gray-500">
                          Customer Since
                        </p>

                        <p className="mt-2 text-sm">
                          {formatDate(selectedCustomer.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <CustomerMetric
                        label="Potential"
                        value={formatMoney(potential)}
                      />

                      <CustomerMetric
                        label="Active Pipeline"
                        value={formatMoney(pipeline)}
                      />

                      <CustomerMetric
                        label="Recovered"
                        value={formatMoney(recovered)}
                        green
                      />

                      <CustomerMetric
                        label="Follow-Ups"
                        value={String(customerFollowUps.length)}
                      />
                    </div>

                    <section className="mt-8">
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-indigo-500">
                        RECOVERY HISTORY
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        Opportunities
                      </h3>

                      <div className="mt-4 space-y-3">
                        {customerOpportunities.length === 0 ? (
                          <div className="rounded-2xl border border-white/10 p-6 text-sm text-gray-500">
                            No recovery opportunities for this customer yet.
                          </div>
                        ) : (
                          customerOpportunities.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"
                            >
                              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {item.title}
                                  </h4>

                                  <p className="mt-2 text-xs text-gray-500">
                                    {item.type.replaceAll("_", " ")} ·{" "}
                                    {formatDate(item.created_at)}
                                  </p>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-[10px] text-gray-500">
                                      VALUE
                                    </p>

                                    <p className="mt-1 font-semibold">
                                      {formatMoney(
                                        Number(item.estimated_value || 0)
                                      )}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[10px] text-gray-500">
                                      PRIORITY
                                    </p>

                                    <p className="mt-1 font-semibold text-indigo-400">
                                      {item.priority_score}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[10px] text-gray-500">
                                      PROBABILITY
                                    </p>

                                    <p className="mt-1 font-semibold text-indigo-400">
                                      {item.probability_score}%
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="mt-8">
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-indigo-500">
                        RECOVERY ACTIONS
                      </p>

                      <h3 className="mt-2 text-xl font-semibold">
                        Follow-Up History
                      </h3>

                      <div className="mt-4 rounded-2xl border border-white/10">
                        {customerFollowUps.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500">
                            No follow-ups recorded for this customer.
                          </div>
                        ) : (
                          customerFollowUps.map((item) => (
                            <div
                              key={item.id}
                              className="flex flex-col gap-2 border-b border-white/10 p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <p className="text-sm font-semibold capitalize">
                                  {item.channel} follow-up
                                </p>

                                <p className="mt-1 text-xs text-gray-500">
                                  {item.scheduled_at
                                    ? `Scheduled ${formatDateTime(
                                        item.scheduled_at
                                      )}`
                                    : `Created ${formatDateTime(
                                        item.created_at
                                      )}`}
                                </p>
                              </div>

                              <span className="w-fit rounded-lg bg-white/5 px-3 py-1.5 text-xs capitalize text-gray-400">
                                {item.status}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section className="mt-8 rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.03] p-6 sm:p-8">
                      <p className="text-[10px] font-semibold tracking-[0.18em] text-emerald-500">
                        REVENUE RECOVERED
                      </p>

                      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-xl font-semibold">
                          Actual recovered revenue
                        </h3>

                        <p className="text-3xl font-semibold text-emerald-400">
                          {formatMoney(recovered)}
                        </p>
                      </div>
                    </section>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-5">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0c1016] p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.18em] text-indigo-500">
                  CUSTOMER
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  {editingCustomer ? "Edit Customer" : "Add Customer"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => closeModal()}
                disabled={saving}
                className="text-2xl text-gray-500 hover:text-white"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Name *"
                value={form.name}
                placeholder="Customer name"
                onChange={(value) =>
                  setForm({ ...form, name: value })
                }
              />

              <Input
                label="Email"
                type="email"
                value={form.email}
                placeholder="customer@example.com"
                onChange={(value) =>
                  setForm({ ...form, email: value })
                }
              />

              <Input
                label="Phone"
                value={form.phone}
                placeholder="+1 555 123 4567"
                onChange={(value) =>
                  setForm({ ...form, phone: value })
                }
              />

              <div>
                <label className="mb-2 block text-sm text-gray-400">
                  Address
                </label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      address: event.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Customer address"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => closeModal()}
                  disabled={saving}
                  className="flex-1 rounded-xl border border-white/10 px-5 py-3 text-sm font-semibold text-gray-300 hover:bg-white/5"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingCustomer
                      ? "Save Changes"
                      : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

function CustomerMetric({
  label,
  value,
  green,
}: {
  label: string;
  value: string;
  green?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          green ? "text-emerald-400" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm text-gray-400">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-600 focus:border-indigo-500"
      />
    </div>
  );
}