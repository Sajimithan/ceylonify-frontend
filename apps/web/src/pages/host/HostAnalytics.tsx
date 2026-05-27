import { useQuery } from "@apollo/client/react";
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

export function HostAnalytics() {
  const { data, loading } = useQuery(MY_LISTINGS);
  const listings: Listing[] = data?.myListings ?? [];

  const totalViews = listings.reduce((s, l) => s + (l.viewCount ?? 0), 0);
  const approved = listings.filter((l) => l.status === "APPROVED").length;
  const pending = listings.filter((l) => l.status === "PENDING").length;
  const maxViews = Math.max(...listings.map((l) => l.viewCount ?? 0), 1);

  return (
    <DashboardLayout
      title="Analytics"
      subtitle="Your listing performance"
    >
      <div className="mx-auto w-full max-w-4xl">
        {loading && (
          <div className="text-sm text-slate-500 font-semibold py-10 text-center">
            Loading analytics…
          </div>
        )}

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[
            { label: "Total Listings", value: listings.length, color: "text-sky-600" },
            { label: "Total Views", value: totalViews, color: "text-violet-600" },
            { label: "Approved", value: approved, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow p-5 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 font-semibold uppercase mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {pending > 0 && (
          <div className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 font-semibold">
            {pending} listing{pending !== 1 ? "s" : ""} pending admin review.
          </div>
        )}

        {/* Per-listing view bars */}
        {listings.length > 0 && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-slate-400 text-xs font-bold uppercase mb-4">
              Views per Listing
            </h2>
            <div className="space-y-4">
              {listings
                .slice()
                .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
                .map((l) => (
                  <div key={l.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                          {l.title}
                        </span>
                        {l.isPremium && (
                          <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                            Premium
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-slate-500">
                        {l.viewCount ?? 0} views
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round(((l.viewCount ?? 0) / maxViews) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {!loading && listings.length === 0 && (
          <div className="text-center text-slate-400 font-semibold py-10">
            No listings yet. Create your first listing to see analytics.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
