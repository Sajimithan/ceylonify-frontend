import { DashboardLayout } from "../../layouts/DashboardLayout";

export function AdminReports() {
  return (
    <DashboardLayout
      title="Reports"
      subtitle="User-submitted listing reports"
    >
      <div className="mx-auto w-full max-w-4xl">
        <div className="bg-white rounded-xl shadow p-10 text-center">
          <div className="text-4xl mb-4">🚩</div>
          <h2 className="text-lg font-bold text-slate-600 mb-2">
            Reports Coming Soon
          </h2>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            The reports system is not yet implemented. When active, flagged
            listings submitted by users will appear here for admin review.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
