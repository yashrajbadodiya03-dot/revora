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
  const activeMobileItemRef = useRef<HTMLAnchorElement | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadWorkspace() {
      try {
        setLoadingWorkspace(true);

        const workspace = await loadWorkspaceData();

        if (!mounted) return;

        setBusinessName(workspace.businessName || "");
      } catch (error) {
        console.error("Failed to load workspace:", error);

        if (mounted) {
          setBusinessName("");
        }
      } finally {
        if (mounted) {
          setLoadingWorkspace(false);
        }
      }
    }

    function handleWorkspaceUpdated() {
      void loadWorkspace();
    }

    void loadWorkspace();

    window.addEventListener("workspaceUpdated", handleWorkspaceUpdated);

    return () => {
      mounted = false;
      window.removeEventListener(
        "workspaceUpdated",
        handleWorkspaceUpdated,
      );
    };
  }, [pathname]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
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

  const displayName = loadingWorkspace
    ? "Loading..."
    : businessName || "Workspace";

  const initials = getInitials(businessName || "RV");

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
                      isActive ? "text-indigo-400" : "text-gray-600"
                    }`}
                  />

                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Workspace */}
          <div className="mt-auto">
            <div className="border-t border-white/[0.06] pt-5">
              <div className="flex items-center gap-3 px-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-indigo-400/10 bg-indigo-400/10 text-xs font-bold text-indigo-300">
                  {initials}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-gray-200">
                    {displayName}
                  </p>

                  <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Operational
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
          <Link href="/" className="flex items-center">
            <span className="text-[15px] font-black tracking-[0.24em] text-white">
              REVORA
            </span>
          </Link>

          <div className="flex max-w-[46%] items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            <span className="truncate text-[11px] font-medium text-gray-400">
              {displayName}
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
                  ref={isActive ? activeMobileItemRef : null}
                  href={item.href}
                  className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold transition ${
                    isActive
                      ? "bg-white/[0.07] text-white"
                      : "text-gray-500 hover:text-gray-200"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 ${
                      isActive ? "text-indigo-400" : "text-gray-600"
                    }`}
                  />

                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}