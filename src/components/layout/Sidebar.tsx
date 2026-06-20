"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import type { Role } from "@/generated/prisma/client";
import { ICBM_LOGO_BASE64 } from "@/lib/logo";

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
    label: "Master Attendance",
    href: "/master-attendance",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2z" />
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
  {
    label: "Attendance Override",
    href: "/attendance/override",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    adminOnly: true,
    superAdminOnly: true,
  },
  {
    label: "API Keys",
    href: "/api-keys",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
        />
      </svg>
    ),
    adminOnly: true,
    superAdminOnly: true,
  },
];

const BLOB_KEYFRAMES = `
@keyframes blobDrift {
  0%   { transform: translate(0,0) scale(1); }
  33%  { transform: translate(-20px, 30px) scale(1.1); }
  66%  { transform: translate(20px, -15px) scale(0.92); }
  100% { transform: translate(-10px, 10px) scale(1.06); }
}
`;

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

function SidebarShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-col h-full overflow-hidden" style={{ background: "linear-gradient(180deg, #0F1E35 0%, #162840 100%)" }}>
      <style>{BLOB_KEYFRAMES}</style>

      {/* Teal blob — top-right */}
      <div
        style={{
          position: "absolute",
          top: "-60px",
          right: "-60px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #0E7C7B, #0a5a59)",
          opacity: 0.9,
          filter: "blur(48px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "blobDrift 16s ease-in-out infinite",
        }}
      />

      {/* Gold blob — bottom-left */}
      <div
        style={{
          position: "absolute",
          bottom: "-50px",
          left: "-50px",
          width: "240px",
          height: "240px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #C9922A, #a07420)",
          opacity: 0.85,
          filter: "blur(42px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "blobDrift 21s ease-in-out infinite",
          animationDelay: "-8s",
        }}
      />

      {/* Small teal blob — center */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          left: "20%",
          width: "160px",
          height: "160px",
          borderRadius: "50%",
          background: "radial-gradient(circle, #0E7C7B, #064e4d)",
          opacity: 0.55,
          filter: "blur(36px)",
          pointerEvents: "none",
          zIndex: 0,
          animation: "blobDrift 26s ease-in-out infinite",
          animationDelay: "-14s",
        }}
      />

      {/* Content */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

function SidebarLogo() {
  return (
    <div className="flex flex-col items-center px-4 pt-6 pb-4">
      <img
        src={ICBM_LOGO_BASE64}
        alt="ICBM"
        style={{ width: "80px", height: "80px", objectFit: "contain", mixBlendMode: "screen", display: "block" }}
      />
      <span className="text-white font-bold text-sm tracking-widest mt-1">
        ICBM-AttendX
      </span>
      <span className="text-xs tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>
        by SBTS Group
      </span>
    </div>
  );
}

function SbtsFooter() {
  return (
    <div
      className="flex flex-col items-center gap-1 pt-3 mt-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
    >
      <span className="uppercase tracking-widest text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        Powered by SBTS Group
      </span>
    </div>
  );
}

function NavLinks({
  user,
  pathname,
  pendingCount,
  onNavigate,
}: {
  user: SidebarUser;
  pathname: string;
  pendingCount: number;
  onNavigate?: () => void;
}) {
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  const isSuperAdmin = user.role === "SUPER_ADMIN";
  return (
    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
      {NAV.filter((item) => (!item.adminOnly || isAdmin) && (!item.superAdminOnly || isSuperAdmin)).map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200"
            style={
              active
                ? { backgroundColor: "#0E7C7B", color: "#ffffff" }
                : { color: "#94a3b8" }
            }
            onMouseEnter={(e) => {
              if (!active) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#ffffff";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
              }
            }}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.label === "Users" && pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center text-xs font-bold rounded-full px-1.5 min-w-[1.25rem] h-5"
                style={{ backgroundColor: "#C9922A", color: "#fff" }}
              >
                {pendingCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({ user }: { user: SidebarUser }) {
  return (
    <div className="px-4 py-4" style={{ borderTop: "1px solid #1e3a5f" }}>
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
        className="w-full text-left text-xs px-3 py-2 rounded-lg transition-all duration-200"
        style={{ color: "#94a3b8" }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.05)";
          (e.currentTarget as HTMLButtonElement).style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
        }}
      >
        Sign Out
      </button>
      <SbtsFooter />
    </div>
  );
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    const fetch_ = () =>
      fetch("/api/users?status=pending")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && setPendingCount(d.total ?? 0))
        .catch(() => {});
    fetch_();
    const id = setInterval(fetch_, 60_000);
    return () => clearInterval(id);
  }, [isAdmin]);

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0 overflow-hidden">
        <SidebarShell>
          <SidebarLogo />
          <NavLinks user={user} pathname={pathname} pendingCount={pendingCount} />
          <UserFooter user={user} />
        </SidebarShell>
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
        <div className="flex items-center gap-2">
          <img src={ICBM_LOGO_BASE64} alt="ICBM" style={{ width: "28px", height: "28px", objectFit: "contain", mixBlendMode: "screen", display: "block" }} />
          <span className="text-white font-bold text-sm">ICBM-AttendX</span>
        </div>
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
          <div className="absolute inset-0 bg-black/50" />
          <aside
            className="relative flex flex-col w-72 h-full shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarShell>
              <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #1e3a5f" }}>
                <div className="flex items-center gap-2">
                  <img src={ICBM_LOGO_BASE64} alt="ICBM" style={{ width: "32px", height: "32px", objectFit: "contain", mixBlendMode: "screen", display: "block" }} />
                  <div>
                    <p className="text-sm font-extrabold text-white">ICBM-AttendX</p>
                    <p className="text-[10px]" style={{ color: "#64748b" }}>by SBTS Group</p>
                  </div>
                </div>
                <button onClick={() => setDrawerOpen(false)} className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <NavLinks user={user} pathname={pathname} pendingCount={pendingCount} onNavigate={() => setDrawerOpen(false)} />
              <UserFooter user={user} />
            </SidebarShell>
          </aside>
        </div>
      )}
    </>
  );
}
