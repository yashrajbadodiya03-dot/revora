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

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("");
  const [settings, setSettings] =
    useState<WorkspaceSettings | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

        setBusinessName(workspace.businessName || "");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

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

        if (profileError) {
          throw profileError;
        }

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

        if (businessError) {
          throw businessError;
        }

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

  async function handleSave() {
    setMessage("");
    setError("");

    if (!settings) {
      setError("Settings are still loading.");
      return;
    }

    const trimmedName = businessName.trim();

    if (!trimmedName) {
      setError("Workspace name cannot be empty.");
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

      if (userError) {
        throw userError;
      }

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
        .eq("id", profile.business_id);

      if (settingsError) {
        throw settingsError;
      }

      setMessage("Settings saved successfully.");

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
                Manage your Revora workspace and notification preferences.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/5 px-5 py-4 text-sm font-medium text-rose-300">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 text-sm font-medium text-emerald-400">
                <span>✓ {message}</span>

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
                    setBusinessName(event.target.value)
                  }
                  disabled={loading || saving}
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
                  Choose which Revora alerts your workspace receives.
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
                    enabled={settings.emailNotifications}
                    disabled={saving}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current!,
                        emailNotifications: value,
                      }))
                    }
                  />

                  <ToggleRow
                    title="Recovery Alerts"
                    description="Get notified when Revora identifies recovery opportunities that need attention."
                    enabled={settings.recoveryAlerts}
                    disabled={saving}
                    onChange={(value) =>
                      setSettings((current) => ({
                        ...current!,
                        recoveryAlerts: value,
                      }))
                    }
                  />
                </div>
              )}
            </section>

            <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">
                    Workspace changes
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Save the workspace name and notification preferences together.
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
            enabled ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}