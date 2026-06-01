import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { HOST_PUBLIC_PROFILE } from "./hosts.gql";

const BADGE_EMOJI: Record<string, string> = { DIAMOND: "💎", GOLD: "🥇", SILVER: "🥈", BRONZE: "🥉", NONE: "" };
const BADGE_COLOR: Record<string, string> = {
  DIAMOND: "bg-cyan-100 text-cyan-700",
  GOLD: "bg-amber-100 text-amber-700",
  SILVER: "bg-slate-100 text-slate-600",
  BRONZE: "bg-orange-100 text-orange-700",
  NONE: "bg-slate-100 text-slate-400",
};

type Experience = {
  id: string;
  listingId: string;
  rating: number;
  text: string;
  imageUrls: string[];
  createdAt: string;
  user?: { displayName?: string; avatarUrl?: string };
};

type Listing = {
  id: string;
  title: string;
  imageUrl?: string;
  startDateTime?: string;
  type: string;
  price?: string;
  placeName?: string;
};

export function HostPublicProfile() {
  const { firebaseUid } = useParams<{ firebaseUid: string }>();
  const nav = useNavigate();

  const { data, loading, error } = useQuery(HOST_PUBLIC_PROFILE, {
    variables: { firebaseUid },
    skip: !firebaseUid,
  });

  const host = data?.hostPublicProfile;

  const expByListing = new Map<string, Experience[]>();
  if (host?.pastExperiences) {
    for (const exp of host.pastExperiences as Experience[]) {
      if (!expByListing.has(exp.listingId)) expByListing.set(exp.listingId, []);
      expByListing.get(exp.listingId)!.push(exp);
    }
  }

  return (
    <DashboardLayout title="Host Profile" subtitle="View host events and traveler experiences">
      <div className="mx-auto w-full max-w-4xl">
        <button
          onClick={() => nav("/browse")}
          className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Browse
        </button>

        {loading && <div className="text-sm text-slate-400 font-semibold py-10 text-center">Loading…</div>}
        {error && <div className="rounded-xl bg-red-100 p-4 text-sm font-bold text-red-700">{error.message}</div>}

        {host && (
          <>
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-5 mb-8">
              {host.avatarUrl ? (
                <img src={host.avatarUrl} alt={host.displayName} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-3xl">
                  {(host.displayName ?? host.firebaseUid).slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-xl">{host.displayName ?? "Host"}</div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${BADGE_COLOR[host.badgeLevel]}`}>
                  {BADGE_EMOJI[host.badgeLevel]} {host.badgeLevel !== "NONE" ? host.badgeLevel : "New Host"}
                </span>
                <div className="text-xs text-slate-400 mt-1">{host.approvedCount} approved events · Joined {new Date(host.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
              </div>
            </div>

            {/* Upcoming events */}
            {(() => {
              const now = new Date();
              const upcoming = (host.upcomingEvents as Listing[]).filter(
                (l) => !(l.type === "EVENT" && l.startDateTime && new Date(l.startDateTime) < now),
              );
              if (upcoming.length === 0) return null;
              return (
              <div className="mb-8">
                <h2 className="text-slate-600 font-bold text-sm uppercase mb-4">Upcoming Experiences</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => nav(`/listing/${l.id}`)}
                      className="bg-white rounded-xl shadow cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
                    >
                      {l.imageUrl ? (
                        <img src={l.imageUrl} alt={l.title} className="w-full h-32 object-cover" />
                      ) : (
                        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-3xl text-slate-300">🏝️</div>
                      )}
                      <div className="p-3">
                        <div className="font-bold text-slate-700 text-sm line-clamp-1">{l.title}</div>
                        {l.startDateTime && (
                          <div className="text-[11px] text-slate-400 mt-1">🗓 {new Date(l.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        )}
                        {l.placeName && <div className="text-[11px] text-slate-400">📍 {l.placeName}</div>}
                        {l.price && <div className="text-xs font-bold text-brand-600 mt-1">LKR {Number(l.price).toLocaleString()}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              );
            })()}

            {/* Past events + experiences */}
            {host.pastEvents.length > 0 && (
              <div>
                <h2 className="text-slate-600 font-bold text-sm uppercase mb-4">Past Events & Traveler Stories</h2>
                <div className="space-y-6">
                  {(host.pastEvents as Listing[]).map((l) => {
                    const exps = expByListing.get(l.id) ?? [];
                    return (
                      <div key={l.id} className="bg-white rounded-xl shadow overflow-hidden">
                        {/* Listing mini header */}
                        <div
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100"
                          onClick={() => nav(`/listing/${l.id}`)}
                        >
                          {l.imageUrl && <img src={l.imageUrl} alt={l.title} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />}
                          <div>
                            <div className="font-bold text-slate-700 text-sm">{l.title}</div>
                            {l.startDateTime && <div className="text-[11px] text-slate-400">🗓 {new Date(l.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>}
                          </div>
                          <div className="ml-auto text-xs text-brand-500 font-semibold">View →</div>
                        </div>
                        {/* Experiences */}
                        {exps.length === 0 ? (
                          <div className="px-4 py-3 text-xs text-slate-400 italic">No experiences shared yet for this event.</div>
                        ) : (
                          <div className="divide-y divide-slate-50">
                            {exps.map((exp) => (
                              <div key={exp.id} className="p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  {exp.user?.avatarUrl ? (
                                    <img src={exp.user.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">
                                      {(exp.user?.displayName ?? "T").slice(0, 1).toUpperCase()}
                                    </div>
                                  )}
                                  <span className="text-xs font-semibold text-slate-600">{exp.user?.displayName ?? "Traveler"}</span>
                                  <span className="ml-auto text-amber-400 text-xs">{"⭐".repeat(exp.rating)}</span>
                                </div>
                                <p className="text-sm text-slate-500 leading-relaxed">{exp.text}</p>
                                {exp.imageUrls.length > 0 && (
                                  <div className="flex gap-2 mt-2 overflow-x-auto">
                                    {exp.imageUrls.map((url, i) => (
                                      <img key={i} src={url} alt="" className="h-16 w-16 object-cover rounded-lg flex-shrink-0" />
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {host.upcomingEvents.length === 0 && host.pastEvents.length === 0 && (
              <div className="text-center py-16 text-slate-400 font-semibold">This host has no events yet.</div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
