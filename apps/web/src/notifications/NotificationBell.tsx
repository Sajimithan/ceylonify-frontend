import { useState, useEffect, useRef } from "react";
import { useSmartPoll } from "../hooks/useSmartPoll";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/outline";
import {
  MY_NOTIFICATIONS,
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "../pages/host/notifications.gql";

type AppNotification = {
  id: string;
  title: string;
  body: string;
  type: string;
  resourceId?: string;
  read: boolean;
  createdAt: string;
};

// Maps notification type → destination route
function resolveRoute(type: string, resourceId?: string): string | null {
  switch (type) {
    // Host notifications
    case "LISTING_APPROVED":
      return resourceId ? `/listing/${resourceId}` : "/dashboard";
    case "LISTING_REJECTED":
      return "/dashboard";
    case "SAVE":
      return "/saved";
    case "ITINERARY":
      return "/ai-planner";
    case "REMINDER":
      return "/ai-planner";
    // Traveler report feedback
    case "REPORT_REVIEWED":
    case "REPORT_ACTIONED":
      return resourceId ? `/listing/${resourceId}` : "/browse";
    // Admin notifications
    case "NEW_REPORT":
      return "/admin/reports";
    case "LISTING_SUBMITTED":
      return "/admin/pending";
    case "NEW_EVENT_NEARBY":
      return "/browse";
    case "EXPERIENCE_REVIEW":
    case "EXPERIENCE_REPLY":
      return resourceId ? `/listing/${resourceId}` : "/browse";
    default:
      return null;
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data, refetch, startPolling, stopPolling } = useQuery<{ myNotifications: AppNotification[] }>(
    MY_NOTIFICATIONS,
    { fetchPolicy: "cache-and-network" }
  );
  useSmartPoll(startPolling, stopPolling, 30_000);

  const [markRead] = useMutation(MARK_NOTIFICATION_READ, { onCompleted: () => refetch() });
  const [markAll] = useMutation(MARK_ALL_NOTIFICATIONS_READ, { onCompleted: () => refetch() });

  const notifications = data?.myNotifications ?? [];
  const unread = notifications.filter((n) => !n.read).length;

  // Refetch immediately when a foreground FCM push arrives
  useEffect(() => {
    const handler = () => refetch();
    window.addEventListener("ceylonify:notification", handler);
    return () => window.removeEventListener("ceylonify:notification", handler);
  }, [refetch]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleNotificationClick(n: AppNotification) {
    // Mark read
    if (!n.read) markRead({ variables: { notificationId: n.id } });

    // Navigate to relevant content
    const route = resolveRoute(n.type, n.resourceId ?? undefined);
    if (route) {
      setOpen(false);
      navigate(route);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <BellIcon className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-bold text-slate-700">Notifications</span>
            {unread > 0 && (
              <button
                onClick={() => markAll()}
                className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm font-medium">
                <div className="text-3xl mb-2">🎉</div>
                You're all caught up
              </div>
            ) : (
              notifications.map((n) => {
                const route = resolveRoute(n.type, n.resourceId ?? undefined);
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-colors flex gap-3 items-start ${
                      route ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
                    } ${n.read ? "bg-slate-50/60" : "bg-white border-l-2 border-l-brand-500"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${n.read ? "text-slate-400" : "text-slate-800"}`}>
                        {n.title}
                      </p>
                      <p className={`text-xs mt-0.5 line-clamp-2 ${n.read ? "text-slate-400" : "text-slate-500"}`}>
                        {n.body}
                      </p>
                      {route && (
                        <p className="text-[10px] text-brand-500 font-medium mt-1">
                          Tap to view →
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5 shrink-0">
                      {relativeTime(n.createdAt)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
