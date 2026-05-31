import { useState } from "react";
import { DashboardLayout } from "../layouts/DashboardLayout";
import { useQuery, useMutation } from "@apollo/client/react";
import { ME_VERIFICATION_STATUS, DELETE_MY_ACCOUNT } from "./premium.gql";
import { PremiumUpgrade } from "./PremiumUpgrade";
import { signOut } from "firebase/auth";
import { auth } from "../auth/firebase";

export function TravelerAccount() {
  const { data, refetch } = useQuery(ME_VERIFICATION_STATUS);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);

  async function handleDeleteAccount() {
    if (!confirm("Are you sure you want to permanently delete your account? This cannot be undone.")) return;
    if (!confirm("All your data (saved listings, itinerary, experiences) will be deleted. Confirm?")) return;
    await deleteMyAccount();
    await signOut(auth);
    window.location.href = "/login";
  }

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
              {me?.subscriptionExpiresAt && (
                <div className="text-xs text-emerald-600 font-normal mt-1">
                  Expires {new Date(me.subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Verification status */}
        <div className="bg-white rounded-2xl shadow-lg p-7 mb-6">
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

        {/* Danger zone */}
        <div className="bg-white rounded-2xl shadow-lg p-7 border border-red-100">
          <div className="text-sm font-bold text-red-600 mb-1">Danger Zone</div>
          <div className="text-xs text-slate-400 mb-4">Permanently delete your account and all associated data. This action cannot be undone.</div>
          <button
            onClick={handleDeleteAccount}
            className="px-5 py-2 rounded-lg border border-red-300 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
