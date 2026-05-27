import { useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../../auth/firebase";
import { useAuth } from "../../auth/useAuth";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { ME_QUERY } from "../browse.gql";

function Avatar({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email
    ? email[0].toUpperCase()
    : "?";

  return (
    <div className="w-20 h-20 rounded-full bg-sky-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg select-none">
      {initials}
    </div>
  );
}

export function HostProfile() {
  const { user } = useAuth();
  const { data: meData } = useQuery(ME_QUERY);

  // ── Display name ──────────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setNameLoading(true);
    setNameMsg(null);
    try {
      await updateProfile(user, { displayName: displayName.trim() || null });
      setNameMsg({ ok: true, text: "Display name updated." });
    } catch {
      setNameMsg({ ok: false, text: "Failed to update display name." });
    } finally {
      setNameLoading(false);
    }
  }

  // ── Password change ───────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPwMsg(null);

    if (newPassword.length < 6) {
      setPwMsg({ ok: false, text: "New password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ ok: false, text: "New passwords do not match." });
      return;
    }

    setPwLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwMsg({ ok: true, text: "Password changed successfully." });
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setPwMsg({ ok: false, text: "Current password is incorrect." });
      } else {
        setPwMsg({ ok: false, text: "Failed to change password. Please try again." });
      }
    } finally {
      setPwLoading(false);
    }
  }

  const role = meData?.me?.role ?? "—";
  const isPremium = meData?.me?.isPremium ?? false;
  const memberSince = user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <DashboardLayout title="Profile & Settings" subtitle="Manage your account details">
      <div className="mx-auto w-full max-w-2xl space-y-6">

        {/* Identity card */}
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center gap-5 mb-6">
            <Avatar name={user?.displayName} email={user?.email} />
            <div>
              <div className="text-lg font-bold text-slate-700">
                {user?.displayName || "No display name set"}
              </div>
              <div className="text-sm text-slate-500">{user?.email}</div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    role === "ADMIN"
                      ? "bg-violet-100 text-violet-600"
                      : role === "HOST"
                      ? "bg-sky-100 text-sky-600"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {role}
                </span>
                {isPremium && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-600">
                    Premium
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">Email</div>
              <div className="font-semibold text-slate-700">{user?.email ?? "—"}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">Role</div>
              <div className="font-semibold text-slate-700">{role}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">Member since</div>
              <div className="font-semibold text-slate-700">{memberSince}</div>
            </div>
            <div className="bg-slate-50 rounded-lg px-4 py-3">
              <div className="text-xs font-bold uppercase text-slate-400 mb-0.5">Account ID</div>
              <div className="font-mono text-xs text-slate-500 truncate">{user?.uid ?? "—"}</div>
            </div>
          </div>
        </div>

        {/* Edit display name */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-slate-400 text-xs font-bold uppercase mb-4">Display Name</h2>
          <form onSubmit={saveName} className="space-y-4">
            <Input
              label="Display Name"
              hint="How your name appears across the platform"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Sajimithan"
            />
            {nameMsg && (
              <div
                className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                  nameMsg.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {nameMsg.text}
              </div>
            )}
            <Button type="submit" disabled={nameLoading}>
              {nameLoading ? "Saving…" : "Save Name"}
            </Button>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl shadow p-6 mb-10">
          <h2 className="text-slate-400 text-xs font-bold uppercase mb-4">Change Password</h2>
          <form onSubmit={changePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <Input
              label="New Password"
              type="password"
              hint="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
            {pwMsg && (
              <div
                className={`rounded-lg px-4 py-3 text-sm font-semibold ${
                  pwMsg.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                }`}
              >
                {pwMsg.text}
              </div>
            )}
            <Button type="submit" disabled={pwLoading}>
              {pwLoading ? "Changing…" : "Change Password"}
            </Button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
