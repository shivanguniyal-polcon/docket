"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Plus, Loader2 } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface NavUser {
  id: string;
  name: string;
  email: string;
  role?: string | null;
  batch?: string | null;
}

const LINKS = [
  { href: "/jobs", code: "01", label: "Mandates" },
  { href: "/tracker", code: "02", label: "My Ledger" },
  { href: "/calendar", code: "03", label: "Cycles" },
  { href: "/orgs", code: "04", label: "Institutions" },
  { href: "/resources", code: "05", label: "Field Manual" },
  { href: "/alumni", code: "06", label: "Directory" },
];

export function AppNav({
  user,
  pendingCount = 0,
}: {
  user: NavUser | null;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const isMod = user?.role === "owner" || user?.role === "moderator";

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await authClient.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b-2 border-stone-900 bg-[#F6F3EC]/95 backdrop-blur">
        {/* Top editorial masthead bar */}
        <div className="border-b border-stone-300 bg-[#EFECE4] px-4 py-1 text-[11px] text-stone-600 sm:px-6">
          <div className="mx-auto flex max-w-6xl items-center justify-between font-mono-tabular">
            <span>
              IIT DELHI · MASTER OF PUBLIC POLICY (MPP) COHORT REPOSITORY
            </span>
            <span className="hidden sm:inline">
              INDIA · MULTILATERALS · REMOTE · ALL EXPERIENCE BANDS (0–10+ YRS)
            </span>
          </div>
        </div>

        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-7">
            <Link
              href="/"
              className="flex items-baseline gap-2"
            >
              <span className="font-serif-editorial text-2xl font-bold tracking-tight text-stone-950">
                Docket.
              </span>
              <span className="font-mono-tabular text-[10px] font-semibold tracking-widest text-amber-900 uppercase">
                Policy Index
              </span>
            </Link>

            <nav className="hidden items-center gap-0.5 lg:flex">
              {LINKS.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-3 py-1.5 text-xs font-semibold tracking-tight transition ${
                      active
                        ? "bg-stone-900 text-[#F6F3EC]"
                        : "text-stone-700 hover:bg-stone-200/70 hover:text-stone-950"
                    }`}
                  >
                    <span className="font-mono-tabular mr-1 text-[10px] opacity-60">
                      {item.code}
                    </span>
                    {item.label}
                  </Link>
                );
              })}
              {isMod && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 text-xs font-semibold tracking-tight transition ${
                    pathname.startsWith("/admin")
                      ? "bg-amber-900 text-white"
                      : "text-amber-900 hover:bg-amber-100/70"
                  }`}
                >
                  <span className="font-mono-tabular mr-1 text-[10px] opacity-70">
                    07
                  </span>
                  Desk
                  {pendingCount > 0 && (
                    <span className="ml-1.5 bg-amber-900 px-1.5 py-0.5 font-mono-tabular text-[10px] text-white">
                      {pendingCount}
                    </span>
                  )}
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/submit"
              className="inline-flex items-center gap-1 border border-stone-900 bg-[#FBF9F4] px-3 py-1.5 text-xs font-semibold text-stone-900 transition hover:bg-stone-900 hover:text-[#F6F3EC]"
              title="Employers, Recruiters & Cohort: Post a mandate or vacancy (Zero login required)"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hire / Post Mandate</span>
              <span className="sm:hidden">Post</span>
            </Link>
            {user ? (
              <>
                <Link
                  href="/settings"
                  className={`px-2.5 py-1.5 font-mono-tabular text-xs font-medium ${
                    pathname.startsWith("/settings")
                      ? "bg-stone-900 text-[#F6F3EC]"
                      : "border border-stone-300 bg-[#FBF9F4] text-stone-800 hover:border-stone-900"
                  }`}
                  title={`${user.name} (${user.email})`}
                >
                  {user.name.split(" ")[0]}
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="border border-stone-300 bg-[#FBF9F4] p-1.5 text-stone-600 hover:border-stone-900 hover:text-stone-950 disabled:opacity-50"
                  title="Sign out"
                >
                  {isSigningOut ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-900" />
                  ) : (
                    <LogOut className="h-3.5 w-3.5" />
                  )}
                </button>
              </>
            ) : (
              <Link
                href="/sign-in"
                className="border border-stone-900 bg-stone-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-[#F6F3EC] uppercase hover:bg-stone-800"
              >
                Sign In to Track →
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile bottom ledger bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t-2 border-stone-900 bg-[#F6F3EC] py-2 lg:hidden">
        {LINKS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center px-2 py-0.5 text-[11px] font-semibold ${
                active
                  ? "bg-stone-900 px-2.5 py-1 text-[#F6F3EC]"
                  : "text-stone-700"
              }`}
            >
              <span className="font-mono-tabular text-[9px] opacity-60">
                {item.code}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
