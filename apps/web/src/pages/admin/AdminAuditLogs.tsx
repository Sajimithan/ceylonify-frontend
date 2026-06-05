import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { useSmartPoll } from "../../hooks/useSmartPoll";

const ADMIN_AUDIT_LOGS = gql`
  query AdminAuditLogs {
    adminAuditLogs {
      id
      action
      adminFirebaseUid
      adminEmail
      adminName
      resourceId
      details
      createdAt
    }
  }
`;

type AuditLog = {
  id: string;
  action: string;
  adminFirebaseUid: string;
  adminEmail?: string;
  adminName?: string;
  resourceId?: string;
  details?: string;
  createdAt: string;
};

function actionColor(action: string) {
  if (action.startsWith("APPROVE")) return "text-emerald-700 bg-emerald-100";
  if (action.startsWith("REJECT")) return "text-red-700 bg-red-100";
  if (action.startsWith("CHANGE")) return "text-violet-700 bg-violet-100";
  return "text-slate-600 bg-slate-100";
}

export function AdminAuditLogs() {
  const { data, loading, error, startPolling, stopPolling } = useQuery<{ adminAuditLogs: AuditLog[] }>(ADMIN_AUDIT_LOGS, {
    fetchPolicy: "cache-and-network",
  });
  useSmartPoll(startPolling, stopPolling, 30_000);

  const logs = data?.adminAuditLogs ?? [];

  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="Admin action history"
    >
      <div className="mx-auto w-full max-w-4xl space-y-3">
        {loading && !data && (
          <div className="text-center py-12 text-slate-400 font-semibold">Loading audit logs…</div>
        )}
        {error && (
          <div className="rounded bg-red-100 px-4 py-3 text-sm text-red-800 font-bold">{error.message}</div>
        )}

        {!loading && logs.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-slate-400 font-semibold">No admin actions recorded yet.</p>
          </Card>
        )}

        {logs.map((log) => (
          <Card key={log.id} className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={`text-xs font-bold inline-block py-1 px-2 uppercase rounded ${actionColor(log.action)}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {new Date(log.createdAt).toLocaleString("en-US", {
                    year: "numeric", month: "short", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {log.details && (
                <p className="text-sm text-slate-600 font-medium">{log.details}</p>
              )}
              <div className="mt-1 flex gap-4 flex-wrap">
                <p className="text-xs text-slate-400">
                  Admin:{" "}
                  <span className="font-semibold text-slate-500">
                    {log.adminName || log.adminEmail || log.adminFirebaseUid.slice(0, 8) + "…"}
                  </span>
                  {log.adminName && log.adminEmail && (
                    <span className="text-slate-400"> ({log.adminEmail})</span>
                  )}
                </p>
                {log.resourceId && (
                  <p className="text-xs text-slate-400">
                    Resource: <span className="font-mono">{log.resourceId}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
