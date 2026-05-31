import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LIBRARIES } from "../../lib/googleMaps";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ADMIN_ALL_LISTINGS, ADMIN_ALL_USERS } from "./admin.gql";
import { APPROVE_LISTING, REJECT_LISTING, AI_REVIEW_LISTING } from "./moderation.gql";

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  category?: string;
  price?: string;
  placeName?: string;
  startDateTime?: string;
  lat?: number;
  lng?: number;
  status: string;
  rejectionReason?: string;
  createdAt: string;
  createdBy?: string;
  imageUrl?: string;
};

type UserRecord = { firebaseUid: string; email?: string };

type AIResult = { safe: boolean; confidence: number; flags: string[]; summary: string };

// ── Mini Map ──────────────────────────────────────────────────────────────────

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });
  const center = { lat, lng };
  const onLoad = useCallback(() => {}, []);
  if (!isLoaded) return <div className="w-full h-40 rounded-xl bg-slate-100 animate-pulse" />;
  return (
    <GoogleMap mapContainerClassName="w-full h-40 rounded-xl" center={center} zoom={13} onLoad={onLoad}>
      <Marker position={center} />
    </GoogleMap>
  );
}

// ── AI Review Panel ───────────────────────────────────────────────────────────

function AIReviewPanel({ listing }: { listing: Listing }) {
  const [result, setResult] = useState<AIResult | null>(null);
  const [aiReview, { loading }] = useMutation<{ aiReviewListing: AIResult }>(AI_REVIEW_LISTING);

  async function run() {
    const { data } = await aiReview({ variables: { title: listing.title, description: listing.description } });
    if (data) setResult(data.aiReviewListing);
  }

  if (!result) {
    return (
      <Button variant="ghost" onClick={run} className="text-xs !py-1 !px-3 border border-slate-200">
        {loading ? "Analysing…" : "🤖 Run AI Review"}
      </Button>
    );
  }

  const color = result.safe ? "emerald" : result.confidence > 0.7 ? "red" : "amber";
  const label = result.safe ? "✅ Safe" : result.confidence > 0.7 ? "🚨 Violation" : "⚠️ Caution";
  const bg = color === "emerald" ? "bg-emerald-50 border-emerald-200" : color === "red" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200";
  const text = color === "emerald" ? "text-emerald-700" : color === "red" ? "text-red-700" : "text-amber-700";

  return (
    <div className={`rounded-xl border p-3 text-xs ${bg}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={`font-bold text-sm ${text}`}>{label}</span>
        <span className={`${text} opacity-70`}>{Math.round(result.confidence * 100)}% confidence</span>
      </div>
      {result.flags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {result.flags.map((f) => (
            <span key={f} className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px] font-semibold">{f}</span>
          ))}
        </div>
      )}
      <p className={`${text} opacity-80`}>{result.summary}</p>
    </div>
  );
}

// ── Status pill ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cls = status === "APPROVED"
    ? "bg-emerald-100 text-emerald-700"
    : status === "REJECTED"
    ? "bg-red-100 text-red-700"
    : "bg-amber-100 text-amber-700";
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase ${cls}`}>{status}</span>
  );
}

// ── Listing Detail Modal ──────────────────────────────────────────────────────

