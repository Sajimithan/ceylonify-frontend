import { useQuery } from "@apollo/client/react";
import { useSmartPoll } from "../../hooks/useSmartPoll";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BuildingOffice2Icon,
  ClockIcon,
  CheckCircleIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
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
  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery<StatsData>(ADMIN_STATS, {
    fetchPolicy: "cache-and-network",
  });
  useSmartPoll(startPolling, stopPolling, 15_000);

  const listingChartData = data
    ? [
        { name: "Approved", value: data.adminListingStats.approved, fill: "#10b981" },
        { name: "Pending",  value: data.adminListingStats.pending,  fill: "#f59e0b" },
        { name: "Rejected", value: data.adminListingStats.rejected, fill: "#ef4444" },
      ]
    : [];

  const userChartData = data
    ? [
        { name: "Travelers", value: data.adminUserStats.travelers, fill: "#0ea5e9" },
        { name: "Hosts",     value: data.adminUserStats.hosts,     fill: "#8b5cf6" },
        { name: "Admins",    value: data.adminUserStats.admins,    fill: "#0f172a" },
      ]
    : [];

  const kpiCards = data
    ? [
        {
          label: "Total Listings",
          value: data.adminListingStats.total,
          Icon: BuildingOffice2Icon,
          iconBg: "bg-brand-100",
          iconColor: "text-brand-600",
          valueColor: "text-brand-700",
          border: "border-t-brand-500",
        },
        {
          label: "Pending Review",
          value: data.adminListingStats.pending,
          Icon: ClockIcon,
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          valueColor: "text-amber-700",
          border: "border-t-amber-500",
        },
        {
          label: "Total Users",
          value: data.adminUserStats.total,
          Icon: UsersIcon,
          iconBg: "bg-indigo-100",
          iconColor: "text-indigo-600",
          valueColor: "text-indigo-700",
          border: "border-t-indigo-500",
        },
        {
          label: "Approved Listings",
          value: data.adminListingStats.approved,
          Icon: CheckCircleIcon,
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          valueColor: "text-emerald-700",
          border: "border-t-emerald-500",
        },
      ]
    : [];

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
            <Button variant="ghost" className="text-white border border-white/40">
              Pending Queue
            </Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && !data && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400 font-semibold mb-6">
            Loading stats…
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 font-bold mb-6 border border-red-200">
            {error.message}
          </div>
        )}

        {data && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {kpiCards.map((card) => (
                <div
                  key={card.label}
                  className={`bg-white rounded-xl shadow p-5 border-t-4 ${card.border}`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.iconBg}`}
                  >
                    <card.Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  <div className={`text-3xl font-bold ${card.valueColor}`}>
                    {card.value}
                  </div>
                  <div className="text-xs font-semibold uppercase text-slate-400 mt-1 tracking-wide">
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">

              {/* Listings BarChart */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h6 className="text-slate-700 text-sm font-bold">
                    Listing Status Breakdown
                  </h6>
                  <Link to="/admin/listings">
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1 text-brand-600 text-xs shadow-none hover:bg-brand-50"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={listingChartData}
                    margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#94a3b8" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Count">
                      {listingChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* Users PieChart */}
              <Card>
                <div className="flex justify-between items-center mb-4">
                  <h6 className="text-slate-700 text-sm font-bold">
                    User Role Distribution
                  </h6>
                  <Link to="/admin/users">
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1 text-brand-600 text-xs shadow-none hover:bg-brand-50"
                    >
                      View All
                    </Button>
                  </Link>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={userChartData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {userChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span style={{ fontSize: 11, color: "#64748b" }}>{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
