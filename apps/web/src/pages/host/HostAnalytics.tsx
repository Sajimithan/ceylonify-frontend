import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
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
  StarIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { ExperienceReviewCard } from "../../components/ExperienceReviewCard";
import { MY_LISTINGS } from "./listings.gql";
import { HOST_PAST_EVENT_REVIEWS } from "./hostAnalytics.gql";

type Listing = {
  id: string;
  title: string;
  status: string;
  viewCount: number;
  isPremium: boolean;
  createdAt: string;
};

type MyListingsData = { myListings: Listing[] };

type HostEventReviewGroup = {
  averageRating?: number | null;
  reviewCount: number;
  event: {
    id: string;
    title: string;
    imageUrl?: string;
    placeName?: string;
    startDateTime?: string;
    type: string;
    viewCount?: number;
  };
  reviews: Parameters<typeof ExperienceReviewCard>[0]["review"][];
};

type HostPastEventReviewsData = {
  hostPastEventReviews: HostEventReviewGroup[];
};

export function HostAnalytics() {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [reviewsOnly, setReviewsOnly] = useState(false);

  const { data, loading } = useQuery<MyListingsData>(MY_LISTINGS);
  const {
    data: reviewsData,
    loading: reviewsLoading,
    refetch: refetchReviews,
  } = useQuery<HostPastEventReviewsData>(HOST_PAST_EVENT_REVIEWS);

  const listings: Listing[] = data?.myListings ?? [];
  const eventGroups = reviewsData?.hostPastEventReviews ?? [];

  const totalViews = listings.reduce((s, l) => s + (l.viewCount ?? 0), 0);
  const approved = listings.filter((l) => l.status === "APPROVED").length;
  const pending = listings.filter((l) => l.status === "PENDING").length;
  const rejected = listings.filter((l) => l.status === "REJECTED").length;

  const allReviews = eventGroups.flatMap((group) => group.reviews);
  const totalReviews = allReviews.length;
  const overallAvgRating = totalReviews
    ? (allReviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews).toFixed(1)
    : null;

  const visibleGroups = reviewsOnly
    ? eventGroups.filter((group) => group.reviewCount > 0)
    : eventGroups;

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

  function toggleExpanded(eventId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Your listing performance and traveler feedback">
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

        {/* Event Reviews & Feedback */}
        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-slate-700 text-sm font-bold flex items-center gap-2">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-brand-500" />
                Past Event Reviews
              </h2>
              <p className="text-slate-400 text-xs mt-0.5">
                Traveler ratings and feedback on your completed events — reply or react directly.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {overallAvgRating && (
                <div className="rounded-lg bg-amber-50 px-3 py-2 text-center border border-amber-100">
                  <div className="text-lg font-bold text-amber-600">{overallAvgRating}</div>
                  <div className="text-[10px] font-bold uppercase text-amber-500 tracking-wide">
                    Avg rating
                  </div>
                </div>
              )}
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-center border border-brand-100">
                <div className="text-lg font-bold text-brand-600">{totalReviews}</div>
                <div className="text-[10px] font-bold uppercase text-brand-500 tracking-wide">
                  Reviews
                </div>
              </div>
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={reviewsOnly}
              onChange={(e) => setReviewsOnly(e.target.checked)}
              className="rounded border-slate-300 text-brand-500 focus:ring-brand-500"
            />
            Show only events with reviews
          </label>

          {reviewsLoading && (
            <div className="py-8 text-center text-slate-400 text-sm font-semibold">
              Loading event reviews…
            </div>
          )}

          {!reviewsLoading && visibleGroups.length === 0 && (
            <div className="py-10 text-center">
              <StarIcon className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold text-sm">
                {reviewsOnly ? "No past events with reviews yet." : "No past events yet."}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                Reviews appear here after travelers share experiences on completed events.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {visibleGroups.map((group) => {
              const isExpanded = expandedIds.has(group.event.id);
              const hasReviews = group.reviewCount > 0;
              const previewReview = group.reviews[0];
              const hiddenReviews = group.reviews.slice(1);

              return (
                <div
                  key={group.event.id}
                  className="rounded-xl border border-slate-100 overflow-hidden"
                >
                  <div className="flex items-stretch bg-slate-50">
                    {group.event.imageUrl ? (
                      <img
                        src={group.event.imageUrl}
                        alt={group.event.title}
                        className="w-24 h-24 object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-brand-50 flex items-center justify-center text-2xl flex-shrink-0">
                        🎉
                      </div>
                    )}
                    <div className="flex-1 min-w-0 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-800 text-sm truncate">
                            {group.event.title}
                          </h3>
                          {group.event.startDateTime && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              🗓{" "}
                              {new Date(group.event.startDateTime).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          )}
                          {group.event.placeName && (
                            <p className="text-[11px] text-slate-400 truncate">
                              📍 {group.event.placeName}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {hasReviews ? (
                            <>
                              <span className="text-amber-500 text-xs font-bold">
                                {"⭐".repeat(Math.round(group.averageRating ?? 0))}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold">
                                {(group.averageRating ?? 0).toFixed(1)} · {group.reviewCount} review
                                {group.reviewCount !== 1 ? "s" : ""}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No reviews yet</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3">
                        {hasReviews && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(group.event.id)}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUpIcon className="w-3.5 h-3.5" />
                                Hide reviews
                              </>
                            ) : (
                              <>
                                <ChevronDownIcon className="w-3.5 h-3.5" />
                                {group.reviewCount === 1
                                  ? "View review"
                                  : `View all ${group.reviewCount} reviews`}
                              </>
                            )}
                          </button>
                        )}
                        <Link
                          to={`/listing/${group.event.id}`}
                          className="text-xs font-semibold text-slate-500 hover:text-brand-600"
                        >
                          Open listing →
                        </Link>
                      </div>
                    </div>
                  </div>

                  {hasReviews && (isExpanded || group.reviewCount === 1) && (
                    <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                      <ExperienceReviewCard
                        review={previewReview}
                        onUpdated={() => void refetchReviews()}
                      />
                      {isExpanded &&
                        hiddenReviews.map((review) => (
                          <ExperienceReviewCard
                            key={review.id}
                            review={review}
                            onUpdated={() => void refetchReviews()}
                          />
                        ))}
                      {!isExpanded && hiddenReviews.length > 0 && (
                        <button
                          type="button"
                          onClick={() => toggleExpanded(group.event.id)}
                          className="text-xs font-semibold text-brand-600"
                        >
                          +{hiddenReviews.length} more review
                          {hiddenReviews.length !== 1 ? "s" : ""}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

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
