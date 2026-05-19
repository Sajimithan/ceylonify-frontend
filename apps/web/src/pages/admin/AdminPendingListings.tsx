import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { APPROVE_LISTING, PENDING_LISTINGS, REJECT_LISTING } from "./moderation.gql";

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  lat?: number;
  lng?: number;
  createdBy?: string;
  imageUrl?: string;
};

type PendingListingsData = {
  pendingListings: Listing[];
};

export function AdminPendingListings() {
  const { data, loading, error, refetch } = useQuery<PendingListingsData>(
    PENDING_LISTINGS,
    { fetchPolicy: "network-only" }
  );
  const listings = useMemo(() => data?.pendingListings ?? [], [data]);

  const [approveListing, { loading: approving }] = useMutation(APPROVE_LISTING);
  const [rejectListing, { loading: rejecting }] = useMutation(REJECT_LISTING);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  async function onApprove(id: string) {
    setActionError(null);
    try {
      await approveListing({ variables: { id } });
      await refetch();
    } catch (e: unknown) {
      const err = e as Error;
      setActionError(err.message ?? "Failed to approve listing");
    }
  }

  async function onRejectSubmit() {
    if (!rejectId) return;
    const reason = rejectReason.trim();
    if (!reason) return;
    setActionError(null);
    try {
      await rejectListing({ variables: { id: rejectId, reason } });
      setRejectId(null);
      setRejectReason("");
      await refetch();
    } catch (e: unknown) {
      const err = e as Error;
      setActionError(err.message ?? "Failed to reject listing");
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
        {loading ? (
          <div className="text-sm text-slate-500 font-semibold mb-4">
            Loading pending listings...
          </div>
        ) : null}

        {(error || actionError) ? (
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
        ) : null}

        {!loading && listings.length === 0 ? (
          <Card className="text-center py-10">
            <div className="text-lg text-slate-500 font-bold mb-2">No pending listings 🎉</div>
            <p className="text-sm text-slate-400">All submissions have been reviewed.</p>
          </Card>
        ) : null}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h6 className="text-lg font-bold text-slate-700 capitalize">{l.title}</h6>
                  <div className="mt-1 text-xs font-bold uppercase text-slate-400">{l.type}</div>
                </div>
                <Badge value={l.status} />
              </div>

              {l.imageUrl && (
                <img
                  src={l.imageUrl}
                  alt={l.title}
                  className="w-full h-40 object-cover mt-2 mb-3 rounded shadow-sm opacity-95 transition-opacity hover:opacity-100"
                />
              )}

              <p className="mt-4 mb-4 line-clamp-3 text-sm font-light leading-relaxed text-slate-600">
                {l.description}
              </p>

              <div className="mt-auto pt-4 border-t border-slate-200 flex flex-col justify-between">
                <div className="text-xs font-semibold text-slate-400 mb-4">
                  Created: {new Date(l.createdAt).toLocaleDateString()}
                  <br />
                  <span className="text-[10px] font-mono">Host: {l.createdBy ?? "Unknown"}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={approving || rejecting}
                      onClick={() => onApprove(l.id)}
                      className="!px-3 !py-1 !text-[11px]"
                    >
                      {approving ? "Approving…" : "✓ Approve"}
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={approving || rejecting}
                      className="!px-3 !py-1 !text-[11px] text-red-500 border border-red-100"
                      onClick={() => {
                        setRejectId(l.id);
                        setRejectReason("");
                        setActionError(null);
                      }}
                    >
                      ✕ Reject
                    </Button>
                  </div>

                  {rejectId === l.id && (
                    <div className="mt-2 rounded bg-white p-3 border border-red-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-600 mb-2">Provide Reason</div>
                      <Input
                        label=""
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Missing location / suspicious content"
                      />
                      <div className="mt-3 flex gap-2">
                        <Button
                          variant="danger"
                          className="!px-3 !py-1 !text-[10px]"
                          disabled={rejecting || !rejectReason.trim()}
                          onClick={onRejectSubmit}
                        >
                          {rejecting ? "Rejecting…" : "Confirm Reject"}
                        </Button>
                        <Button
                          variant="ghost"
                          className="!px-3 !py-1 !text-[10px]"
                          onClick={() => {
                            setRejectId(null);
                            setRejectReason("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
