"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase";

type Business = {
  id: string;
  name: string;
  email_notifications: boolean;
  recovery_alerts: boolean;
};

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [business, setBusiness] = useState<Business | null>(null);
  const [userEmail, setUserEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [recoveryAlerts, setRecoveryAlerts] = useState(true);

  useEffect(() => {
    async function loadSettings() {
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

        setUserEmail(user.email ?? "");

        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("business_id")
          .eq("id", user.id)
          .single();

        if (profileError) {
          throw new Error(`Profile error: ${profileError.message}`);
        }

        if (!profile?.business_id) {
          throw new Error(
            "Your account is not connected to a business workspace yet."
          );
        }

        const { data: businessData, error: businessError } = await supabase
          .from("businesses")
          .select(
            "id, name, email_notifications, recovery_alerts"
          )
          .eq("id", profile.business_id)
          .single();

        if (businessError) {
          throw new Error(`Business error: ${businessError.message}`);
        }

        const loadedBusiness: Business = {
          id: businessData.id,
          name: businessData.name,
          email_notifications:
            businessData.email_notifications ?? true,
          recovery_alerts:
            businessData.recovery_alerts ?? true,
        };

        setBusiness(loadedBusiness);
        setBusinessName(loadedBusiness.name);
        setEmailNotifications(loadedBusiness.email_notifications);
        setRecoveryAlerts(loadedBusiness.recovery_alerts);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading Settings."
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [supabase]);

  const getInitials = (name: string) => {
    const trimmed = name.trim();

    if (!trimmed) {
      return "RV";
    }

    const parts = trimmed.split(/\s+/);

    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const saveSettings = async () => {
    if (!business) return;

    if (!businessName.trim()) {
      setError("Business name cannot be empty.");
      setMessage("");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { data: updatedBusiness, error: updateError } =
        await supabase
          .from("businesses")
          .update({
            name: businessName.trim(),
            email_notifications: emailNotifications,
            recovery_alerts: recoveryAlerts,
          })
          .eq("id", business.id)
          .select(
            "id, name, email_notifications, recovery_alerts"
          )
          .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedBusiness) {
        throw new Error(
          "Settings were not updated. Please check your database permissions."
        );
      }

      const savedBusiness: Business = {
        id: updatedBusiness.id,
        name: updatedBusiness.name,
        email_notifications:
          updatedBusiness.email_notifications ?? true,
        recovery_alerts:
          updatedBusiness.recovery_alerts ?? true,
      };

      setBusiness(savedBusiness);
      setBusinessName(savedBusiness.name);
      setEmailNotifications(savedBusiness.email_notifications);
      setRecoveryAlerts(savedBusiness.recovery_alerts);

      setMessage("Settings saved successfully.");
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR */}
        <aside className="hidden w-[250px] shrink-0 border-r border-white/10 bg-[#0a0d12] p-6 lg:block">

          {/* LOGO */}
          <div className="mb-10">
            <div className="flex items-center gap-3">

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white font-black text-black">
                R
              </div>

              <div>
                <h1 className="text-xl font-bold tracking-tight">
                  REVORA
                </h1>

                <p className="text-xs text-gray-500">
                  Revenue Recovery
                </p>
              </div>

            </div>
          </div>

          {/* NAVIGATION */}
          <nav className="space-y-1.5">

            <Link
              href="/"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              href="/opportunities"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Opportunities
            </Link>

            <Link
              href="/ai-recovery"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              AI Recovery
            </Link>

            <Link
              href="/follow-ups"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              Follow-Ups
            </Link>

            <Link
              href="/roi"
              className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
            >
              ROI
            </Link>

            <Link
              href="/settings"
              className="block w-full rounded-xl bg-white px-4 py-3 text-left text-sm font-medium text-black"
            >
              Settings
            </Link>

          </nav>

          {/* WORKSPACE */}
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-4">

            <p className="text-[10px] font-semibold tracking-[0.18em] text-gray-500">
              WORKSPACE
            </p>

            <div className="mt-4 flex items-center gap-3">

              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-sm font-bold text-indigo-400">
                {business ? getInitials(business.name) : "RV"}
              </div>

              <div className="min-w-0">

                <p className="truncate text-sm font-semibold">
                  {business?.name || "Loading..."}
                </p>

                <p className="truncate text-xs text-gray-500">
                  Business workspace
                </p>

              </div>

            </div>
          </div>

          {/* SYSTEM */}
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">

            <div className="flex items-center justify-between">

              <span className="text-xs text-gray-500">
                System
              </span>

              <span className="flex items-center gap-1.5 text-xs text-emerald-500">

                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                Operational

              </span>

            </div>

          </div>

        </aside>

        {/* MAIN */}
        <section className="min-w-0 flex-1">

          {/* HEADER */}
          <header className="flex h-[72px] items-center justify-between border-b border-white/10 bg-[#07090d] px-5 sm:px-6 lg:px-10">

            <p className="text-sm font-medium text-gray-500">
              Settings
            </p>

            <div
              title={userEmail}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white"
            >
              {business ? getInitials(business.name) : "RV"}
            </div>

          </header>

          {/* CONTENT */}
          <div className="mx-auto max-w-[1000px] px-5 py-8 sm:px-6 lg:px-10 lg:py-10">

            {/* LOADING */}
            {loading && (
              <div className="flex min-h-[500px] items-center justify-center">

                <div className="text-center">

                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-600 border-t-indigo-500" />

                  <p className="text-sm text-gray-500">
                    Loading Settings...
                  </p>

                </div>

              </div>
            )}

            {/* ERROR */}
            {!loading && error && !business && (
              <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8">

                <p className="text-xs font-semibold uppercase tracking-wider text-red-500">
                  Settings Error
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Could not load Settings
                </h2>

                <p className="mt-3 text-sm text-gray-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-6 rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400"
                >
                  Try again
                </button>

              </div>
            )}

            {/* SETTINGS */}
            {!loading && business && (
              <>

                {/* HERO */}
                <div className="mb-10">

                  <div className="mb-4 flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-indigo-500" />

                    <p className="text-xs font-semibold tracking-[0.18em] text-indigo-500">
                      WORKSPACE SETTINGS
                    </p>

                  </div>

                  <h2 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-5xl">

                    Configure your
                    <br />

                    Revora workspace.

                  </h2>

                  <p className="mt-5 max-w-2xl text-sm leading-6 text-gray-500">
                    Manage your business workspace and recovery preferences.
                  </p>

                </div>

                {/* BUSINESS SETTINGS */}
                <div className="rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">

                  <div className="border-b border-white/10 pb-6">

                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                      BUSINESS
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Business workspace
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Update the name displayed across Revora.
                    </p>

                  </div>

                  {/* BUSINESS NAME */}
                  <div className="mt-6">

                    <label className="text-sm font-medium text-gray-300">
                      Business name
                    </label>

                    <input
                      type="text"
                      value={businessName}
                      onChange={(event) => {
                        setBusinessName(event.target.value);
                        setMessage("");
                        setError("");
                      }}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-indigo-500"
                      placeholder="Your business name"
                    />

                  </div>

                  {/* EMAIL */}
                  <div className="mt-5">

                    <label className="text-sm font-medium text-gray-300">
                      Account email
                    </label>

                    <input
                      type="email"
                      value={userEmail}
                      disabled
                      className="mt-2 w-full cursor-not-allowed rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-gray-500"
                    />

                  </div>

                </div>

                {/* RECOVERY SETTINGS */}
                <div className="mt-6 rounded-3xl border border-white/10 bg-[#0c1016] p-6 sm:p-8">

                  <div className="border-b border-white/10 pb-6">

                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
                      RECOVERY
                    </p>

                    <h3 className="mt-2 text-xl font-semibold">
                      Recovery preferences
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      Control the notifications used by your recovery workflow.
                    </p>

                  </div>

                  <div className="mt-6 space-y-5">

                    <ToggleRow
                      title="Email notifications"
                      description="Receive important Revora account and workspace notifications."
                      enabled={emailNotifications}
                      onChange={() => {
                        setEmailNotifications((current) => !current);
                        setMessage("");
                        setError("");
                      }}
                    />

                    <ToggleRow
                      title="Recovery alerts"
                      description="Get alerts when high-priority revenue opportunities need attention."
                      enabled={recoveryAlerts}
                      onChange={() => {
                        setRecoveryAlerts((current) => !current);
                        setMessage("");
                        setError("");
                      }}
                    />

                  </div>

                </div>

                {/* SAVE */}
                <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="min-h-[24px]">

                    {message && (
                      <p className="text-sm font-medium text-emerald-500">
                        {message}
                      </p>
                    )}

                    {error && business && (
                      <p className="text-sm font-medium text-red-500">
                        {error}
                      </p>
                    )}

                  </div>

                  <button
                    type="button"
                    onClick={saveSettings}
                    disabled={saving}
                    className="rounded-xl bg-indigo-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>

                </div>

                {/* FOOTER */}
                <footer className="py-8 text-center text-xs text-gray-500">
                  REVORA · Workspace Settings
                </footer>

              </>
            )}

          </div>

        </section>

      </div>
    </main>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5">

      <div>

        <p className="text-sm font-semibold">
          {title}
        </p>

        <p className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
          {description}
        </p>

      </div>

      <button
        type="button"
        onClick={onChange}
        aria-label={`Toggle ${title}`}
        aria-pressed={enabled}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-indigo-500" : "bg-white/10"
        }`}
      >

        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />

      </button>

    </div>
  );
}