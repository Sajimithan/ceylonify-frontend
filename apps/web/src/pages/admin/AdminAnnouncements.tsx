import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_BROADCAST_ANNOUNCEMENT } from "./admin.gql";

const ROLE_OPTIONS = [
  { value: "TRAVELER", label: "Travelers",   emoji: "🧳" },
  { value: "HOST",     label: "Hosts",       emoji: "🏠" },
  { value: "ADMIN",    label: "Admins",      emoji: "🛡️" },
];

export function AdminAnnouncements() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(
    new Set(["TRAVELER", "HOST", "ADMIN"])
  );
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [broadcast, { loading }] = useMutation(ADMIN_BROADCAST_ANNOUNCEMENT);

  function toggleRole(role: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  const roleLabel = selectedRoles.size === 3
    ? "All users"
    : selectedRoles.size === 0
      ? "No recipients"
      : ROLE_OPTIONS.filter((r) => selectedRoles.has(r.value)).map((r) => r.label).join(", ");

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (selectedRoles.size === 0) {
      setError("Select at least one recipient group.");
      return;
    }
    if (!confirm(`Send this announcement to: ${roleLabel}?\n\nTitle: ${title}\nMessage: ${body}`)) return;
    setError(null);
    setResult(null);
    try {
      const { data } = await broadcast({
        variables: {
          title: title.trim(),
          body: body.trim(),
          roles: Array.from(selectedRoles),
        },
      });
      setResult(data?.adminBroadcastAnnouncement ?? 0);
      setTitle("");
      setBody("");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to send announcement.");
    }
  }

  return (
    <DashboardLayout title="Announcements" subtitle="Send notifications to selected user groups">
      <div className="mx-auto w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-7">
          <div className="text-sm font-bold text-slate-600 mb-1">Compose Announcement</div>
          <div className="text-xs text-slate-400 mb-6">
            This will create an in-app notification for the selected groups and attempt push delivery to their registered devices.
          </div>

          <div className="space-y-4">
            {/* Recipients */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Recipients *</label>
              <div className="flex gap-3 flex-wrap">
                {ROLE_OPTIONS.map(({ value, label, emoji }) => {
                  const checked = selectedRoles.has(value);
                  return (
                    <label
                      key={value}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 cursor-pointer transition-all select-none text-sm font-semibold ${
                        checked
                          ? "border-brand-400 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-slate-50 text-slate-400 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRole(value)}
                        className="w-3.5 h-3.5 accent-sky-600"
                      />
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
              {selectedRoles.size === 0 && (
                <p className="text-xs text-red-500 font-semibold mt-1">Select at least one group.</p>
              )}
              {selectedRoles.size > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  Sending to: <span className="font-semibold text-slate-600">{roleLabel}</span>
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. New features available!"
                maxLength={100}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                placeholder="Write your announcement here…"
                maxLength={500}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
              <div className="text-right text-[10px] text-slate-300 mt-1">{body.length}/500</div>
            </div>
          </div>

          {error && <div className="mt-4 text-sm font-semibold text-red-600">{error}</div>}

          {result !== null && (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              ✅ Announcement sent to {result} user{result !== 1 ? "s" : ""} ({roleLabel}).
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSend}
              disabled={loading || !title.trim() || !body.trim() || selectedRoles.size === 0}
            >
              {loading ? "Sending…" : `📢 Send to ${roleLabel}`}
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
          <div className="font-bold mb-1">Best practices</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Keep titles under 60 characters for best display on mobile.</li>
            <li>Announcements appear in the selected users' notification bell immediately.</li>
            <li>Push delivery depends on users having registered their device and granted notification permissions.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
