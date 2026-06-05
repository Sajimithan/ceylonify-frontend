import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSmartPoll } from "../../hooks/useSmartPoll";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { MAPS_LIBRARIES } from "../../lib/googleMaps";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import {
  APPROVE_LISTING,
  PENDING_LISTINGS,
  REJECT_LISTING,
  AI_REVIEW_LISTING,
} from "./moderation.gql";
import { ADMIN_ALL_USERS } from "./admin.gql";

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  category?: string;
  price?: string;
  startDateTime?: string;
  placeName?: string;
  status: string;
  isRepost?: boolean;
  suspensionReason?: string;
  createdAt: string;
  lat?: number;
  lng?: number;
  createdBy?: string;
  imageUrl?: string;
};

type UserRecord = {
  id: string;
  firebaseUid: string;
  email?: string;
  role: string;
};

type AIModerationResult = {
  safe: boolean;
  confidence: number;
  flags: string[];
  summary: string;
};

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });
  const center = { lat, lng };
  const onLoad = useCallback(() => {}, []);

  if (!isLoaded) {
    return (
      <div className="w-full h-48 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-48 rounded-xl shadow"
      center={center}
      zoom={14}
      onLoad={onLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
        zoomControl: false,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}

function AIReviewPanel({
  listing,
}: {
  listing: Listing;
}) {
  const [result, setResult] = useState<AIModerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiReviewListing] = useMutation<{ aiReviewListing: AIModerationResult }>(AI_REVIEW_LISTING);

  async function runReview() {
    setLoading(true);
    try {
      const res = await aiReviewListing({
        variables: { title: listing.title, description: listing.description },
      });
      if (res.data) setResult(res.data.aiReviewListing);
    } catch {
      setResult({ safe: true, confidence: 0, flags: [], summary: "AI review failed. Please review manually." });
    } finally {
      setLoading(false);
    }
  }

  if (!result && !loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase text-slate-500 mb-0.5">AI Content Review</div>
          <div className="text-xs text-slate-400">Run automated safety scan before moderating</div>
        </div>
        <button
          onClick={runReview}
          className="px-4 py-2 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors flex-shrink-0"
        >
          ✨ Run AI Review
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-4 flex items-center gap-3">
        <div className="w-4 h-4 border-2 border-violet-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
        <span className="text-xs font-semibold text-violet-700">AI is analyzing content…</span>
      </div>
    );
  }

  if (!result) return null;

  const signal = result.safe
    ? { color: "bg-emerald-100 border-emerald-300", text: "text-emerald-700", pill: "bg-emerald-500", label: "SAFE TO APPROVE" }
    : result.confidence > 0.7
    ? { color: "bg-red-100 border-red-300", text: "text-red-700", pill: "bg-red-500", label: "VIOLATION DETECTED" }
    : { color: "bg-amber-100 border-amber-300", text: "text-amber-700", pill: "bg-amber-500", label: "CAUTION — REVIEW CAREFULLY" };

  return (
    <div className={`rounded-xl border p-4 ${signal.color}`}>
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${signal.pill} flex-shrink-0`} />
          <span className={`text-xs font-bold uppercase tracking-wide ${signal.text}`}>
            AI Review: {signal.label}
          </span>
        </div>
        <span className={`text-xs font-semibold ${signal.text}`}>
          {Math.round(result.confidence * 100)}% confidence
        </span>
      </div>

      {result.flags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {result.flags.map((f) => (
            <span
              key={f}
              className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-200 text-red-700 uppercase tracking-wide"
            >
              {f.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <p className={`text-xs leading-relaxed ${signal.text}`}>{result.summary}</p>

      <button
        onClick={runReview}
        className={`mt-2 text-[10px] font-semibold underline underline-offset-2 ${signal.text} opacity-70 hover:opacity-100`}
      >
        Re-run review
      </button>
    </div>
  );
}

function ListingReviewModal({
  listing,
  users,
  onClose,
  onApprove,
  onReject,
  approving,
  rejecting,
}: {
  listing: Listing;
  users: UserRecord[];
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
  approving: boolean;
  rejecting: boolean;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const hostUser = users.find((u) => u.firebaseUid === listing.createdBy);
  const hasCoords = listing.lat != null && listing.lng != null && listing.lat !== 0;

  async function handleApprove() {
    await onApprove(listing.id);
    onClose();
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    await onReject(listing.id, rejectReason.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{listing.title}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {listing.isRepost ? (
                <span className="text-xs font-bold inline-block py-1 px-2 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">
                  Re-submitted
                </span>
              ) : (
                <Badge value={listing.status} />
              )}
              <span className="text-xs font-bold uppercase text-slate-400">{listing.type}</span>
              {listing.category && (
                <span className="text-xs text-slate-400">
                  · {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0 p-1 rounded-lg hover:bg-slate-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* AI Review */}
          <AIReviewPanel listing={listing} />

          {/* Image */}
          {listing.imageUrl && (
            <img
              src={listing.imageUrl}
              alt={listing.title}
              className="w-full h-52 object-cover rounded-xl shadow"
            />
          )}

          {/* Description */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5">Description</div>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Previous suspension reason — shown for re-submitted listings */}
          {listing.isRepost && listing.suspensionReason && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
              <p className="text-xs font-bold text-orange-700 mb-1">⚠️ Previous Suspension Reason</p>
              <p className="text-sm text-orange-700 leading-relaxed">{listing.suspensionReason}</p>
              <p className="text-[10px] text-orange-400 mt-1.5">The host has edited and resubmitted this listing after it was suspended.</p>
            </div>
          )}

          {/* Metadata grid */}
          <div className="grid grid-cols-2 gap-3">
            {listing.price && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Price</div>
                <div className="text-sm font-bold text-brand-600">
                  LKR {Number(listing.price).toLocaleString()}
                </div>
              </div>
            )}
            {listing.startDateTime && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Date & Time</div>
                <div className="text-sm font-semibold text-slate-700">
                  {new Date(listing.startDateTime).toLocaleString()}
                </div>
              </div>
            )}
            {listing.placeName && (
              <div className="bg-slate-50 rounded-xl p-3 col-span-2">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Location</div>
                <div className="text-sm font-semibold text-slate-700">📍 {listing.placeName}</div>
              </div>
            )}
          </div>

          {/* Host info */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Host Details</div>
            <div className="text-sm font-semibold text-slate-700">
              {hostUser?.email ?? "Unknown host"}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              UID: {listing.createdBy ?? "—"}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Submitted: {new Date(listing.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Map */}
          {hasCoords && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Pin Location</div>
              <MiniMap lat={listing.lat!} lng={listing.lng!} />
            </div>
          )}

          {/* Actions */}
          <div className="border-t border-slate-100 pt-4">
            {!showReject ? (
              <div className="flex gap-3 flex-wrap">
                <Button
                  disabled={approving || rejecting}
                  onClick={handleApprove}
                  className="flex-1"
                >
                  {approving ? "Approving…" : "✓ Approve Listing"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={approving || rejecting}
                  className="flex-1 text-red-500 border border-red-200 hover:bg-red-50"
                  onClick={() => setShowReject(true)}
                >
                  ✕ Reject
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-600">Rejection reason (required)</div>
                <Input
                  label=""
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="e.g. Missing location details / contains prohibited content"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={rejecting || !rejectReason.trim()}
                    onClick={handleReject}
                    className="flex-1"
                  >
                    {rejecting ? "Rejecting…" : "Confirm Reject"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setShowReject(false); setRejectReason(""); }}
                  >
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

export function AdminPendingListings() {
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<{ pendingListings: Listing[] }>(
    PENDING_LISTINGS,
    { fetchPolicy: "cache-and-network" }
  );
  useSmartPoll(startPolling, stopPolling, 10_000);
  const { data: usersData } = useQuery<{ adminAllUsers: UserRecord[] }>(ADMIN_ALL_USERS);
  const listings = useMemo(() => data?.pendingListings ?? [], [data]);
  const users = useMemo(() => usersData?.adminAllUsers ?? [], [usersData]);

  const [approveListing, { loading: approving }] = useMutation(APPROVE_LISTING);
  const [rejectListing, { loading: rejecting }] = useMutation(REJECT_LISTING);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function onApprove(id: string) {
    setActionError(null);
    try {
      await approveListing({ variables: { id } });
      await refetch();
    } catch (e: unknown) {
      setActionError((e as Error).message ?? "Failed to approve listing");
    }
  }

  async function onReject(id: string, reason: string) {
    setActionError(null);
    try {
      await rejectListing({ variables: { id, reason } });
      await refetch();
    } catch (e: unknown) {
      setActionError((e as Error).message ?? "Failed to reject listing");
    }
  }

  return (
    <DashboardLayout
      title="Admin Moderation"
      subtitle="Review pending listings"
      actions={
        <>
          <Button variant="ghost" onClick={() => refetch()} className="text-white">
            Refresh
          </Button>
          <Link to="/admin">
            <Button variant="ghost" className="text-white border border-white">
              Back to Overview
            </Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && !data && (
          <div className="text-sm text-slate-500 font-semibold mb-4">
            Loading pending listings…
          </div>
        )}

        {(error || actionError) && (
          <div className="rounded bg-red-100 p-4 text-sm font-bold text-red-800 shadow mb-4 flex justify-between items-center">
            <span>{error?.message ?? actionError}</span>
            {actionError && (
              <button
                className="ml-4 text-red-500 hover:text-red-700 text-xs font-bold"
                onClick={() => setActionError(null)}
              >
                ✕ Dismiss
              </button>
            )}
          </div>
        )}

        {!loading && listings.length === 0 && (
          <Card className="text-center py-10">
            <div className="text-lg text-slate-500 font-bold mb-2">No pending listings 🎉</div>
            <p className="text-sm text-slate-400">All submissions have been reviewed.</p>
          </Card>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => {
            const hostUser = users.find((u) => u.firebaseUid === l.createdBy);
            return (
              <Card
                key={l.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedListing(l)}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <h6 className="text-base font-bold text-slate-700">{l.title}</h6>
                    <div className="mt-0.5 text-xs font-bold uppercase text-slate-400">{l.type}</div>
                  </div>
                  {l.isRepost ? (
                    <span className="text-xs font-bold inline-block py-1 px-2 rounded bg-violet-100 text-violet-700 uppercase tracking-wide">
                      Re-submitted
                    </span>
                  ) : (
                    <Badge value={l.status} />
                  )}
                </div>

                {l.imageUrl && (
                  <img
                    src={l.imageUrl}
                    alt={l.title}
                    className="w-full h-36 object-cover mt-2 mb-3 rounded-lg shadow-sm"
                  />
                )}

                <p className="mt-2 mb-3 line-clamp-2 text-sm font-light leading-relaxed text-slate-600">
                  {l.description}
                </p>

                <div className="mt-auto pt-3 border-t border-slate-100">
                  <div className="text-xs text-slate-400">
                    <span className="font-semibold">
                      {hostUser?.email ?? l.createdBy?.slice(0, 12) ?? "Unknown host"}
                    </span>
                    <span className="mx-1.5">·</span>
                    {new Date(l.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-brand-600 flex items-center gap-1">
                    <span>Click to review →</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {selectedListing && (
        <ListingReviewModal
          listing={selectedListing}
          users={users}
          onClose={() => setSelectedListing(null)}
          onApprove={onApprove}
          onReject={onReject}
          approving={approving}
          rejecting={rejecting}
        />
      )}
    </DashboardLayout>
  );
}
