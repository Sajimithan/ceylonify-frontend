import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Card } from "../../ui/Card";
import { Button } from "../../ui/Button";
import { ADMIN_STATS } from "./admin.gql";

type StatsData = {
  adminListingStats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  adminUserStats: {
    total: number;
    travelers: number;
    hosts: number;
    admins: number;
  };
};

export function AdminOverview() {
  const { data, loading, error, refetch } = useQuery<StatsData>(ADMIN_STATS, {
    fetchPolicy: "network-only",
  });

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="Overview of platform metrics"
      actions={
        <>
          <Button variant="ghost" onClick={() => refetch()} className="text-white">
            Refresh Data
          </Button>
          <Link to="/admin/pending">
            <Button variant="ghost" className="text-white border border-white">
              Pending Queue
            </Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && <div className="text-slate-500 font-bold mb-4">Loading stats...</div>}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-bold mb-4 border border-red-200">
            {error.message}
          </div>
        )}

        {data && (
          <div className="grid gap-6 md:grid-cols-2">
            
            {/* Listings Stats */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                  Listings Overview
                </h6>
                <Link to="/admin/listings">
                  <Button variant="ghost" className="!px-3 !py-1 text-sky-600 text-xs shadow-none">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded shadow-sm text-center">
                  <div className="text-3xl font-bold text-slate-700">{data.adminListingStats.total}</div>
                  <div className="text-xs uppercase font-bold text-slate-400 mt-1">Total</div>
                </div>
                <div className="p-4 bg-yellow-50 rounded shadow-sm text-center border-b-4 border-yellow-400">
                  <div className="text-3xl font-bold text-yellow-600">{data.adminListingStats.pending}</div>
                  <div className="text-xs uppercase font-bold text-yellow-500 mt-1">Pending</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded shadow-sm text-center border-b-4 border-emerald-400">
                  <div className="text-3xl font-bold text-emerald-600">{data.adminListingStats.approved}</div>
                  <div className="text-xs uppercase font-bold text-emerald-500 mt-1">Approved</div>
                </div>
                <div className="p-4 bg-red-50 rounded shadow-sm text-center border-b-4 border-red-400">
                  <div className="text-3xl font-bold text-red-600">{data.adminListingStats.rejected}</div>
                  <div className="text-xs uppercase font-bold text-red-500 mt-1">Rejected</div>
                </div>
              </div>
            </Card>

            {/* Users Stats */}
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h6 className="text-slate-400 text-sm font-bold uppercase tracking-wider">
                  Users Overview
                </h6>
                <Link to="/admin/users">
                  <Button variant="ghost" className="!px-3 !py-1 text-sky-600 text-xs shadow-none">
                    View All
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded shadow-sm text-center">
                  <div className="text-3xl font-bold text-slate-700">{data.adminUserStats.total}</div>
                  <div className="text-xs uppercase font-bold text-slate-400 mt-1">Total Users</div>
                </div>
                <div className="p-4 bg-sky-50 rounded shadow-sm text-center border-b-4 border-sky-400">
                  <div className="text-3xl font-bold text-sky-600">{data.adminUserStats.travelers}</div>
                  <div className="text-xs uppercase font-bold text-sky-500 mt-1">Travelers</div>
                </div>
                <div className="p-4 bg-indigo-50 rounded shadow-sm text-center border-b-4 border-indigo-400">
                  <div className="text-3xl font-bold text-indigo-600">{data.adminUserStats.hosts}</div>
                  <div className="text-xs uppercase font-bold text-indigo-500 mt-1">Hosts</div>
                </div>
                <div className="p-4 bg-slate-800 rounded shadow-sm text-center border-b-4 border-slate-900">
                  <div className="text-3xl font-bold text-white">{data.adminUserStats.admins}</div>
                  <div className="text-xs uppercase font-bold text-slate-400 mt-1">Admins</div>
                </div>
              </div>
            </Card>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
