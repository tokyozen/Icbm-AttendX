"use client";

import { useCallback, useEffect, useState } from "react";

interface ApiKeyRow {
  id: string;
  name: string;
  keyPreview: string;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

function formatDate(iso: string | null) {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ApiKeysClient() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [revealedKey, setRevealedKey] = useState<{ key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/api-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  function openCreate() {
    setNewKeyName("");
    setCreateError("");
    setShowCreateModal(true);
  }

  async function handleCreate() {
    if (!newKeyName.trim()) {
      setCreateError("Name is required.");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCreateError(data.error ?? "Failed to generate key.");
        return;
      }
      setShowCreateModal(false);
      setRevealedKey({ key: data.key, name: data.name });
      loadKeys();
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleToggle(key: ApiKeyRow) {
    setTogglingId(key.id);
    try {
      const res = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !key.isActive }),
      });
      if (res.ok) {
        showToast(
          key.isActive ? `${key.name} revoked` : `${key.name} reactivated`,
          "success"
        );
        loadKeys();
      } else {
        showToast("Failed to update key", "error");
      }
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-[#0F1E35]">API Keys</h1>
          <p className="text-sm mt-1" style={{ color: "#64748b" }}>
            Manage keys used by external LMS integrations to pull attendance data.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ backgroundColor: "#0E7C7B" }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Generate New Key
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#E2E8F0" }}>
        {loading ? (
          <div className="py-16 text-center">
            <div
              className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin mx-auto"
              style={{ borderColor: "#0E7C7B", borderTopColor: "transparent" }}
            />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "#64748b" }}>
            No API keys yet. Generate one to enable LMS integration.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b" style={{ borderColor: "#E2E8F0", color: "#64748b" }}>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Key</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Last Used</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id} className="border-b last:border-0" style={{ borderColor: "#F1F5F9" }}>
                  <td className="px-4 py-3 font-medium text-[#0F1E35]">{key.name}</td>
                  <td className="px-4 py-3 font-mono text-xs" style={{ color: "#64748b" }}>
                    {key.keyPreview}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block text-xs px-2 py-0.5 rounded-full font-medium"
                      style={
                        key.isActive
                          ? { backgroundColor: "#dcfce7", color: "#15803d" }
                          : { backgroundColor: "#fee2e2", color: "#b91c1c" }
                      }
                    >
                      {key.isActive ? "Active" : "Revoked"}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "#64748b" }}>
                    {formatDate(key.lastUsedAt)}
                  </td>
                  <td className="px-4 py-3" style={{ color: "#64748b" }}>
                    {formatDate(key.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggle(key)}
                      disabled={togglingId === key.id}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={
                        key.isActive
                          ? { color: "#b91c1c", backgroundColor: "#fee2e2" }
                          : { color: "#15803d", backgroundColor: "#dcfce7" }
                      }
                    >
                      {key.isActive ? "Revoke" : "Reactivate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-[#0F1E35] mb-4">Generate New API Key</h2>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#475569" }}>
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g. Moodle LMS Integration"
              className="w-full px-3 py-2.5 rounded-lg border text-sm mb-1"
              style={{ borderColor: "#E2E8F0" }}
              autoFocus
            />
            {createError && <p className="text-xs text-red-600 mb-2">{createError}</p>}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ color: "#64748b" }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                {creating ? "Generating..." : "Generate Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal-once modal */}
      {revealedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-[#0F1E35] mb-1">{revealedKey.name}</h2>
            <p className="text-xs font-semibold mb-3" style={{ color: "#b91c1c" }}>
              Save this key now — it will never be shown again.
            </p>
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border font-mono text-xs break-all"
              style={{ borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" }}
            >
              <span className="flex-1">{revealedKey.key}</span>
              <button
                onClick={handleCopy}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: "#0E7C7B" }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex justify-end mt-5">
              <button
                onClick={() => setRevealedKey(null)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: "#0F1E35" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white z-50"
          style={{ backgroundColor: toast.type === "success" ? "#15803d" : "#b91c1c" }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
