import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_FEATURE_FLAGS, ADMIN_UPDATE_FEATURE_FLAG } from "./admin.gql";

type FeatureFlag = {
  key: string;
  label: string;
  description: string;
  enabledForTravelers: boolean;
  enabledForHosts: boolean;
  updatedAt: string;
  updatedByAdminUid?: string;
  updatedByAdminEmail?: string;
  updatedByAdminName?: string;
};

type FlagsData = {
  featureFlags: FeatureFlag[];
};

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-40 ${
        checked ? "bg-brand-500" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminFeatureFlags() {
  const { data, loading, error, refetch } = useQuery<FlagsData>(ADMIN_FEATURE_FLAGS, {
    fetchPolicy: "network-only",
  });

  const [updateFlag, { loading: updating }] = useMutation(ADMIN_UPDATE_FEATURE_FLAG);

  async function toggle(key: string, field: "enabledForTravelers" | "enabledForHosts", current: boolean) {
    await updateFlag({ variables: { key, [field]: !current } });
    await refetch();
  }

  return (
    <DashboardLayout
      title="Feature Control"
      subtitle="Enable or disable features per user role"
      actions={
        <>
          <Button variant="ghost" onClick={() => refetch()} className="text-white">
            Refresh
          </Button>
          <Link to="/admin">
            <Button variant="ghost" className="text-white border border-white/40">
              Back to Overview
            </Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-4xl space-y-4">
        {loading && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400 font-semibold">
            Loading feature flags…
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 font-bold border border-red-200">
            {error.message}
          </div>
        )}

        {/* Header row */}
        {data && (
          <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Feature</span>
            <span className="w-28 text-center">Travelers</span>
            <span className="w-28 text-center">Hosts</span>
          </div>
        )}

        {data?.featureFlags.map((flag) => (
          <div
            key={flag.key}
            className="bg-white rounded-xl shadow px-5 py-4 grid grid-cols-[1fr_auto_auto] gap-4 items-center"
          >
            {/* Info */}
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-slate-800">{flag.label}</span>
                <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                  {flag.key}
                </span>
              </div>
              <p className="text-xs text-slate-500">{flag.description}</p>
              {flag.updatedByAdminUid && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Updated {timeAgo(flag.updatedAt)} · by{" "}
                  <span className="font-semibold text-slate-500">
                    {flag.updatedByAdminName || flag.updatedByAdminEmail || `${flag.updatedByAdminUid.slice(0, 8)}…`}
                  </span>
                  {flag.updatedByAdminName && flag.updatedByAdminEmail && (
                    <span className="text-slate-400"> ({flag.updatedByAdminEmail})</span>
                  )}
                </p>
              )}
            </div>

            {/* Traveler toggle */}
            <div className="flex flex-col items-center gap-1 w-28">
              <Toggle
                checked={flag.enabledForTravelers}
                onChange={() => toggle(flag.key, "enabledForTravelers", flag.enabledForTravelers)}
                disabled={updating}
              />
              <span
                className={`text-[10px] font-semibold ${
                  flag.enabledForTravelers ? "text-brand-600" : "text-slate-400"
                }`}
              >
                {flag.enabledForTravelers ? "Enabled" : "Disabled"}
              </span>
            </div>

            {/* Host toggle */}
            <div className="flex flex-col items-center gap-1 w-28">
              <Toggle
                checked={flag.enabledForHosts}
                onChange={() => toggle(flag.key, "enabledForHosts", flag.enabledForHosts)}
                disabled={updating}
              />
              <span
                className={`text-[10px] font-semibold ${
                  flag.enabledForHosts ? "text-violet-600" : "text-slate-400"
                }`}
              >
                {flag.enabledForHosts ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>
        ))}

        {data?.featureFlags.length === 0 && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400 text-sm font-semibold">
            No feature flags found.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
