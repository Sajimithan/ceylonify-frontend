import { DashboardLayout } from "../../layouts/DashboardLayout";

export function AdminAuditLogs() {
  return (
    <DashboardLayout
      title="Audit Logs"
      subtitle="Admin action history"
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-bold text-slate-600 mb-2">
            Audit Log Coming Soon
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            The audit log system is not yet implemented. When active, admin
            actions such as approvals, rejections, role changes, and AI content
            flags will be recorded here.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
