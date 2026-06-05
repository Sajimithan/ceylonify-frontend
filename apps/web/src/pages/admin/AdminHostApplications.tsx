import { useState } from "react";
import { useCallback } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useSmartPoll } from "../../hooks/useSmartPoll";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { MAPS_LIBRARIES } from "../../lib/googleMaps";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Card } from "../../ui/Card";
import {
  ADMIN_PENDING_HOST_APPLICATIONS,
  ADMIN_REVIEW_HOST_APPLICATION,
} from "./host-applications.gql";

type HostApplication = {
  id: string;
  firebaseUid: string;
  email?: string;
  hostTypes: string;
  businessName?: string;
  businessAddress?: string;
  businessLat?: number;
  businessLng?: number;
  phoneNumber?: string;
  licenseNumber?: string;
  idType?: string;
  idDocumentUrl?: string;
  businessDocUrl?: string;
  healthCertUrl?: string;
  licenseDocUrl?: string;
  bankDocUrl?: string;
  status: string;
  submittedAt: string;
  reviewNote?: string;
};

const HOST_TYPE_LABELS: Record<string, string> = {
  EVENT_ORGANIZER: "Event Organizer",
  ACCOMMODATION: "Accommodation",
  RENTAL: "Rental",
  RESTAURANT: "Restaurant",
  ACTIVITY: "Activity",
};

function DocLink({ url, label }: { url?: string; label: string }) {
  if (!url) return <span className="text-slate-400 text-xs italic">Not provided</span>;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs font-semibold text-brand-600 hover:text-brand-800 underline underline-offset-2"
    >
      View {label}
    </a>
  );
}

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string,
    libraries: MAPS_LIBRARIES,
  });
  const center = { lat, lng };
  const onLoad = useCallback(() => {}, []);

  if (!isLoaded) {
    return <div className="w-full h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">Loading map…</div>;
  }

  return (
    <GoogleMap
      mapContainerClassName="w-full h-40 rounded-xl shadow"
      center={center}
      zoom={14}
      onLoad={onLoad}
      options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false, zoomControl: false }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
}

function ApplicationCard({
  app,
  onReview,
  reviewing,
}: {
  app: HostApplication;
  onReview: (firebaseUid: string, approve: boolean, note?: string) => Promise<void>;
  reviewing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const hostTypes: string[] = (() => {
    try { return JSON.parse(app.hostTypes) as string[]; } catch { return [app.hostTypes]; }
  })();

  const hasCoords = app.businessLat != null && app.businessLng != null;

  return (
    <Card>
      {/* Summary row */}
      <div
        className="flex items-start justify-between gap-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-800 text-sm truncate">
            {app.businessName || app.email || app.firebaseUid}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{app.email}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {hostTypes.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-100 text-brand-700 uppercase tracking-wide"
              >
                {HOST_TYPE_LABELS[t] ?? t}
              </span>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Submitted: {new Date(app.submittedAt).toLocaleString()}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
            PENDING
          </span>
          {expanded
            ? <ChevronUpIcon className="w-4 h-4 text-slate-400" />
            : <ChevronDownIcon className="w-4 h-4 text-slate-400" />
          }
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
          {/* Business info */}
          <div className="grid grid-cols-2 gap-3">
            {app.businessAddress && (
              <div className="col-span-2 bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Business Address</div>
                <div className="text-sm text-slate-700">📍 {app.businessAddress}</div>
              </div>
            )}
            {app.phoneNumber && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">Phone</div>
                <div className="text-sm font-semibold text-slate-700">{app.phoneNumber}</div>
              </div>
            )}
            {app.licenseNumber && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">License No.</div>
                <div className="text-sm font-semibold text-slate-700">{app.licenseNumber}</div>
              </div>
            )}
            {app.idType && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">ID Type</div>
                <div className="text-sm font-semibold text-slate-700">{app.idType.replace(/_/g, " ")}</div>
              </div>
            )}
          </div>

          {/* Map */}
          {hasCoords && (
            <div>
              <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Business Location</div>
              <MiniMap lat={app.businessLat!} lng={app.businessLng!} />
            </div>
          )}

          {/* Documents */}
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">Submitted Documents</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { url: app.idDocumentUrl, label: "ID Document" },
                { url: app.bankDocUrl, label: "Bank Document" },
                { url: app.businessDocUrl, label: "Business Reg." },
                { url: app.healthCertUrl, label: "Health Cert" },
                { url: app.licenseDocUrl, label: "License Doc" },
              ].map(({ url, label }) => (
                <div key={label} className="bg-slate-50 rounded-xl px-3 py-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{label}</div>
                  <DocLink url={url} label={label} />
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-slate-100 pt-4">
            {!showReject ? (
              <div className="flex gap-3 flex-wrap">
                <Button
                  disabled={reviewing}
                  onClick={() => onReview(app.firebaseUid, true)}
                  className="flex-1"
                >
                  {reviewing ? "Processing…" : "✓ Activate Host Account"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={reviewing}
                  className="flex-1 text-red-500 border border-red-200 hover:bg-red-50"
                  onClick={() => setShowReject(true)}
                >
                  ✕ Reject Application
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-600">Rejection reason (optional)</div>
                <Input
                  label=""
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="e.g. Incomplete documents — missing bank statement"
                />
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    disabled={reviewing}
                    onClick={() => onReview(app.firebaseUid, false, rejectNote || undefined)}
                    className="flex-1"
                  >
                    {reviewing ? "Processing…" : "Confirm Reject"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setShowReject(false); setRejectNote(""); }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function AdminHostApplications() {
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<{ adminPendingHostApplications: HostApplication[] }>(
    ADMIN_PENDING_HOST_APPLICATIONS,
    { fetchPolicy: "cache-and-network" }
  );
  useSmartPoll(startPolling, stopPolling, 10_000);

  const [reviewApplication, { loading: reviewing }] = useMutation(ADMIN_REVIEW_HOST_APPLICATION);
  const [actionError, setActionError] = useState<string | null>(null);

  const apps = data?.adminPendingHostApplications ?? [];

  async function onReview(firebaseUid: string, approve: boolean, reviewNote?: string) {
    setActionError(null);
    try {
      await reviewApplication({ variables: { firebaseUid, approve, reviewNote } });
      await refetch();
    } catch (e: unknown) {
      setActionError((e as Error).message ?? "Action failed");
    }
  }

  return (
    <DashboardLayout
      title="Host Applications"
      subtitle="Review pending host registration requests"
      actions={
        <Button variant="ghost" onClick={() => refetch()} className="text-white">
          Refresh
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-4xl">
        {loading && !data && (
          <div className="text-sm text-slate-500 font-semibold mb-4">Loading applications…</div>
        )}

        {(error || actionError) && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-bold text-red-700 mb-4 flex justify-between">
            <span>{error?.message ?? actionError}</span>
            {actionError && (
              <button className="text-red-400 hover:text-red-600 font-bold text-xs" onClick={() => setActionError(null)}>
                ✕
              </button>
            )}
          </div>
        )}

        {!loading && apps.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-2xl mb-2">🎉</div>
            <div className="text-slate-500 font-bold">No pending host applications</div>
            <div className="text-xs text-slate-400 mt-1">All applications have been reviewed.</div>
          </Card>
        )}

        <div className="space-y-4">
          {apps.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onReview={onReview}
              reviewing={reviewing}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
