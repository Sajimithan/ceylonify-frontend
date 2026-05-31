import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { ADMIN_HOST_DETAIL } from "../hosts.gql";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const BADGE_EMOJI: Record<string, string> = { DIAMOND: "💎", GOLD: "🥇", SILVER: "🥈", BRONZE: "🥉", NONE: "" };
const BADGE_COLOR: Record<string, string> = {
  DIAMOND: "bg-cyan-100 text-cyan-700",
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-slate-100 text-slate-600",
  BRONZE: "bg-orange-100 text-orange-700",
  NONE: "bg-slate-100 text-slate-500",
};

type Listing = {
  id: string;
  title: string;
  imageUrl?: string;
  startDateTime?: string;
  type: string;
  category?: string;
  placeName?: string;
  status: string;
};

export function AdminUserDetail() {
  const { firebaseUid } = useParams<{ firebaseUid: string }>();
  const nav = useNavigate();
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const { data, loading, error } = useQuery(ADMIN_HOST_DETAIL, {
    variables: { firebaseUid },
    skip: !firebaseUid,
  });

  const host = data?.adminHostDetail;

  return (
    <DashboardLayout title="Host Detail" subtitle="View host performance and event history">
      <div className="mx-auto w-full max-w-5xl">
        <button
          onClick={() => nav("/admin/users")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Users
        </button>

        {loading && (
          <div className="text-sm text-slate-400 font-semibold py-10 text-center">Loading…</div>
        )}
        {error && (
          <div className="rounded-xl bg-red-100 p-4 text-sm font-bold text-red-700 mb-4">
            {error.message}
          </div>
        )}

        {host && (
          <>
            {/* Header card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-5 mb-6">
              {host.avatarUrl ? (
                <img src={host.avatarUrl} alt={host.displayName} className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-2xl">
                  {(host.displayName ?? host.firebaseUid).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 text-lg">{host.displayName ?? "—"}</div>
                <div className="text-sm text-slate-400">{host.email ?? host.firebaseUid}</div>
                <div className="mt-1">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_COLOR[host.badgeLevel]}`}>
                    {BADGE_EMOJI[host.badgeLevel]} {host.badgeLevel}
                  </span>
                </div>
              </div>
              <div className="text-right text-xs text-slate-400">
                Joined {new Date(host.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Listings", value: host.upcomingEvents.length + host.pastEvents.length },
                { label: "Approved", value: host.approvedCount },
                { label: "Total Views", value: host.totalViews.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-white rounded-xl shadow p-5 text-center">
                  <div className="text-2xl font-bold text-brand-600">{value}</div>
                  <div className="text-xs font-semibold text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="mb-4 flex items-center gap-1 bg-white rounded-xl shadow px-2 py-1.5 w-fit">
              <button
                onClick={() => setActiveTab("upcoming")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === "upcoming" ? "bg-brand-500 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Upcoming Events ({host.upcomingEvents.length})
              </button>
              <button
                onClick={() => setActiveTab("past")}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${activeTab === "past" ? "bg-slate-600 text-white" : "text-slate-500 hover:text-slate-700"}`}
              >
                Past Events ({host.pastEvents.length})
              </button>
            </div>

            {/* Listing grid */}
            {(() => {
              const events: Listing[] = activeTab === "upcoming" ? host.upcomingEvents : host.pastEvents;
              if (events.length === 0) {
                return (
                  <div className="text-center py-12 text-slate-400 font-semibold">
                    No {activeTab === "upcoming" ? "upcoming" : "past"} events.
                  </div>
                );
              }
              return (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((l) => (
                    <div
                      key={l.id}
                      className="bg-white rounded-xl shadow overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => nav(`/listing/${l.id}`)}
                    >
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt={l.title} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-3xl text-slate-300">🏝️</div>
                      )}
                      <div className="p-3">
                        <div className="font-bold text-slate-700 text-sm line-clamp-1">{l.title}</div>
                        {l.startDateTime && (
                          <div className="text-[11px] text-slate-400 mt-1">
                            🗓 {new Date(l.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </div>
                        )}
                        {l.placeName && (
                          <div className="text-[11px] text-slate-400">📍 {l.placeName}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
