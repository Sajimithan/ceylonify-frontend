import { useState } from "react";
import { gql } from "@apollo/client";
import { useMutation, useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";

const ADMIN_REPORTS = gql`
  query AdminReports {
    adminReports {
      id
      listingId
      reporterFirebaseUid
      reason
      comment
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
  status: "PENDING" | "DISMISSED" | "ACTIONED";
  createdAt: string;
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

export function AdminReports() {
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "DISMISSED" | "ACTIONED">("PENDING");
  const { data, loading, error, refetch } = useQuery<{ adminReports: Report[] }>(ADMIN_REPORTS);
  const [dismiss] = useMutation(DISMISS_REPORT, { onCompleted: () => refetch() });
  const [action] = useMutation(ACTION_REPORT, { onCompleted: () => refetch() });

  const reports = data?.adminReports ?? [];
  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  return (
    <DashboardLayout
      title="Reports"
      subtitle="User-submitted listing reports"
    >
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

        {loading && (
          <div className="text-center py-12 text-slate-400 font-semibold">Loading reports…</div>
        )}
        {error && (
          <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-800 font-bold">{error.message}</div>
        )}

        {!loading && filtered.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">🚩</div>
            <p className="text-slate-400 font-semibold">No {filter === "ALL" ? "" : filter.toLowerCase() + " "}reports.</p>
          </Card>
        )}

        {filtered.map((report) => (
          <Card key={report.id} className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <StatusBadge status={report.status} />
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(report.createdAt).toLocaleDateString("en-US", {
                      year: "numeric", month: "short", day: "numeric",
                    })}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-700 mb-0.5">
                  Reason: <span className="text-slate-600 font-semibold">{report.reason}</span>
                </p>
                {report.comment && (
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{report.comment}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Listing ID: <span className="font-mono">{report.listingId}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Reporter: <span className="font-mono">{report.reporterFirebaseUid}</span>
                </p>
              </div>

              {report.status === "PENDING" && (
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    onClick={() => dismiss({ variables: { reportId: report.id } })}
                  >
                    Dismiss
                  </Button>
                  <Button
                    onClick={() => action({ variables: { reportId: report.id } })}
                  >
                    Action
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
