"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase";

type Prospect = {
  id: string;
  name: string;
  email: string;
  business_name: string;
  plan: string | null;
  subscription_status: string | null;
  demo_access: boolean;
  payment_status: string | null;
  activation_status: string | null;
  business_id: string | null;
};

type AccessRequest = {
  id: string;
  created_at: string;
  name: string;
  business_name: string;
  email: string;
  note: string | null;
  status: "new" | "contacted" | "converted" | "closed";
  business_id: string | null;
  plan: string | null;
  subscription_status: string | null;
  demo_access: boolean;
  payment_status: string | null;
  activation_status: string | null;
};

type PipelineFilter =
  | "all"
  | "new"
  | "contacted"
  | "converted"
  | "paid";

function statusClasses(status: string) {
  if (status === "paid" || status === "active") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
  }

  if (status === "demo") {
    return "border-indigo-500/20 bg-indigo-500/10 text-indigo-400";
  }

  if (status === "converted") {
    return "border-purple-500/20 bg-purple-500/10 text-purple-400";
  }

  if (status === "contacted") {
    return "border-blue-500/20 bg-blue-500/10 text-blue-400";
  }

  if (status === "closed") {
    return "border-gray-500/20 bg-gray-500/10 text-gray-400";
  }

  return "border-amber-500/20 bg-amber-500/10 text-amber-400";
}

