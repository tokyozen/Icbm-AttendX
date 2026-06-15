"use client";

import { useCallback, useEffect, useState } from "react";
import { TRAINING_LOCATIONS } from "@/types/index";

type UserRole = "SUPER_ADMIN" | "ADMIN" | "INSTRUCTOR";
type Tab = "active" | "pending";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  location: string | null;
  learningTrack: string | null;
  isActive: boolean;
  isApproved: boolean;
  appliedAt: string | null;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  location: string;
}

const ROLE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  SUPER_ADMIN: { bg: "#fef3c7", color: "#92400e", label: "Super Admin" },
  ADMIN: { bg: "#dcfce7", color: "#15803d", label: "Admin" },
  INSTRUCTOR: { bg: "#e0f2fe", color: "#0369a1", label: "Instructor" },
};

const BLANK_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  role: "INSTRUCTOR",
  location: "",
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function fetchUsers(status: "active" | "pending"): Promise<UserRow[]> {
  try {
    const res = await fetch(`/api/users?status=${status}`);
    if (!res.ok) return [];
    const json = await res.json().catch(() => ({}));
    return json.users ?? [];
  } catch {
    return [];
  }
}

export default function UsersClient({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("active");
  const [activeUsers, setActiveUsers] = useState<UserRow[]>([]);
  const [pendingUsers, setPendingUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [active, pending] = await Promise.all([
      fetchUsers("active"),
      fetchUsers("pending"),
    ]);
    setActiveUsers(active);
    setPendingUsers(pending);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function openAdd() {
    setForm(BLANK_FORM);
    setFormError("");
    setEditUser(null);
    setShowAddModal(true);
  }

  function openEdit(u: UserRow) {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, location: u.location ?? "" });
    setFormError("");
    setShowAddModal(true);
  }

  async function handleSave() {
    setFormError("");
    if (!form.name.trim() || !form.email.trim()) {
      setFormError("Name and email are required.");
      return;
    }
    if (!editUser && form.password.length < 8) {
      setFormError("Password must be at least 8 characters.");
      return;
    }
    setSaving(true);

    if (editUser) {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, role: form.role, location: form.location || null }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(d.error ?? "Failed to update user."); setSaving(false); return; }
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setFormError(d.error ?? "Failed to create user."); setSaving(false); return; }
    }

    setSaving(false);
    setShowAddModal(false);
    loadAll();
  }

  async function handleDeactivate(id: string) {
    setDeactivatingId(id);
    await fetch(`/api/users/${id}`, { method: "DELETE" }).catch(() => {});
    setDeactivatingId(null);
    loadAll();
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    await fetch(`/api/users/${id}/approve`, { method: "POST" }).catch(() => {});
    setApprovingId(null);
    loadAll();
  }

  async function handleReject(id: string) {
    setRejectingId(id);
    await fetch(`/api/users/${id}/reject`, { method: "POST" }).catch(() => {});
    setRejectingId(null);
    loadAll();
  }

  const pendingCount = pendingUsers.length;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-black tracking-tight text-[#0F1E35]">
          Users
        </h1>
        {isSuperAdmin && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: "#0E7C7B" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "#E2E8F0" }}>
        {(["active", "pending"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === t ? "#0E7C7B" : "#64748b",
              borderBottom: tab === t ? "2px solid #0E7C7B" : "2px solid transparent",
              marginBottom: "-1px",
            }}
            onMouseEnter={(e) => {
              if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = "#0F1E35";
            }}
            onMouseLeave={(e) => {
              if (tab !== t) (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
            }}
          >
            {t === "active" ? "Active Users" : "Pending Approval"}
            {t === "pending" && pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center text-xs font-bold rounded-full px-1.5 min-w-[1.25rem] h-5"
                style={{ backgroundColor: "#C9922A", color: "#fff" }}
              >
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        {loading ? (
          <div className="py-16 text-center">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#0E7C7B", borderTopColor: "transparent" }}
            />
          </div>
        ) : tab === "active" ? (
          <ActiveUsersTable
            users={activeUsers}
            isSuperAdmin={isSuperAdmin}
            onEdit={openEdit}
            onDeactivate={handleDeactivate}
            deactivatingId={deactivatingId}
          />
        ) : (
          <PendingTable
            users={pendingUsers}
            onApprove={handleApprove}
            onReject={handleReject}
            approvingId={approvingId}
            rejectingId={rejectingId}
          />
        )}
      </div>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-4" style={{ color: "#0F1E35" }}>
              {editUser ? "Edit User" : "Add User"}
            </h2>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                {formError}
              </p>
            )}

            <div className="space-y-4">
              <ModalField label="Full Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="modal-input"
                  placeholder="e.g. Chukwuemeka Obi"
                />
              </ModalField>

              <ModalField label="Email Address">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className="modal-input"
                  placeholder="user@example.com"
                  disabled={!!editUser}
                  style={{ opacity: editUser ? 0.6 : 1 }}
                />
              </ModalField>

              {!editUser && (
                <ModalField label="Password">
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                    className="modal-input"
                    placeholder="Min. 8 characters"
                  />
                </ModalField>
              )}

              <ModalField label="Role">
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                  className="modal-input"
                >
                  <option value="INSTRUCTOR">Instructor</option>
                  <option value="ADMIN">Admin</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </ModalField>

              <ModalField label="Location (optional)">
                <select
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  className="modal-input"
                >
                  <option value="">None</option>
                  {TRAINING_LOCATIONS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </ModalField>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium"
                style={{ borderColor: "#E2E8F0", color: "#64748b" }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                {saving ? "Saving…" : editUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-input {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 0.5rem;
          padding: 0.5rem 0.875rem;
          font-size: 0.875rem;
          color: #0F1E35;
          outline: none;
          background: white;
        }
        .modal-input:focus { border-color: #0E7C7B; box-shadow: 0 0 0 3px rgba(14,124,123,0.15); }
      `}</style>
    </div>
  );
}

/* ── Active Users Table ─────────────────────────────────────── */

function ActiveUsersTable({
  users,
  isSuperAdmin,
  onEdit,
  onDeactivate,
  deactivatingId,
}: {
  users: UserRow[];
  isSuperAdmin: boolean;
  onEdit: (u: UserRow) => void;
  onDeactivate: (id: string) => void;
  deactivatingId: string | null;
}) {
  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: "#64748b" }}>
        No active users found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
            {["Full Name", "Email", "Role", "Location", "Learning Track", "Status", "Actions"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: "#64748b" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => {
            const badge = ROLE_STYLE[u.role] ?? ROLE_STYLE.INSTRUCTOR;
            return (
              <tr
                key={u.id}
                style={{ borderBottom: i < users.length - 1 ? "1px solid #F1F5F9" : "none" }}
              >
                <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#0F1E35" }}>{u.name}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>{u.email}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold whitespace-nowrap"
                    style={{ backgroundColor: badge.bg, color: badge.color }}>
                    {badge.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.location ?? "—"}</td>
                <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.learningTrack ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={u.isActive
                      ? { backgroundColor: "#dcfce7", color: "#15803d" }
                      : { backgroundColor: "#f1f5f9", color: "#475569" }}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {isSuperAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(u)}
                        className="text-xs px-2.5 py-1 rounded-lg border font-medium"
                        style={{ borderColor: "#0E7C7B", color: "#0E7C7B" }}
                      >
                        Edit
                      </button>
                      {u.isActive && (
                        <button
                          onClick={() => onDeactivate(u.id)}
                          disabled={deactivatingId === u.id}
                          className="text-xs px-2.5 py-1 rounded-lg border font-medium disabled:opacity-50"
                          style={{ borderColor: "#fca5a5", color: "#ef4444" }}
                        >
                          {deactivatingId === u.id ? "…" : "Deactivate"}
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Pending Approval Table ─────────────────────────────────── */

function PendingTable({
  users,
  onApprove,
  onReject,
  approvingId,
  rejectingId,
}: {
  users: UserRow[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  approvingId: string | null;
  rejectingId: string | null;
}) {
  if (users.length === 0) {
    return (
      <div className="py-16 text-center text-sm" style={{ color: "#64748b" }}>
        No pending applications.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "#F5F6FA", borderBottom: "1px solid #E2E8F0" }}>
            {["Full Name", "Email", "Location", "Learning Track", "Applied", "Actions"].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{ color: "#64748b" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr
              key={u.id}
              style={{ borderBottom: i < users.length - 1 ? "1px solid #F1F5F9" : "none" }}
            >
              <td className="px-4 py-3 font-medium whitespace-nowrap" style={{ color: "#0F1E35" }}>{u.name}</td>
              <td className="px-4 py-3 text-xs" style={{ color: "#475569" }}>{u.email}</td>
              <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.location ?? "—"}</td>
              <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>{u.learningTrack ?? "—"}</td>
              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "#64748b" }}>
                {formatDate(u.appliedAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onApprove(u.id)}
                    disabled={approvingId === u.id}
                    className="text-xs px-2.5 py-1 rounded-lg font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: "#0E7C7B" }}
                  >
                    {approvingId === u.id ? "…" : "Approve"}
                  </button>
                  <button
                    onClick={() => onReject(u.id)}
                    disabled={rejectingId === u.id}
                    className="text-xs px-2.5 py-1 rounded-lg border font-medium disabled:opacity-50"
                    style={{ borderColor: "#fca5a5", color: "#ef4444" }}
                  >
                    {rejectingId === u.id ? "…" : "Reject"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: "#0F1E35" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
