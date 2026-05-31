import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { useQuery } from "@apollo/client/react";
import { ME_VERIFICATION_STATUS } from "./premium.gql";
import { PremiumUpgrade } from "./PremiumUpgrade";

export function TravelerAccount() {
  const { data, refetch } = useQuery(ME_VERIFICATION_STATUS);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const me = data?.me;
  const isPremium = me?.isPremium;

  return (
    <DashboardLayout title="Account & Premium" subtitle="Manage your subscription">
      {showUpgrade && (
        <PremiumUpgrade
          onClose={() => setShowUpgrade(false)}
          onSuccess={() => { refetch(); setShowUpgrade(false); }}
        />
      )}

      <div className="mx-auto w-full max-w-xl">
        <div className="bg-white rounded-2xl shadow-lg p-7 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="text-lg font-bold text-slate-700">Subscription</div>
              <div className="text-sm text-slate-400 mt-0.5">Your current plan</div>
            </div>
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${isPremium ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
              {isPremium ? "⭐ Premium" : "Free"}
            </span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className={isPremium ? "text-emerald-500" : "text-slate-300"}>✓</span>
              <span>30 AI Travel Planner requests/month</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className={isPremium ? "text-emerald-500" : "text-slate-300"}>✓</span>
              <span>Access to premium listings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className={isPremium ? "text-emerald-500" : "text-slate-300"}>✓</span>
              <span>Priority support</span>
            </div>
          </div>

          {!isPremium && (
            <button
              onClick={() => setShowUpgrade(true)}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl text-sm transition-colors shadow"
            >
              Upgrade to Premium ⭐
            </button>
          )}

          {isPremium && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700 font-semibold text-center">
              You're on Premium! Enjoy all features.
            </div>
          )}
        </div>

        {/* Verification status */}
        <div className="bg-white rounded-2xl shadow-lg p-7">
          <div className="text-lg font-bold text-slate-700 mb-4">Verification Status</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Email</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${me?.emailVerifiedAt ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {me?.emailVerifiedAt ? "✓ Verified" : "Not verified"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Phone {me?.phone ? `(${me.phone})` : ""}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${me?.phoneVerifiedAt ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                {me?.phoneVerifiedAt ? "✓ Verified" : "Not verified"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