function ListingDetailModal({
  listing,
  users,
  onClose,
  onRefetch,
}: {
  listing: Listing;
  users: UserRecord[];
  onClose: () => void;
  onRefetch: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const host = users.find((u) => u.firebaseUid === listing.createdBy);

  const [approve, { loading: approving }] = useMutation(APPROVE_LISTING, {
    onCompleted: () => { onRefetch(); onClose(); },
  });
  const [reject, { loading: rejecting }] = useMutation(REJECT_LISTING, {
    onCompleted: () => { onRefetch(); onClose(); },
  });

  const hasCoords = !!(listing.lat && listing.lng && listing.lat !== 0 && listing.lng !== 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <StatusPill status={listing.status} />
            <span className="text-xs text-slate-400">
              {new Date(listing.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Image */}
          {listing.imageUrl && (
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-52 object-cover rounded-xl" />
          )}

          {/* Title + meta */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{listing.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full uppercase">{listing.type}</span>
              {listing.category && <span className="text-xs text-slate-500 font-semibold uppercase">{listing.category}</span>}
              {listing.price && <span className="text-xs font-bold text-sky-600">LKR {Number(listing.price).toLocaleString()}</span>}
              {!listing.price && <span className="text-xs font-semibold text-emerald-500">Free</span>}
            </div>
            {listing.placeName && <p className="text-sm text-slate-500 mt-2">📍 {listing.placeName}</p>}
            {listing.startDateTime && (
              <p className="text-sm text-slate-500">
                🗓 {new Date(listing.startDateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Description</h3>
            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>

          {/* Rejection reason (if rejected) */}
          {listing.status === "REJECTED" && listing.rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <p className="text-xs font-bold text-red-700 mb-1">Rejection Reason</p>
              <p className="text-sm text-red-600">{listing.rejectionReason}</p>
            </div>
          )}

          {/* Host */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Host</h3>
            <p className="text-sm text-slate-700 font-semibold">
              {host?.email ?? <span className="font-mono text-slate-400">{listing.createdBy}</span>}
            </p>
            {host?.email && <p className="text-[10px] text-slate-300 font-mono">{listing.createdBy}</p>}
          </div>

          {/* AI Review */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">AI Content Review</h3>
            <AIReviewPanel listing={listing} />
          </div>

          {/* Map */}
          {hasCoords && (
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Location</h3>
              <MiniMap lat={listing.lat!} lng={listing.lng!} />
            </div>
          )}

          {/* Moderation actions */}
          <div className="border-t border-slate-100 pt-4 space-y-3">
            {/* PENDING: Approve + Reject */}
            {listing.status === "PENDING" && !showRejectForm && (
              <div className="flex gap-3">
                <Button
                  className="flex-1"
                  disabled={approving || rejecting}
                  onClick={() => approve({ variables: { id: listing.id } })}
                >
                  {approving ? "Approving…" : "✅ Approve"}
                </Button>
                <Button
                  variant="ghost"
                  className="flex-1 border border-red-200 text-red-500"
                  disabled={approving || rejecting}
                  onClick={() => setShowRejectForm(true)}
                >
                  ❌ Reject
                </Button>
              </div>
            )}

            {/* APPROVED: Take Down */}
            {listing.status === "APPROVED" && !showRejectForm && (
              <div className="flex gap-3">
                <div className="flex-1 text-xs text-slate-400 italic flex items-center">Currently live and visible to travelers.</div>
                <Button
                  variant="ghost"
                  className="border border-red-200 text-red-500"
                  disabled={rejecting}
                  onClick={() => setShowRejectForm(true)}
                >
                  🚫 Take Down
                </Button>
              </div>
            )}

            {/* REJECTED: Re-approve */}
            {listing.status === "REJECTED" && !showRejectForm && (
              <div className="flex gap-3">
                <div className="flex-1 text-xs text-slate-400 italic flex items-center">This listing was rejected.</div>
                <Button
                  disabled={approving}
                  onClick={() => approve({ variables: { id: listing.id } })}
                >
                  {approving ? "Approving…" : "✅ Re-approve"}
                </Button>
                <Button
                  variant="ghost"
                  className="border border-amber-200 text-amber-600"
                  onClick={() => setShowRejectForm(true)}
                >
                  ✏️ Re-reject
                </Button>
              </div>
            )}

            {/* Reject form */}
            {showRejectForm && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
                <p className="text-sm font-bold text-red-700">
                  {listing.status === "APPROVED" ? "Reason for taking down" : "Reason for rejection"}
                </p>
                <Input
                  label=""
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Misleading content, safety concerns…"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={rejecting || !rejectReason.trim()}
                    onClick={() => reject({ variables: { id: listing.id, reason: rejectReason.trim() } })}
                  >
                    {rejecting ? "Saving…" : "Confirm"}
                  </Button>
                  <Button variant="ghost" onClick={() => { setShowRejectForm(false); setRejectReason(""); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type FilterStatus = "ALL" | "PENDING" | "APPROVED" | "REJECTED";

export function AdminAllListings() {
  const { data, loading, error, refetch } = useQuery<{ adminAllListings: Listing[] }>(ADMIN_ALL_LISTINGS, {
    fetchPolicy: "network-only",
  });
  const { data: usersData } = useQuery<{ adminAllUsers: UserRecord[] }>(ADMIN_ALL_USERS);

  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Listing | null>(null);

  const users = usersData?.adminAllUsers ?? [];
  const all = data?.adminAllListings ?? [];

  const filtered = all.filter((l) => {
    const matchStatus = filter === "ALL" || l.status === filter;
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    ALL: all.length,
    PENDING: all.filter((l) => l.status === "PENDING").length,
    APPROVED: all.filter((l) => l.status === "APPROVED").length,
    REJECTED: all.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <DashboardLayout
      title="All Listings"
      subtitle="Complete view of all platform listings"
      actions={
        <>
          <Button variant="ghost" onClick={() => refetch()} className="text-white">Refresh</Button>
          <Link to="/admin"><Button variant="ghost" className="text-white border border-white">Back</Button></Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl space-y-4">

        {/* Filter + search bar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {(["ALL", "PENDING", "APPROVED", "REJECTED"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition-colors ${
                  filter === f ? "bg-slate-800 text-white" : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {f} <span className="opacity-60">({counts[f]})</span>
              </button>
            ))}
          </div>
          <div className="ml-auto w-56">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        {loading && <div className="text-slate-500 font-bold">Loading listings…</div>}
        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-bold">{error.message}</div>}

        {!loading && filtered.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-400 font-semibold">No {filter !== "ALL" ? filter.toLowerCase() + " " : ""}listings found.</p>
          </Card>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((l) => {
            const host = users.find((u) => u.firebaseUid === l.createdBy);
            return (
              <Card
                key={l.id}
                className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
                onClick={() => setSelected(l)}
              >
                {l.imageUrl && (
                  <img src={l.imageUrl} alt={l.title} className="w-full h-36 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h6 className="text-base font-bold text-slate-700 leading-snug line-clamp-2">{l.title}</h6>
                  <StatusPill status={l.status} />
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase">{l.type}</span>
                  {l.category && <span className="text-[10px] text-slate-400 font-semibold uppercase">{l.category}</span>}
                  {l.price && <span className="text-[10px] font-bold text-sky-500 ml-auto">LKR {Number(l.price).toLocaleString()}</span>}
                </div>
                {l.placeName && <p className="text-xs text-slate-400 mb-1">📍 {l.placeName}</p>}
                {l.startDateTime && (
                  <p className="text-xs text-slate-400 mb-1">
                    🗓 {new Date(l.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                )}
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-1">{l.description}</p>
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">
                    {host?.email ?? l.createdBy ?? "Unknown host"}
                  </span>
                  <span className="text-[10px] text-brand-500 font-semibold">View details →</span>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {selected && (
        <ListingDetailModal
          listing={selected}
          users={users}
          onClose={() => setSelected(null)}
          onRefetch={refetch}
        />
      )}
    </DashboardLayout>
  );
}
