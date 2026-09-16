"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";

type Settings = {
  name: string;
  industry: string;
  service_area: string;
  phone: string;
  recovery_delay_minutes: number;
  missed_calls_enabled: boolean;
  estimates_enabled: boolean;
  inquiries_enabled: boolean;
  no_follow_up_enabled: boolean;
};

const defaultSettings: Settings = {
  name: "",
  industry: "HVAC",
  service_area: "",
  phone: "",
  recovery_delay_minutes: 5,
  missed_calls_enabled: true,
  estimates_enabled: true,
  inquiries_enabled: true,
  no_follow_up_enabled: true,
};

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<Settings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

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

      if (profileError) throw profileError;

      if (!profile?.business_id) {
        throw new Error(
          "No business workspace found.",
        );
      }

      const { data: business, error: businessError } =
        await supabase
          .from("businesses")
          .select(
            `
              name,
              industry,
              service_area,
              phone,
              recovery_action_delay_minutes,
              missed_calls_enabled,
              estimates_enabled,
              inquiries_enabled,
              no_follow_up_enabled
            `,
          )
          .eq("id", profile.business_id)
          .single();

      if (businessError) throw businessError;

      setSettings({
        name: business.name ?? "",
        industry: business.industry ?? "HVAC",
        service_area: business.service_area ?? "",
        phone: business.phone ?? "",
        recovery_delay_minutes:
          business.recovery_action_delay_minutes ?? 5,
        missed_calls_enabled:
          business.missed_calls_enabled ?? true,
        estimates_enabled:
          business.estimates_enabled ?? true,
        inquiries_enabled:
          business.inquiries_enabled ?? true,
        no_follow_up_enabled:
          business.no_follow_up_enabled ?? true,
      });
    } catch (err) {
      console.error("Settings load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load workspace settings.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
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

      if (!settings.name.trim()) {
        throw new Error(
          "Business name is required.",
        );
      }

      const delay = Math.min(
        Math.max(
          Number(settings.recovery_delay_minutes) || 5,
          1,
        ),
        1440,
      );

      const { data, error: rpcError } =
        await supabase.rpc(
          "update_workspace_settings",
          {
            target_name: settings.name.trim(),
            target_industry: settings.industry,
            target_service_area:
              settings.service_area.trim(),
            target_phone:
              settings.phone.trim(),
            target_missed_calls_enabled:
              settings.missed_calls_enabled,
            target_estimates_enabled:
              settings.estimates_enabled,
            target_inquiries_enabled:
              settings.inquiries_enabled,
            target_no_follow_up_enabled:
              settings.no_follow_up_enabled,
            target_delay_minutes: delay,
          },
        );

      if (rpcError) throw rpcError;

      if (data !== true) {
        throw new Error(
          "Workspace settings were not updated.",
        );
      }

      setSettings((current) => ({
        ...current,
        recovery_delay_minutes: delay,
      }));

      window.dispatchEvent(
        new Event("workspaceUpdated"),
      );

      setMessage(
        "Workspace configuration saved successfully.",
      );
    } catch (err) {
      console.error("Settings save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not save workspace settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  const enabledWorkflows = [
    settings.missed_calls_enabled,
    settings.estimates_enabled,
    settings.inquiries_enabled,
    settings.no_follow_up_enabled,
  ].filter(Boolean).length;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07090d] text-white">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />

              <p className="mt-4 text-sm text-gray-500">
                Loading workspace configuration...
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12">

            {/* HEADER */}
            <div className="mb-8">
              <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                REVORA · WORKSPACE CONTROL
              </p>

              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                Workspace Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                Configure how Revora identifies and
                recovers revenue opportunities for your
                business.
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div className="mb-6 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                <p className="text-sm text-red-400">
                  {error}
                </p>
              </div>
            )}

            {/* SUCCESS */}
            {message && (
              <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <p className="text-sm text-emerald-400">
                  {message}
                </p>
              </div>
            )}

            {/* BUSINESS PROFILE */}
            <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                  BUSINESS PROFILE
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Business information
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  This information is used throughout
                  your Revora workspace.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">

                <Field
                  label="Business name"
                  value={settings.name}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      name: value,
                    }))
                  }
                  placeholder="Your business name"
                />

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Industry
                  </label>

                  <select
                    value={settings.industry}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        industry:
                          event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-indigo-500/50"
                  >
                    <option value="HVAC">
                      HVAC
                    </option>

                    <option value="Plumbing">
                      Plumbing
                    </option>

                    <option value="Electrical">
                      Electrical
                    </option>

                    <option value="Home Services">
                      Home Services
                    </option>
                  </select>
                </div>

                <Field
                  label="Primary service area"
                  value={settings.service_area}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      service_area: value,
                    }))
                  }
                  placeholder="e.g. Dallas, TX"
                />

                <Field
                  label="Business phone"
                  value={settings.phone}
                  onChange={(value) =>
                    setSettings((current) => ({
                      ...current,
                      phone: value,
                    }))
                  }
                  placeholder="e.g. +1 555 123 4567"
                />

              </div>
            </section>

            {/* RECOVERY ENGINE */}
            <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                <div>
                  <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                    RECOVERY ENGINE
                  </p>

                  <h2 className="mt-2 text-xl font-semibold">
                    Recovery workflows
                  </h2>

                  <p className="mt-2 text-sm text-gray-500">
                    Choose which revenue signals Revora
                    should monitor.
                  </p>
                </div>

                <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-5 py-4">
                  <p className="text-[10px] font-semibold tracking-wider text-gray-500">
                    WORKFLOWS ENABLED
                  </p>

                  <p className="mt-1 text-2xl font-semibold text-indigo-400">
                    {enabledWorkflows} / 4
                  </p>
                </div>

              </div>

              <div className="space-y-3">

                <WorkflowToggle
                  label="Missed Calls"
                  description="Recover revenue from missed inbound calls."
                  enabled={
                    settings.missed_calls_enabled
                  }
                  onChange={(enabled) =>
                    setSettings((current) => ({
                      ...current,
                      missed_calls_enabled:
                        enabled,
                    }))
                  }
                />

                <WorkflowToggle
                  label="Estimates"
                  description="Follow up with customers who received estimates."
                  enabled={
                    settings.estimates_enabled
                  }
                  onChange={(enabled) =>
                    setSettings((current) => ({
                      ...current,
                      estimates_enabled:
                        enabled,
                    }))
                  }
                />

                <WorkflowToggle
                  label="Inquiries"
                  description="Recover website and inbound service inquiries."
                  enabled={
                    settings.inquiries_enabled
                  }
                  onChange={(enabled) =>
                    setSettings((current) => ({
                      ...current,
                      inquiries_enabled:
                        enabled,
                    }))
                  }
                />

                <WorkflowToggle
                  label="No Follow-Up"
                  description="Identify opportunities that have stalled without follow-up."
                  enabled={
                    settings.no_follow_up_enabled
                  }
                  onChange={(enabled) =>
                    setSettings((current) => ({
                      ...current,
                      no_follow_up_enabled:
                        enabled,
                    }))
                  }
                />

              </div>
            </section>

            {/* TIMING */}
            <section className="mb-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">

              <div className="mb-6">
                <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                  RECOVERY TIMING
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Action scheduling
                </h2>

                <p className="mt-2 text-sm text-gray-500">
                  Revora schedules recovery actions after
                  this delay.
                </p>
              </div>

              <div className="max-w-sm">

                <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Recovery action delay
                </label>

                <div className="mt-2 flex items-center gap-3">

                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={
                      settings.recovery_delay_minutes
                    }
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        recovery_delay_minutes:
                          Number(
                            event.target.value,
                          ),
                      }))
                    }
                    className="w-32 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500/50"
                  />

                  <span className="text-sm text-gray-500">
                    minutes
                  </span>

                </div>

                <p className="mt-3 text-xs text-gray-600">
                  Allowed range: 1–1440 minutes.
                </p>

              </div>
            </section>

            {/* SUMMARY */}
            <section className="mb-6 rounded-3xl border border-indigo-500/10 bg-indigo-500/[0.025] p-6 sm:p-8">

              <p className="text-xs font-semibold tracking-[0.16em] text-gray-500">
                CONFIGURATION SUMMARY
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">

                <SummaryItem
                  label="Business"
                  value={
                    settings.name ||
                    "Not configured"
                  }
                />

                <SummaryItem
                  label="Industry"
                  value={settings.industry}
                />

                <SummaryItem
                  label="Recovery delay"
                  value={`${settings.recovery_delay_minutes} minutes`}
                />

              </div>
            </section>

            {/* SAVE */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <p className="text-xs text-gray-600">
                Changes affect this workspace only.
              </p>

              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving}
                className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save Workspace Configuration"}
              </button>

            </div>

            <footer className="py-8 text-center text-xs text-gray-600">
              REVORA · Workspace Configuration Engine
            </footer>

          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </label>

      <input
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-gray-700 focus:border-indigo-500/50"
      />
    </div>
  );
}

function WorkflowToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-2xl border border-white/10 bg-black/10 p-5">

      <div>
        <p className="text-sm font-semibold">
          {label}
        </p>

        <p className="mt-1 text-xs leading-5 text-gray-500">
          {description}
        </p>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        aria-pressed={enabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled
            ? "bg-indigo-500"
            : "bg-white/10"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            enabled
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>

    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-4">

      <p className="text-[10px] font-semibold tracking-wider text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold">
        {value}
      </p>

    </div>
  );
}