import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_BROADCAST_ANNOUNCEMENT } from "./admin.gql";

export function AdminAnnouncements() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [broadcast, { loading }] = useMutation(ADMIN_BROADCAST_ANNOUNCEMENT);

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      setError("Title and message are required.");
      return;
    }
    if (!confirm(`Send this announcement to ALL users?\n\nTitle: ${title}\nMessage: ${body}`)) return;
    setError(null);
    setResult(null);
    try {
      const { data } = await broadcast({ variables: { title: title.trim(), body: body.trim() } });
      setResult(data?.adminBroadcastAnnouncement ?? 0);
      setTitle("");
      setBody("");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Failed to send announcement.");
    }
  }

  return (
    <DashboardLayout title="Announcements" subtitle="Send notifications to all platform users">
      <div className="mx-auto w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-7">
          <div className="text-sm font-bold text-slate-600 mb-1">Compose Announcement</div>
          <div className="text-xs text-slate-400 mb-6">
            This will create an in-app notification for every user and attempt push delivery to all registered devices.
          </div>

          <div className="space-y-4">
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
              ✅ Announcement sent to {result} user{result !== 1 ? "s" : ""}.
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSend} disabled={loading || !title.trim() || !body.trim()}>
              {loading ? "Sending…" : "📢 Send to All Users"}
            </Button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700">
          <div className="font-bold mb-1">Best practices</div>
          <ul className="list-disc list-inside space-y-1">
            <li>Keep titles under 60 characters for best display on mobile.</li>
            <li>Announcements appear in every user's notification bell immediately.</li>
            <li>Push delivery depends on users having registered their device and granted notification permissions.</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
