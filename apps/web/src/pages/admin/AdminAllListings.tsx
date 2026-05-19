import { useQuery, useMutation } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { ADMIN_ALL_LISTINGS } from "./admin.gql";
import { APPROVE_LISTING, REJECT_LISTING } from "./moderation.gql";
import { useState } from "react";

type Listing = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  createdAt: string;
  createdBy?: string;
  imageUrl?: string;
};

type AllListingsData = {
  adminAllListings: Listing[];
};

export function AdminAllListings() {
  const { data, loading, error, refetch } = useQuery<AllListingsData>(ADMIN_ALL_LISTINGS, {
    fetchPolicy: "network-only",
  });

  const [approveListing, { loading: approving }] = useMutation(APPROVE_LISTING);
  const [rejectListing, { loading: rejecting }] = useMutation(REJECT_LISTING);

  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  async function onApprove(id: string) {
    await approveListing({ variables: { id } });
    await refetch();
  }

  async function onRejectSubmit() {
    if (!rejectId) return;
    const reason = rejectReason.trim();
    if (!reason) return;

    await rejectListing({ variables: { id: rejectId, reason } });
    setRejectId(null);
    setRejectReason("");
    await refetch();
  }

  return (
    <DashboardLayout
      title="All Listings"
      subtitle="Complete view of all platform listings"
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
        {loading && <div className="text-slate-500 font-bold mb-4">Loading listings...</div>}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-bold mb-4">
            {error.message}
          </div>
        )}

        {data && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.adminAllListings.map((l) => (
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

                <div className="mt-auto pt-4 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-400 mb-4">
                    Created: {new Date(l.createdAt).toLocaleDateString()}
                    <br />
                    <span className="text-[10px]">Host UID: {l.createdBy || "Unknown"}</span>
                  </div>

                  {l.status === "PENDING" && (
                    <div className="flex flex-col gap-2">
                       <div className="flex flex-wrap gap-2">
                        <Button
                          disabled={approving || rejecting}
                          onClick={() => onApprove(l.id)}
                          className="!px-3 !py-1 !text-[11px]"
                        >
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={approving || rejecting}
                          className="!px-3 !py-1 !text-[11px] text-red-500 border border-red-100"
                          onClick={() => {
                            setRejectId(l.id);
                            setRejectReason("");
                          }}
                        >
                          Reject
                        </Button>
                      </div>

                      {/* Reject inline panel */}
                      {rejectId === l.id && (
                        <div className="mt-2 rounded bg-white p-3 border border-red-200 shadow-sm">
                          <div className="text-xs font-bold text-slate-600 mb-2">Provide Reason</div>
                          <Input
                            label=""
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g. Inappropriate content"
                          />
                          <div className="mt-3 flex gap-2">
                            <Button
                              variant="danger"
                              className="!px-3 !py-1 !text-[10px]"
                              disabled={rejecting || !rejectReason.trim()}
                              onClick={onRejectSubmit}
                            >
                              Confirm
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
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
