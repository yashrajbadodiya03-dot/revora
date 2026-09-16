"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Users,
  Sparkles,
  Mail,
  TrendingUp,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import { loadWorkspaceData } from "@/lib/workspace";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Opportunities", href: "/opportunities", icon: Target },
  { label: "Customers", href: "/customers", icon: Users },
  { label: "AI Recovery", href: "/ai-recovery", icon: Sparkles },
  { label: "Follow-Ups", href: "/follow-ups", icon: Mail },
  { label: "ROI", href: "/roi", icon: TrendingUp },
  { label: "Settings", href: "/settings", icon: Settings },
];

function getInitials(name: string) {
  const value = name.trim();

  if (!value) return "RV";

  const parts = value.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export default function Sidebar() {
  const pathname = usePathname();

  const activeMobileItemRef =
    useRef<HTMLAnchorElement | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [plan, setPlan] = useState<
    "demo" | "paid" | null
  >(null);

  const [subscriptionStatus, setSubscriptionStatus] =
    useState<"active" | "inactive" | null>(null);

  const [loadingWorkspace, setLoadingWorkspace] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      try {
        const workspace =
          await loadWorkspaceData(true);

        if (!mounted) return;

        setBusinessName(
          workspace.businessName || "",
        );

        setPlan(workspace.plan);
        setSubscriptionStatus(
          workspace.subscriptionStatus,
        );
      } catch (error) {
        console.error(
          "Failed to load workspace:",
          error,
        );

        if (mounted) {
          setBusinessName("");
          setPlan(null);
          setSubscriptionStatus(null);
        }
      } finally {
        if (mounted) {
          setLoadingWorkspace(false);
        }
      }
    }

    void loadWorkspace();

    function handleWorkspaceUpdated() {
      void loadWorkspace();
    }

    window.addEventListener(
      "workspaceUpdated",
      handleWorkspaceUpdated,
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "workspaceUpdated",
        handleWorkspaceUpdated,
      );
    };
  }, []);

  useEffect(() => {
    const frame =
      window.requestAnimationFrame(() => {
        activeMobileItemRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const isPaid =
    plan === "paid" &&
    subscriptionStatus === "active";

  const workspaceReady =
    !loadingWorkspace &&
    plan !== null &&
    subscriptionStatus !== null;

  const displayName = loadingWorkspace
    ? "Loading..."
    : businessName || "Workspace";

  const initials = getInitials(
    businessName || "RV",
  );

  const planLabel = !workspaceReady
    ? "LOADING"
    : isPaid
      ? "PAID PLAN"
      : "DEMO WORKSPACE";

  const dotClass = !workspaceReady
    ? "bg-gray-500"
    : isPaid
      ? "bg-emerald-400"
      : "bg-indigo-400";

  const badgeClass = !workspaceReady
    ? "border-white/10 bg-white/5 text-gray-500"
    : isPaid
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
      : "border-indigo-500/20 bg-indigo-500/10 text-indigo-400";

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-[250px] lg:block">
        <div className="flex h-full flex-col border-r border-white/[0.06] bg-[#090c11] px-5 py-6">

          {/* Logo */}
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-black text-black">
              R
            </div>

            <div>
              <div className="text-[15px] font-black tracking-[0.22em] text-white">
                REVORA
              </div>

              <div className="text-[10px] uppercase tracking-[0.16em] text-gray-600">
                Revenue Recovery
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm transition ${
                    isActive
                      ? "bg-white/[0.05] font-semibold text-white"
                      : "text-gray-500 hover:bg-white/[0.03] hover:text-gray-200"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 ${
                      isActive
                        ? "text-indigo-400"
                        : "text-gray-600"
                    }`}
                  />

                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Demo upgrade CTA */}
          {workspaceReady && !isPaid && (
            <div className="mt-auto mb-5">
              <div className="rounded-2xl border border-indigo-500/15 bg-indigo-500/[0.04] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-indigo-400">
                      DEMO WORKSPACE
                    </p>

                    <p className="mt-2 text-xs font-semibold text-gray-200">
                      See Revora in action.
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-gray-500">
                      Ready to recover more revenue?
                    </p>
                  </div>

                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" />
                  </div>
                </div>

                <Link
                  href="/upgrade"
                  className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-3 py-2.5 text-[11px] font-semibold text-white transition hover:bg-indigo-400"
                >
                  Explore Full Access
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* Workspace */}
          <div>
            <div className="border-t border-white/[0.06] pt-5">
              <div className="flex items-center gap-3 px-2">

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/10 bg-indigo-400/10 text-xs font-bold text-indigo-300">
                  {initials}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-200">
                    {displayName}
                  </p>

                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
                    />

                    <span
                      className={`truncate text-[9px] font-semibold tracking-[0.08em] ${
                        !workspaceReady
                          ? "text-gray-500"
                          : isPaid
                            ? "text-emerald-400"
                            : "text-indigo-400"
                      }`}
                    >
                      {planLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header + Navigation */}
      <div className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#090c11]/94 backdrop-blur-2xl lg:hidden">

        <div className="flex h-[52px] items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center"
          >
            <span className="text-[15px] font-black tracking-[0.24em] text-white">
              REVORA
            </span>
          </Link>

          <div className="flex max-w-[52%] items-center gap-2">

            <div
              className={`h-1.5 w-1.5 rounded-full ${dotClass}`}
            />

            <span className="truncate text-[11px] font-medium text-gray-400">
              {displayName}
            </span>

            <span
              className={`hidden rounded-md border px-1.5 py-0.5 text-[8px] font-bold tracking-wider sm:inline-flex ${badgeClass}`}
            >
              {!workspaceReady
                ? "..."
                : isPaid
                  ? "PAID"
                  : "DEMO"}
            </span>
          </div>
        </div>

        <nav className="overflow-x-auto border-t border-white/[0.04] px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-max items-center gap-1.5">

            {navItems.map((item) => {
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  ref={
                    isActive
                      ? activeMobileItemRef
                      : null
                  }
                  href={item.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-white/[0.07] text-white"
                      : "text-gray-500 hover:text-gray-200"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive
                        ? "text-indigo-400"
                        : "text-gray-600"
                    }`}
                  />

                  {item.label}
                </Link>
              );
            })}

          </div>
        </nav>

        {/* Mobile demo CTA */}
        {workspaceReady && !isPaid && (
          <div className="border-t border-indigo-500/10 bg-indigo-500/[0.025] px-4 py-2.5">
            <Link
              href="/upgrade"
              className="flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-semibold tracking-[0.12em] text-indigo-400">
                  DEMO WORKSPACE
                </p>

                <p className="mt-0.5 text-[11px] text-gray-500">
                  Ready to recover more revenue?
                </p>
              </div>

              <span className="flex items-center gap-1 text-[10px] font-semibold text-indigo-400">
                Explore
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        )}
      </div>
    </>
  );
}