function getWorkspaceStatus(request: AccessRequest) {
  if (!request.business_id) {
    return "Workspace not linked";
  }

  if (
    request.plan === "paid" &&
    request.subscription_status === "active"
  ) {
    return "Paid • Active";
  }

  if (request.demo_access) {
    return "Demo • Active";
  }

  return "Pending access";
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function AdminPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [updatingRequestId, setUpdatingRequestId] =
    useState<string | null>(null);

  const [updatingBusinessId, setUpdatingBusinessId] =
    useState<string | null>(null);

  const [filter, setFilter] =
    useState<PipelineFilter>("all");

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      if (
        user.email?.toLowerCase() !==
        "yashrajbadodiya03@gmail.com"
      ) {
        window.location.href = "/demo-pending";
        return;
      }

      const {
        data: requestData,
        error: requestError,
      } = await supabase.rpc(
        "admin_list_access_requests",
      );

      if (requestError) {
        throw requestError;
      }

      setRequests(
        (requestData ?? []) as AccessRequest[],
      );

      const {
        data: profileData,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            business_id,
            business:businesses (
              id,
              name,
              plan,
              subscription_status,
              demo_access,
              payment_status,
              activation_status
            )
          `,
        )
        .order("id");

      if (profileError) {
        throw profileError;
      }

      const formatted: Prospect[] = [];

      for (const profile of profileData ?? []) {
        const business = Array.isArray(
          profile.business,
        )
          ? profile.business[0]
          : profile.business;

        if (!business) continue;

        formatted.push({
          id: profile.id,
          name:
            profile.id === user.id
              ? "Admin"
              : "Workspace User",
          email:
            profile.id === user.id
              ? user.email ??
                "Email protected"
              : "Email protected",
          business_name:
            business.name ??
            "Revora Workspace",
          plan:
            business.plan ?? null,
          subscription_status:
            business.subscription_status ??
            null,
          demo_access:
            business.demo_access === true,
          payment_status:
            business.payment_status ??
            null,
          activation_status:
            business.activation_status ??
            null,
          business_id:
            business.id ?? null,
        });
      }

      setProspects(formatted);
    } catch (err) {
      console.error(
        "Admin load error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load admin data.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function approveDemo(
    businessId: string,
  ) {
    setUpdatingBusinessId(businessId);
    setError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc(
          "admin_approve_demo",
          {
            target_business_id:
              businessId,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not approve demo.",
      );
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function revokeDemo(
    businessId: string,
  ) {
    setUpdatingBusinessId(businessId);
    setError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc(
          "admin_revoke_demo",
          {
            target_business_id:
              businessId,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not revoke demo.",
      );
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function activatePaid(
    businessId: string,
  ) {
    setUpdatingBusinessId(businessId);
    setError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc(
          "admin_activate_paid",
          {
            target_business_id:
              businessId,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not activate paid access.",
      );
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function deactivatePaid(
    businessId: string,
  ) {
    setUpdatingBusinessId(businessId);
    setError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc(
          "admin_deactivate_paid",
          {
            target_business_id:
              businessId,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not deactivate paid access.",
      );
    } finally {
      setUpdatingBusinessId(null);
    }
  }

  async function updateAccessRequestStatus(
    requestId: string,
    newStatus:
      | "new"
      | "contacted"
      | "converted"
      | "closed",
  ) {
    setUpdatingRequestId(requestId);
    setError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc(
          "admin_update_access_request_status",
          {
            target_request_id:
              requestId,
            new_status:
              newStatus,
          },
        );

      if (rpcError) {
        throw rpcError;
      }

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update request.",
      );
    } finally {
      setUpdatingRequestId(null);
    }
  }

  const pipeline = useMemo(
    () => ({
      new: requests.filter(
        (r) => r.status === "new",
      ).length,

      contacted: requests.filter(
        (r) =>
          r.status === "contacted",
      ).length,

      converted: requests.filter(
        (r) =>
          r.status === "converted",
      ).length,

      paid: requests.filter(
        (r) =>
          r.plan === "paid" &&
          r.subscription_status ===
            "active",
      ).length,
    }),
    [requests],
  );

  const filteredRequests = useMemo(() => {
    if (filter === "all") {
      return requests;
    }

    if (filter === "paid") {
      return requests.filter(
        (request) =>
          request.plan === "paid" &&
          request.subscription_status ===
            "active",
      );
    }

    return requests.filter(
      (request) =>
        request.status === filter,
    );
  }, [filter, requests]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070a0f] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-8">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-indigo-400" />

              <p className="text-sm text-gray-500">
                Loading Revora Control...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070a0f] px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <header className="mb-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-indigo-400">
                REVORA CONTROL
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                Sales Control Center
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-500">
                Manage prospects, demo access, workspace
                activation, and the customer sales pipeline.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.03] px-5 py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                CONTROL STATUS
              </p>

              <div className="mt-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />

                <span className="text-xs font-medium text-gray-300">
                  Operational
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ERROR */}
        {error && (
          <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-5 py-4">
            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                void loadData()
              }
              className="shrink-0 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Retry
            </button>
          </div>
        )}

        {/* PIPELINE */}
        <section className="mb-10">
          <div className="mb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
              SALES PIPELINE
            </p>

            <h2 className="mt-2 text-xl font-semibold">
              Prospect Funnel
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "New",
                value: pipeline.new,
                detail: "New requests",
                status: "new" as PipelineFilter,
              },
              {
                label: "Contacted",
                value: pipeline.contacted,
                detail: "In conversation",
                status:
                  "contacted" as PipelineFilter,
              },
              {
                label: "Converted",
                value: pipeline.converted,
                detail: "Ready for activation",
                status:
                  "converted" as PipelineFilter,
              },
              {
                label: "Paid",
                value: pipeline.paid,
                detail: "Active customers",
                status:
                  "paid" as PipelineFilter,
              },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() =>
                  setFilter(item.status)
                }
                className={`rounded-3xl border p-5 text-left transition ${
                  filter === item.status
                    ? "border-indigo-500/30 bg-indigo-500/[0.06]"
                    : "border-white/10 bg-white/[0.025] hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                    {item.label}
                  </p>

                  <span
                    className={`rounded-full border px-2 py-1 text-[9px] font-semibold uppercase ${statusClasses(
                      item.label.toLowerCase(),
                    )}`}
                  >
                    {item.label}
                  </span>
                </div>

                <p className="mt-5 text-3xl font-semibold tracking-[-0.04em]">
                  {item.value}
                </p>

                <p className="mt-1 text-xs text-gray-600">
                  {item.detail}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* REQUEST FILTER */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">
            FILTER
          </span>

          {(
            [
              ["all", "All"],
              ["new", "New"],
              ["contacted", "Contacted"],
              ["converted", "Converted"],
              ["paid", "Paid"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setFilter(value)
              }
              className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                filter === value
                  ? "bg-white text-black"
                  : "border border-white/10 bg-white/[0.02] text-gray-500 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ACCESS REQUESTS */}
        <section className="mb-12">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                SALES INBOX
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Access Requests
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Incoming requests from prospects who want full Revora access.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {filteredRequests.length} SHOWING
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-10">
              <p className="text-sm text-gray-600">
                No requests in this pipeline stage.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(
                (request) => {
                  const isPaid =
                    request.plan ===
                      "paid" &&
                    request.subscription_status ===
                      "active";

                  const workspaceStatus =
                    getWorkspaceStatus(
                      request,
                    );

                  return (
                    <div
                      key={request.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
                    >
                      <div className="flex flex-col gap-6">
                        {/* REQUEST HEADER */}
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${statusClasses(
                                  request.status,
                                )}`}
                              >
                                {formatStatus(
                                  request.status,
                                )}
                              </span>

                              {request.demo_access && (
                                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-indigo-400">
                                  Demo Active
                                </span>
                              )}

                              {isPaid && (
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400">
                                  Paid Active
                                </span>
                              )}
                            </div>

                            <h3 className="mt-4 text-xl font-semibold">
                              {request.name}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {request.business_name}
                            </p>

                            <p className="mt-1 text-sm text-gray-600">
                              {request.email}
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/10 px-5 py-4 lg:min-w-[220px] lg:text-right">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                              REQUESTED
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {new Date(
                                request.created_at,
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* REQUEST DATA */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                              Workspace
                            </p>

                            <p className="mt-2 text-sm font-semibold">
                              {request.business_name}
                            </p>

                            <span
                              className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-semibold ${statusClasses(
                                request.demo_access
                                  ? "demo"
                                  : isPaid
                                    ? "paid"
                                    : "pending",
                              )}`}
                            >
                              {workspaceStatus}
                            </span>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                              Payment
                            </p>

                            <p className="mt-2 text-sm font-semibold">
                              {isPaid
                                ? "Paid"
                                : request.payment_status ===
                                    "paid"
                                  ? "Paid"
                                  : "Pending"}
                            </p>

                            <p className="mt-1 text-xs text-gray-600">
                              Private admin-controlled activation
                            </p>
                          </div>

                          <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-600">
                              Request Note
                            </p>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                              {request.note ||
                                "No note provided."}
                            </p>
                          </div>
                        </div>

                        {/* REQUEST ACTIONS */}
                        <div className="flex flex-wrap gap-3 border-t border-white/5 pt-5">
                          {request.status ===
                            "new" && (
                            <button
                              type="button"
                              disabled={
                                updatingRequestId ===
                                request.id
                              }
                              onClick={() =>
                                updateAccessRequestStatus(
                                  request.id,
                                  "contacted",
                                )
                              }
                              className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/15 disabled:opacity-50"
                            >
                              {updatingRequestId ===
                              request.id
                                ? "Updating..."
                                : "Mark Contacted"}
                            </button>
                          )}

                          {request.status ===
                            "contacted" && (
                            <button
                              type="button"
                              disabled={
                                updatingRequestId ===
                                request.id
                              }
                              onClick={() =>
                                updateAccessRequestStatus(
                                  request.id,
                                  "converted",
                                )
                              }
                              className="rounded-xl border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-xs font-semibold text-purple-300 transition hover:bg-purple-500/15 disabled:opacity-50"
                            >
                              {updatingRequestId ===
                              request.id
                                ? "Updating..."
                                : "Mark Converted"}
                            </button>
                          )}

                          {request.status !==
                            "closed" &&
                            !isPaid && (
                              <button
                                type="button"
                                disabled={
                                  updatingRequestId ===
                                  request.id
                                }
                                onClick={() =>
                                  updateAccessRequestStatus(
                                    request.id,
                                    "closed",
                                  )
                                }
                                className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-gray-500 transition hover:bg-white/[0.05] hover:text-gray-300 disabled:opacity-50"
                              >
                                Close
                              </button>
                            )}

                          {isPaid && (
                            <span className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400">
                              Customer Active
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        {/* WORKSPACE CONTROL */}
        <section>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-600">
                WORKSPACE CONTROL
              </p>

              <h2 className="mt-2 text-xl font-semibold">
                Account Activation
              </h2>

              <p className="mt-1 text-sm text-gray-600">
                Control demo and paid access after your sales decision.
              </p>
            </div>

            <div className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              {prospects.length} WORKSPACE
              {prospects.length === 1
                ? ""
                : "S"}
            </div>
          </div>

          {prospects.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8">
              <p className="text-sm text-gray-600">
                No workspaces found.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {prospects.map(
                (prospect) => {
                  const isPaid =
                    prospect.plan ===
                      "paid" &&
                    prospect.subscription_status ===
                      "active";

                  const isDemo =
                    prospect.demo_access ===
                    true;

                  return (
                    <div
                      key={prospect.id}
                      className="rounded-3xl border border-white/10 bg-white/[0.025] p-6"
                    >
                      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                        {/* IDENTITY */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-gray-500">
                              WORKSPACE
                            </span>

                            <span
                              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider ${statusClasses(
                                isPaid
                                  ? "paid"
                                  : isDemo
                                    ? "demo"
                                    : "pending",
                              )}`}
                            >
                              {isPaid
                                ? "Paid"
                                : isDemo
                                  ? "Demo"
                                  : "Pending"}
                            </span>
                          </div>

                          <h3 className="mt-4 text-lg font-semibold">
                            {prospect.business_name}
                          </h3>

                          <p className="mt-1 text-sm text-gray-500">
                            {prospect.name}
                          </p>

                          <p className="mt-1 text-sm text-gray-600">
                            {prospect.email}
                          </p>

                          {prospect.business_id && (
                            <p className="mt-3 break-all font-mono text-[10px] text-gray-700">
                              {prospect.business_id}
                            </p>
                          )}
                        </div>

                        {/* STATE */}
                        <div className="w-full xl:max-w-xl">
                          <div className="rounded-2xl border border-white/10 bg-black/10 p-5">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600">
                                ACCOUNT STATE
                              </p>

                              <span
                                className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase ${statusClasses(
                                  isPaid
                                    ? "active"
                                    : isDemo
                                      ? "demo"
                                      : "pending",
                                )}`}
                              >
                                {isPaid
                                  ? "Active"
                                  : isDemo
                                    ? "Demo"
                                    : "Pending"}
                              </span>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
                              <StateValue
                                label="Plan"
                                value={
                                  prospect.plan ??
                                  "—"
                                }
                              />

                              <StateValue
                                label="Subscription"
                                value={
                                  prospect.subscription_status ??
                                  "—"
                                }
                              />

                              <StateValue
                                label="Activation"
                                value={
                                  prospect.activation_status ??
                                  "—"
                                }
                              />

                              <StateValue
                                label="Payment"
                                value={
                                  prospect.payment_status ===
                                  "paid"
                                    ? "Paid"
                                    : "Pending"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ACTIVATION ACTIONS */}
                      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
                        {!isPaid &&
                          !isDemo &&
                          prospect.business_id && (
                            <button
                              type="button"
                              disabled={
                                updatingBusinessId ===
                                prospect.business_id
                              }
                              onClick={() =>
                                approveDemo(
                                  prospect.business_id!,
                                )
                              }
                              className="rounded-xl bg-white px-5 py-2.5 text-xs font-semibold text-black transition hover:bg-gray-200 disabled:opacity-50"
                            >
                              {updatingBusinessId ===
                              prospect.business_id
                                ? "Updating..."
                                : "Approve Demo"}
                            </button>
                          )}

                        {isDemo &&
                          !isPaid &&
                          prospect.business_id && (
                            <button
                              type="button"
                              disabled={
                                updatingBusinessId ===
                                prospect.business_id
                              }
                              onClick={() =>
                                revokeDemo(
                                  prospect.business_id!,
                                )
                              }
                              className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs font-semibold text-gray-400 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50"
                            >
                              {updatingBusinessId ===
                              prospect.business_id
                                ? "Updating..."
                                : "Revoke Demo"}
                            </button>
                          )}

                        {!isPaid &&
                          prospect.business_id && (
                            <button
                              type="button"
                              disabled={
                                updatingBusinessId ===
                                prospect.business_id
                              }
                              onClick={() =>
                                activatePaid(
                                  prospect.business_id!,
                                )
                              }
                              className="rounded-xl bg-indigo-500 px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-400 disabled:opacity-50"
                            >
                              {updatingBusinessId ===
                              prospect.business_id
                                ? "Activating..."
                                : "Activate Paid"}
                            </button>
                          )}

                        {isPaid &&
                          prospect.business_id && (
                            <button
                              type="button"
                              disabled={
                                updatingBusinessId ===
                                prospect.business_id
                              }
                              onClick={() =>
                                deactivatePaid(
                                  prospect.business_id!,
                                )
                              }
                              className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                            >
                              {updatingBusinessId ===
                              prospect.business_id
                                ? "Updating..."
                                : "Deactivate Paid"}
                            </button>
                          )}

                        {isPaid && (
                          <span className="ml-auto rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400">
                            Paid • Active
                          </span>
                        )}
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          )}
        </section>

        <footer className="py-10 text-center text-xs text-gray-700">
          REVORA CONTROL · PRIVATE ADMIN SYSTEM
        </footer>
      </div>
    </main>
  );
}

function StateValue({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-wider text-gray-700">
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-gray-400">
        {value}
      </p>
    </div>
  );
}