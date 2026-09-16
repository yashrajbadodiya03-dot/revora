"use client";

import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import Sidebar from "@/components/Sidebar";
import { createClient } from "@/lib/supabase";

type Customer = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type Opportunity = {
  id: string;
  customer_id: string | null;
  title: string;
  type: string;
  estimated_value: number | null;
  status: string;
  created_at: string;
};

type CustomerForm = {
  name: string;
  email: string;
  phone: string;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  phone: "",
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "CU";

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    missed_call: "Missed Call",
    unanswered_inquiry: "Website Inquiry",
    old_estimate: "Old Estimate",
    no_follow_up: "No Follow-Up",
  };

  return labels[type] ?? type.replaceAll("_", " ");
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    new: "New",
    contacted: "Contacted",
    qualified: "Qualified",
    in_progress: "In Progress",
    recovered: "Recovered",
    closed: "Closed",
    lost: "Lost",
  };

  return labels[status] ?? status;
}

function cleanTitle(title: string) {
  return title.replace(/^\[REVORA DEMO\]\s*/i, "").trim();
}

function displayEmail(email: string | null) {
  if (!email) return null;

  return email.replace(/@demo\.revora\.local$/i, "@example.com");
}

function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0f15] shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>

            {description && (
              <p className="mt-1 max-w-md text-sm leading-5 text-gray-500">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  caption,
  accent,
}: {
  label: string;
  value: string;
  caption: string;
  accent?: "emerald" | "indigo";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0c1016] p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
          {label}
        </p>

        <span
          className={`h-2 w-2 rounded-full ${
            accent === "emerald" ? "bg-emerald-400" : "bg-indigo-400"
          }`}
        />
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">{caption}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
        active
          ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
          : "border-white/10 bg-white/5 text-gray-500"
      }`}
    >
      {active ? "Active history" : "No active history"}
    </span>
  );
}

export default function CustomersPage() {
  const supabase = useMemo(() => createClient(), []);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");

  const [selectedCustomer, setSelectedCustomer] =
    useState<Customer | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [editingCustomer, setEditingCustomer] =
    useState<Customer | null>(null);

  const [form, setForm] = useState<CustomerForm>(emptyForm);

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
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error("No business workspace found.");
      }

      setBusinessId(profile.business_id);

      const [customerResult, opportunityResult] = await Promise.all([
        supabase
          .from("customers")
          .select("id, business_id, name, email, phone")
          .eq("business_id", profile.business_id)
          .order("name", { ascending: true }),

        supabase
          .from("opportunities")
          .select(
            "id, customer_id, title, type, estimated_value, status, created_at",
          )
          .eq("business_id", profile.business_id)
          .order("created_at", { ascending: false }),
      ]);

      if (customerResult.error) throw customerResult.error;
      if (opportunityResult.error) throw opportunityResult.error;

      setCustomers((customerResult.data ?? []) as Customer[]);
      setOpportunities((opportunityResult.data ?? []) as Opportunity[]);
    } catch (err) {
      console.error("Customers load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading customers.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  const stats = useMemo(() => {
    const active = opportunities.filter(
      (item) => !["recovered", "closed", "lost"].includes(item.status),
    );

    const recovered = opportunities.filter(
      (item) => item.status === "recovered",
    );

    return {
      customerCount: customers.length,

      activeCustomers: new Set(
        active.map((item) => item.customer_id).filter(Boolean),
      ).size,

      pipeline: active.reduce(
        (sum, item) => sum + Number(item.estimated_value || 0),
        0,
      ),

      recovered: recovered.reduce(
        (sum, item) => sum + Number(item.estimated_value || 0),
        0,
      ),
    };
  }, [customers, opportunities]);

  const customerRows = useMemo(() => {
    const normalized = customers.map((customer) => {
      const customerOpportunities = opportunities.filter(
        (item) => item.customer_id === customer.id,
      );

      const active = customerOpportunities.filter(
        (item) => !["recovered", "closed", "lost"].includes(item.status),
      );

      const recovered = customerOpportunities.filter(
        (item) => item.status === "recovered",
      );

      const lastActivity = [...customerOpportunities].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime(),
      )[0];

      return {
        customer,
        all: customerOpportunities,
        active,
        recovered,

        pipeline: active.reduce(
          (sum, item) => sum + Number(item.estimated_value || 0),
          0,
        ),

        recoveredValue: recovered.reduce(
          (sum, item) => sum + Number(item.estimated_value || 0),
          0,
        ),

        lastActivity,
      };
    });

    const needle = query.trim().toLowerCase();

    if (!needle) return normalized;

    return normalized.filter(({ customer }) =>
      [customer.name, customer.email ?? "", customer.phone ?? ""].some(
        (value) => value.toLowerCase().includes(needle),
      ),
    );
  }, [customers, opportunities, query]);

  function resetMessages() {
    setError("");
    setSuccess("");
  }

  function openCreate() {
    resetMessages();
    setEditingCustomer(null);
    setForm(emptyForm);
    setShowCreate(true);
  }

  function openEdit(customer: Customer) {
    resetMessages();

    setEditingCustomer(customer);

    setForm({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
    });
  }

  function closeModal() {
    if (saving) return;

    setShowCreate(false);
    setEditingCustomer(null);
    setForm(emptyForm);
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessId) return;

    const name = form.name.trim();

    if (!name) {
      setError("Customer name is required.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      };

      if (editingCustomer) {
        const { data, error: updateError } = await supabase
          .from("customers")
          .update(payload)
          .eq("id", editingCustomer.id)
          .eq("business_id", businessId)
          .select("id, business_id, name, email, phone")
          .single();

        if (updateError) throw updateError;

        setCustomers((current) =>
          current.map((customer) =>
            customer.id === editingCustomer.id
              ? (data as Customer)
              : customer,
          ),
        );

        setSuccess("Customer updated successfully.");
      } else {
        const { data, error: insertError } = await supabase
          .from("customers")
          .insert({
            business_id: businessId,
            ...payload,
          })
          .select("id, business_id, name, email, phone")
          .single();

        if (insertError) throw insertError;

        setCustomers((current) =>
          [...current, data as Customer].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        );

        setSuccess("Customer created successfully.");
      }

      setShowCreate(false);
      setEditingCustomer(null);
      setForm(emptyForm);
    } catch (err) {
      console.error("Customer save error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to save customer.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(customer: Customer) {
    if (!businessId) return;

    const customerOpportunities = opportunities.filter(
      (item) => item.customer_id === customer.id,
    );

    if (customerOpportunities.length > 0) {
      setError(
        "This customer has linked opportunities. Remove or reassign those opportunities before deleting the customer.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${customer.name}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(customer.id);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id)
        .eq("business_id", businessId);

      if (deleteError) throw deleteError;

      setCustomers((current) =>
        current.filter((item) => item.id !== customer.id),
      );

      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer(null);
      }

      setSuccess("Customer deleted successfully.");
    } catch (err) {
      console.error("Customer delete error:", err);

      setError(
        err instanceof Error ? err.message : "Unable to delete customer.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#080b10] text-white">
      <Sidebar />

      <main className="min-h-screen lg:pl-64">
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-indigo-400" />

              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                Customer intelligence
              </p>
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-xs text-gray-500">Revora HVAC</span>

              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-indigo-400/20 bg-indigo-500/15 text-xs font-semibold text-indigo-300">
                RH
              </div>
            </div>
          </div>

          <section className="pt-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">
                  Customers
                </p>

                <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Customers
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
                  Understand every customer, their recovery opportunities,
                  follow-ups, and recovered revenue.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="mr-2 h-4 w-4 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <path d="m14.5 14.5 3 3" strokeLinecap="round" />
                    <circle cx="8.5" cy="8.5" r="5.5" />
                  </svg>

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search customers"
                    className="w-44 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
                  />
                </div>

                <button
                  type="button"
                  onClick={openCreate}
                  className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  + Add Customer
                </button>
              </div>
            </div>
          </section>

          <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Customer accounts"
              value={String(stats.customerCount)}
              caption="Active workspace customers"
            />

            <Metric
              label="Engaged customers"
              value={String(stats.activeCustomers)}
              caption="Customers with open recovery work"
              accent="indigo"
            />

            <Metric
              label="Active pipeline"
              value={formatMoney(stats.pipeline)}
              caption="Open opportunity value"
            />

            <Metric
              label="Recovered revenue"
              value={formatMoney(stats.recovered)}
              caption="Completed recovery value"
              accent="emerald"
            />
          </section>

          {error && (
            <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          <section className="mt-7 overflow-hidden rounded-3xl border border-white/10 bg-[#0c1016]">
            <div className="flex flex-col gap-3 border-b border-white/10 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300">
                  Customer directory
                </p>

                <div className="mt-2 flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Customer accounts
                  </h2>

                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-gray-400">
                    {stats.customerCount}{" "}
                    {stats.customerCount === 1 ? "customer" : "customers"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-gray-500">
                  One view of customer context, open pipeline, and recovered
                  value.
                </p>
              </div>

              <div className="text-xs text-gray-500">
                {customerRows.length} shown
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="px-6 py-16 text-center text-sm text-gray-500">
                  Loading customer accounts…
                </div>
              ) : customerRows.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <p className="text-base font-semibold text-white">
                    No customer accounts found
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                    Add a customer to start building recovery history and
                    pipeline context.
                  </p>

                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-5 rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400"
                  >
                    Add Customer
                  </button>
                </div>
              ) : (
                customerRows.map((row) => {
                  const activeHistory = row.active.length > 0;
                  const hasRecovered = row.recovered.length > 0;

                  return (
                    <div
                      key={row.customer.id}
                      className="p-5 transition hover:bg-white/[0.015] sm:p-6"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/15 bg-indigo-500/10 text-sm font-bold text-indigo-300">
                            {getInitials(row.customer.name)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-lg font-semibold text-white">
                                {row.customer.name}
                              </h3>

                              <StatusPill
                                active={activeHistory || hasRecovered}
                              />
                            </div>

                            <div className="mt-2 flex flex-col gap-1 text-sm text-gray-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
                              {row.customer.email && (
                                <span>
                                  {displayEmail(row.customer.email)}
                                </span>
                              )}

                              {row.customer.phone && (
                                <span>{row.customer.phone}</span>
                              )}
                            </div>

                            {row.lastActivity && (
                              <p className="mt-2 text-xs text-gray-600">
                                Latest opportunity:{" "}
                                {cleanTitle(row.lastActivity.title)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-5 xl:min-w-[390px]">
                          <div>
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">
                              OPPORTUNITIES
                            </p>

                            <p className="mt-1 text-xl font-semibold text-white">
                              {row.all.length}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">
                              PIPELINE
                            </p>

                            <p className="mt-1 text-xl font-semibold text-white">
                              {formatMoney(row.pipeline)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-semibold tracking-[0.14em] text-gray-600">
                              RECOVERED
                            </p>

                            <p className="mt-1 text-xl font-semibold text-emerald-300">
                              {formatMoney(row.recoveredValue)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {row.all.length > 0 && (
                        <div className="mt-5 rounded-2xl border border-white/5 bg-white/[0.015] px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {row.all.slice(0, 3).map((opportunity) => (
                              <span
                                key={opportunity.id}
                                className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-medium ${
                                  opportunity.status === "recovered"
                                    ? "border-emerald-500/15 bg-emerald-500/5 text-emerald-300"
                                    : "border-white/10 bg-white/5 text-gray-400"
                                }`}
                              >
                                {typeLabel(opportunity.type)} ·{" "}
                                {statusLabel(opportunity.status)} ·{" "}
                                {formatMoney(
                                  Number(opportunity.estimated_value || 0),
                                )}
                              </span>
                            ))}

                            {row.all.length > 3 && (
                              <span className="text-[10px] text-gray-600">
                                +{row.all.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="mt-5 flex flex-wrap gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(row.customer)}
                          className="rounded-xl bg-indigo-500 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => openEdit(row.customer)}
                          className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 transition hover:bg-white/5 hover:text-white"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void deleteCustomer(row.customer)
                          }
                          disabled={deletingId === row.customer.id}
                          className="rounded-xl border border-rose-500/15 bg-rose-500/5 px-4 py-2.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId === row.customer.id
                            ? "Deleting…"
                            : "Delete"}
                        </button>

                        {row.customer.email && (
                          <a
                            href={`mailto:${
                              displayEmail(row.customer.email) ??
                              row.customer.email
                            }`}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                          >
                            Email
                          </a>
                        )}

                        {row.customer.phone && (
                          <a
                            href={`tel:${row.customer.phone}`}
                            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white"
                          >
                            Call
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <footer className="py-10 text-center text-xs text-gray-600">
            REVORA · Revenue Recovery Engine
          </footer>
        </div>
      </main>

      {(showCreate || editingCustomer) && (
        <Modal
          title={editingCustomer ? "Edit Customer" : "Add Customer"}
          description={
            editingCustomer
              ? "Keep customer contact details accurate for recovery workflows."
              : "Create a customer account so Revora can attach opportunities and recovery history."
          }
          onClose={closeModal}
        >
          <form onSubmit={saveCustomer} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400">
                Customer name
              </label>

              <input
                autoFocus
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Sarah Jenkins"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-indigo-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400">
                Email
              </label>

              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="customer@example.com"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-indigo-400/40"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-400">
                Phone
              </label>

              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                placeholder="(512) 555-0141"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-indigo-400/40"
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-300">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : editingCustomer
                    ? "Save Changes"
                    : "Create Customer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {selectedCustomer && (
        <Modal
          title={selectedCustomer.name}
          description="Customer recovery profile"
          onClose={() => setSelectedCustomer(null)}
        >
          {(() => {
            const items = opportunities.filter(
              (item) => item.customer_id === selectedCustomer.id,
            );

            const pipeline = items
              .filter(
                (item) =>
                  !["recovered", "closed", "lost"].includes(item.status),
              )
              .reduce(
                (sum, item) => sum + Number(item.estimated_value || 0),
                0,
              );

            const recovered = items
              .filter((item) => item.status === "recovered")
              .reduce(
                (sum, item) => sum + Number(item.estimated_value || 0),
                0,
              );

            return (
              <div className="space-y-5">
                <div className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/15 bg-indigo-500/10 text-sm font-bold text-indigo-300">
                    {getInitials(selectedCustomer.name)}
                  </div>

                  <div className="min-w-0">
                    <p className="text-base font-semibold text-white">
                      {selectedCustomer.name}
                    </p>

                    {selectedCustomer.email && (
                      <p className="mt-1 break-all text-sm text-gray-500">
                        {displayEmail(selectedCustomer.email)}
                      </p>
                    )}

                    {selectedCustomer.phone && (
                      <p className="mt-1 text-sm text-gray-500">
                        {selectedCustomer.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] tracking-[0.14em] text-gray-600">
                      OPPORTUNITIES
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {items.length}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-[10px] tracking-[0.14em] text-gray-600">
                      PIPELINE
                    </p>

                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatMoney(pipeline)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                    <p className="text-[10px] tracking-[0.14em] text-emerald-500/70">
                      RECOVERED
                    </p>

                    <p className="mt-2 text-xl font-semibold text-emerald-300">
                      {formatMoney(recovered)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                    Opportunity history
                  </p>

                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-5 text-sm text-gray-500">
                        No opportunity history yet.
                      </div>
                    ) : (
                      items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {cleanTitle(item.title)}
                            </p>

                            <p className="mt-1 text-xs text-gray-600">
                              {typeLabel(item.type)} ·{" "}
                              {statusLabel(item.status)}
                            </p>
                          </div>

                          <p className="shrink-0 text-sm font-semibold text-white">
                            {formatMoney(
                              Number(item.estimated_value || 0),
                            )}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}