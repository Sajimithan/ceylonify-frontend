import { useState, useEffect } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ADMIN_ALL_USERS } from "./admin.gql";
import { GET_LISTING_DETAIL } from "../browse.gql";

const ADMIN_REPORTS = gql`
  query AdminReports {
    adminReports {
      id
      listingId
      reporterFirebaseUid
      reason
      comment
      imageUrls
      status
      createdAt
    }
  }
`;

const DISMISS_REPORT = gql`
  mutation AdminDismissReport($reportId: ID!) {
    adminDismissReport(reportId: $reportId)
  }
`;

const ACTION_REPORT = gql`
  mutation AdminActionReport($reportId: ID!) {
    adminActionReport(reportId: $reportId)
  }
`;

type Report = {
  id: string;
  listingId: string;
  reporterFirebaseUid: string;
  reason: string;
  comment?: string;
  imageUrls?: string[];
  status: "PENDING" | "DISMISSED" | "ACTIONED";
  createdAt: string;
};

type UserRecord = { firebaseUid: string; email?: string; displayName?: string };
type ListingDetail = {
  id: string; title: string; description: string; type: string; category?: string;
  price?: string; placeName?: string; startDateTime?: string; imageUrl?: string;
  hostFirebaseUid?: string; createdBy?: string;
};

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "PENDING"
      ? "text-amber-700 bg-amber-100"
      : status === "DISMISSED"
      ? "text-slate-500 bg-slate-100"
      : "text-emerald-700 bg-emerald-100";
  return (
    <span className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded ${cls}`}>
      {status}
    </span>
  );
}

function ReportDetailModal({
  report,
  users,
  onClose,
  onDismiss,
  onAction,
  actioning,
}: {
  report: Report;
  users: UserRecord[];
  onClose: () => void;
  onDismiss: () => void;
  onAction: () => void;
  actioning?: boolean;
}) {
  const [fetchListing, { data: listingData, loading: listingLoading }] = useLazyQuery<{ listing: ListingDetail }>(GET_LISTING_DETAIL);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  useEffect(() => {
    fetchListing({ variables: { id: report.listingId } });
  }, [report.listingId]);

  const listing = listingData?.listing;
  const reporter = users.find((u) => u.firebaseUid === report.reporterFirebaseUid);
  const host = listing
    ? users.find((u) => u.firebaseUid === (listing as any).createdBy || u.firebaseUid === (listing as any).hostFirebaseUid)
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="text-xs text-slate-400 font-medium">
              {new Date(report.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 transition-colors">
            <XMarkIcon className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Listing section */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Reported Listing</h3>
            {listingLoading && <div className="text-xs text-slate-400">Loading listing details…</div>}
            {listing && (
              <div className="flex gap-3 bg-slate-50 rounded-xl p-3">
                {listing.imageUrl && (
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-24 h-20 object-cover rounded-lg shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{listing.title}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {listing.type && (
                      <span className="text-[10px] bg-brand-100 text-brand-700 font-bold px-2 py-0.5 rounded-full uppercase">
                        {listing.type}
                      </span>
                    )}
                    {listing.category && (
                      <span className="text-[10px] text-slate-500 font-semibold uppercase">{listing.category}</span>
                    )}
                    {listing.price && (
                      <span className="text-[10px] font-bold text-sky-600">LKR {Number(listing.price).toLocaleString()}</span>
                    )}
                  </div>
                  {listing.placeName && (
                    <p className="text-xs text-slate-500 mt-1">📍 {listing.placeName}</p>
                  )}
                  {listing.startDateTime && (
                    <p className="text-xs text-slate-500">
                      🗓 {new Date(listing.startDateTime).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                  {host && (
                    <p className="text-xs text-slate-400 mt-1">
                      Host: <span className="font-semibold text-slate-600">{host.email ?? host.firebaseUid}</span>
                    </p>
                  )}
                  <p className="text-[10px] text-slate-300 mt-0.5 font-mono">{report.listingId}</p>
                </div>
              </div>
            )}
            {!listing && !listingLoading && (
              <p className="text-xs text-slate-400 font-mono">{report.listingId}</p>
            )}
          </div>

          {/* Report details */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Report Details</h3>
            <div className="bg-red-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-bold text-slate-700">
                Reason: <span className="text-red-700">{report.reason}</span>
              </p>
              {report.comment && (
                <p className="text-sm text-slate-600 whitespace-pre-wrap">{report.comment}</p>
              )}
            </div>
          </div>

          {/* Evidence images */}
          {(report.imageUrls?.length ?? 0) > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Evidence Photos</h3>
              <div className="flex gap-2 flex-wrap">
                {report.imageUrls!.map((url, i) => (
                  <button key={i} onClick={() => setLightboxImg(url)} className="focus:outline-none">
                    <img
                      src={url}
                      alt={`evidence-${i + 1}`}
                      className="w-24 h-20 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reporter */}
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-1">Reporter</h3>
            <p className="text-sm text-slate-700 font-semibold">
              {reporter?.email ?? <span className="font-mono text-slate-400">{report.reporterFirebaseUid}</span>}
            </p>
            {reporter?.email && (
              <p className="text-[10px] text-slate-400 font-mono">{report.reporterFirebaseUid}</p>
            )}
          </div>

          {/* Actions */}
          {report.status === "PENDING" && (
            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <Button variant="ghost" className="flex-1" onClick={onDismiss} disabled={actioning}>
                Dismiss
              </Button>
              <Button className="flex-1" onClick={onAction} disabled={actioning}>
                {actioning ? "Opening chat…" : "Take Action"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-black/80"
          onClick={() => setLightboxImg(null)}
        >
          <img src={lightboxImg} alt="evidence" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" />
        </div>
      )}
    </div>
  );
}

export function AdminReports() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DISMISSED" | "ACTIONED">("PENDING");
  const [selected, setSelected] = useState<Report | null>(null);
  const [actioning, setActioning] = useState(false);

  const { data, loading, error, refetch } = useQuery<{ adminReports: Report[] }>(ADMIN_REPORTS);
  const { data: usersData } = useQuery<{ adminAllUsers: UserRecord[] }>(ADMIN_ALL_USERS);
  const [dismiss] = useMutation(DISMISS_REPORT, { onCompleted: () => { refetch(); setSelected(null); } });
  const [action] = useMutation<{ adminActionReport: string | null }>(ACTION_REPORT);

  const handleTakeAction = async (report: Report) => {
    setActioning(true);
    try {
      const { data: result } = await action({ variables: { reportId: report.id } });
      await refetch();
      setSelected(null);
      const ticketId = result?.adminActionReport;
      if (ticketId) {
        navigate(`/admin/support?ticket=${ticketId}`);
      } else {
        navigate(`/admin/support?reportId=${report.id}`);
      }
    } finally {
      setActioning(false);
    }
  };

  const reports = data?.adminReports ?? [];
  const users = usersData?.adminAllUsers ?? [];
  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  return (
    <DashboardLayout title="Reports" subtitle="User-submitted listing reports">
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-2">
          {(["ALL", "PENDING", "DISMISSED", "ACTIONED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-colors ${
                filter === f
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-500 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading && <div className="text-center py-12 text-slate-400 font-semibold">Loading reports…</div>}
        {error && <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-800 font-bold">{error.message}</div>}

        {!loading && filtered.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">🚩</div>
            <p className="text-slate-400 font-semibold">
              No {filter === "ALL" ? "" : filter.toLowerCase() + " "}reports.
            </p>
          </Card>
        )}

        {filtered.map((report) => {
          const reporter = users.find((u) => u.firebaseUid === report.reporterFirebaseUid);
          return (
            <Card
              key={report.id}
              className="space-y-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelected(report)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <StatusBadge status={report.status} />
                    <span className="text-xs text-slate-400 font-medium">
                      {new Date(report.createdAt).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </span>
                    {(report.imageUrls?.length ?? 0) > 0 && (
                      <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
                        📎 {report.imageUrls!.length} photo{report.imageUrls!.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-700 mb-0.5">
                    Reason: <span className="text-slate-600 font-semibold">{report.reason}</span>
                  </p>
                  {report.comment && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{report.comment}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2 font-mono">{report.listingId}</p>
                  <p className="text-xs text-slate-400">
                    Reporter: <span className="font-semibold">{reporter?.email ?? report.reporterFirebaseUid}</span>
                  </p>
                </div>
                <div className="text-xs text-slate-300 font-semibold shrink-0">Click to review →</div>
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <ReportDetailModal
          report={selected}
          users={users}
          onClose={() => setSelected(null)}
          onDismiss={() => dismiss({ variables: { reportId: selected.id } })}
          onAction={() => void handleTakeAction(selected)}
          actioning={actioning}
        />
      )}
    </DashboardLayout>
  );
}
