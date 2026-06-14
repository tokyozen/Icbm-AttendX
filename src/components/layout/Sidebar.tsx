"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/generated/prisma/client";

interface SidebarUser {
  name: string;
  email: string;
  role: Role;
}

interface SidebarProps {
  user: SidebarUser;
}

const NAV = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="3" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="14" width="7" height="7" rx="1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    adminOnly: false,
  },
  {
    label: "Students",
    href: "/students",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-5-3.87M9 20H4v-2a4 4 0 015-3.87m6-4a4 4 0 11-8 0 4 4 0 018 0zm6 0a3 3 0 11-6 0 3 3 0 016 0zM3 17a3 3 0 116 0" />
      </svg>
    ),
    adminOnly: false,
  },
  {
    label: "Sessions",
    href: "/sessions",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
    adminOnly: false,
  },
  {
    label: "Reports",
    href: "/reports",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-6 4 4 4-8" />
      </svg>
    ),
    adminOnly: false,
  },
  {
    label: "Users",
    href: "/users",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    adminOnly: true,
  },
];

function roleBadgeStyle(role: Role) {
  if (role === "SUPER_ADMIN") return { backgroundColor: "#C9922A", color: "#fff" };
  if (role === "ADMIN") return { backgroundColor: "#0E7C7B", color: "#fff" };
  return { backgroundColor: "#475569", color: "#fff" };
}

function roleLabel(role: Role) {
  if (role === "SUPER_ADMIN") return "Super Admin";
  if (role === "ADMIN") return "Admin";
  return "Instructor";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function NavLinks({ user, pathname, onNavigate }: { user: SidebarUser; pathname: string; onNavigate?: () => void }) {
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
            style={
              active
                ? { backgroundColor: "#0E7C7B", color: "#ffffff" }
                : { color: "#94a3b8" }
            }
            onMouseEnter={(e) => {
              if (!active) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#1e3a5f";
            }}
            onMouseLeave={(e) => {
              if (!active) (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ user }: { user: SidebarUser }) {
  return (
    <div className="px-4 py-4 border-t" style={{ borderColor: "#1e3a5f" }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white"
          style={{ backgroundColor: "#0E7C7B" }}
        >
          {initials(user.name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate">{user.name}</p>
          <span
            className="inline-block text-xs px-1.5 py-0.5 rounded font-medium mt-0.5"
            style={roleBadgeStyle(user.role)}
          >
            {roleLabel(user.role)}
          </span>
        </div>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        className="w-full text-left text-xs px-3 py-2 rounded-lg transition-colors"
        style={{ color: "#94a3b8" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e3a5f";
          (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
        }}
      >
        Sign Out
      </button>
    </div>
  );
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside
        className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0"
        style={{ backgroundColor: "#0F1E35" }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: "#1e3a5f" }}>
          <p className="text-base font-extrabold text-white">ICBM-AttendX</p>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>by SBTS Group</p>
        </div>

        <NavLinks user={user} pathname={pathname} />
        <UserFooter user={user} />
      </aside>

      {/* ── Mobile top bar ── */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 border-b"
        style={{ backgroundColor: "#0F1E35", borderColor: "#1e3a5f" }}
      >
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-white p-1"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="text-white font-bold text-sm">ICBM-AttendX</span>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ backgroundColor: "#0E7C7B" }}
        >
          {initials(user.name)}
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 flex"
          onClick={() => setDrawerOpen(false)}
        >
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50" />

          {/* drawer */}
          <aside
            className="relative flex flex-col w-72 h-full shadow-xl"
            style={{ backgroundColor: "#0F1E35" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-5 border-b flex items-center justify-between" style={{ borderColor: "#1e3a5f" }}>
              <div>
                <p className="text-base font-extrabold text-white">ICBM-AttendX</p>
                <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>by SBTS Group</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <NavLinks user={user} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <UserFooter user={user} />
          </aside>
        </div>
      )}
    </>
  );
}
