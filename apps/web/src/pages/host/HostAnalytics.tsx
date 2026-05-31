import { useQuery } from "@apollo/client/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  EyeIcon,
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { MY_LISTINGS } from "./listings.gql";

type Listing = {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  isPremium: boolean;
  createdAt: string;
};

type MyListingsData = { myListings: Listing[] };

export function HostAnalytics() {
  const { data, loading } = useQuery<MyListingsData>(MY_LISTINGS);
  const listings: Listing[] = data?.myListings ?? [];

  const totalViews = listings.reduce((s, l) => s + (l.viewCount ?? 0), 0);
  const approved = listings.filter((l) => l.status === "APPROVED").length;
  const pending = listings.filter((l) => l.status === "PENDING").length;
  const rejected = listings.filter((l) => l.status === "REJECTED").length;

  const kpiCards = [
    {
      label: "Total Listings",
      value: listings.length,
      Icon: BuildingOffice2Icon,
      iconBg: "bg-brand-100",
      iconColor: "text-brand-600",
      valueColor: "text-brand-700",
      border: "border-t-brand-500",
    },
    {
      label: "Total Views",
      value: totalViews,
      Icon: EyeIcon,
      iconBg: "bg-violet-100",
      iconColor: "text-violet-600",
      valueColor: "text-violet-700",
      border: "border-t-violet-500",
    },
    {
      label: "Approved",
      value: approved,
      Icon: CheckCircleIcon,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
      valueColor: "text-emerald-700",
      border: "border-t-emerald-500",
    },
    {
      label: "Pending Review",
      value: pending,
      Icon: ClockIcon,
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      valueColor: "text-amber-700",
      border: "border-t-amber-500",
    },
  ];

  const viewsChartData = listings
    .slice()
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 10)
    .map((l) => ({
      name: l.title.length > 18 ? l.title.slice(0, 16) + "…" : l.title,
      views: l.viewCount ?? 0,
      premium: l.isPremium,
    }));

  return (
    <DashboardLayout title="Analytics" subtitle="Your listing performance">
      <div className="mx-auto w-full max-w-4xl">

        {loading && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400 font-semibold mb-6">
            Loading analytics…
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className={`bg-white rounded-xl shadow p-5 border-t-4 ${card.border}`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.iconBg}`}
              >
                <card.Icon className={`w-4 h-4 ${card.iconColor}`} />
              </div>
              <div className={`text-3xl font-bold ${card.valueColor}`}>
                {card.value}
              </div>
              <div className="text-xs text-slate-400 font-semibold uppercase mt-1 tracking-wide">
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 font-semibold border border-amber-100">
            {pending} listing{pending !== 1 ? "s" : ""} pending admin review.
          </div>
        )}

        {/* Views Bar Chart */}
        {listings.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="mb-4">
              <h2 className="text-slate-700 text-sm font-bold">
                Views per Listing
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Top {Math.min(listings.length, 10)} listings by view count
              </p>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={viewsChartData}
                margin={{ top: 5, right: 20, left: -10, bottom: 60 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
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
                  formatter={(value) => [`${Number(value)} views`, "Views"]}
                />
                <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                  {viewsChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.premium ? "#f59e0b" : "#14b8a6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex gap-5 mt-3 text-[10px] font-semibold text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                Standard
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent-400 inline-block" />
                Premium
              </span>
            </div>
          </div>
        )}

        {/* Status Distribution */}
        {listings.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-slate-700 text-sm font-bold mb-4">
              Status Distribution
            </h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-100">
                <div className="text-2xl font-bold text-emerald-600">{approved}</div>
                <div className="text-[10px] font-bold uppercase text-emerald-500 mt-1 tracking-wide">
                  Approved
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 border border-amber-100">
                <div className="text-2xl font-bold text-amber-600">{pending}</div>
                <div className="text-[10px] font-bold uppercase text-amber-500 mt-1 tracking-wide">
                  Pending
                </div>
              </div>
              <div className="rounded-xl bg-red-50 p-4 border border-red-100">
                <div className="text-2xl font-bold text-red-600">{rejected}</div>
                <div className="text-[10px] font-bold uppercase text-red-500 mt-1 tracking-wide">
                  Rejected
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="bg-white rounded-xl shadow p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-4">
              <ChartBarIcon className="w-8 h-8 text-brand-400" />
            </div>
            <p className="text-slate-500 font-semibold">No listings yet</p>
            <p className="text-slate-400 text-sm mt-1">
              Create your first listing to see analytics here.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function ChartBarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  );
}
