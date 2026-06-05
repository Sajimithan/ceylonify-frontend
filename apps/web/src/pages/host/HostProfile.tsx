import { useRef, useState } from "react";
import { gql } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import {
  updateProfile,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import { auth } from "../../auth/firebase";
import { useAuth } from "../../auth/useAuth";
import { DELETE_MY_ACCOUNT } from "../premium.gql";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { ME_QUERY } from "../browse.gql";
import { ContactSupportSection } from "../../ui/ContactSupportSection";

const UPDATE_PROFILE = gql`
  mutation UpdateProfile($displayName: String, $avatarUrl: String) {
    updateProfile(displayName: $displayName, avatarUrl: $avatarUrl) {
      firebaseUid
      avatarUrl
    }
  }
`;

const HOST_BADGE = gql`
  query HostBadge($firebaseUid: String!) {
    hostBadge(firebaseUid: $firebaseUid) {
      approvedCount
      badgeLevel
    }
  }
`;

const BADGE_DISPLAY: Record<string, { emoji: string; label: string; style: string }> = {
  BRONZE:  { emoji: "🥉", label: "Bronze Host",  style: "from-amber-50 to-amber-100 border-amber-200 text-amber-700" },
  SILVER:  { emoji: "🥈", label: "Silver Host",  style: "from-slate-50 to-slate-100 border-slate-300 text-slate-600" },
  GOLD:    { emoji: "🥇", label: "Gold Host",    style: "from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-700" },
  DIAMOND: { emoji: "💎", label: "Diamond Host", style: "from-cyan-50 to-cyan-100 border-cyan-300 text-cyan-700" },
};

function Avatar({
  name,
  email,
  photoURL,
}: {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
}) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : email
    ? email[0].toUpperCase()
    : "?";

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt="Profile"
        className="w-20 h-20 rounded-full object-cover shadow-lg ring-2 ring-brand-200"
      />
    );
  }

  return (
    <div className="w-20 h-20 rounded-full bg-brand-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg select-none">
      {initials}
    </div>
  );
}

export function HostProfile() {
  const { user } = useAuth();
  const { data: meData } = useQuery(ME_QUERY);
  const { data: badgeData } = useQuery<{
    hostBadge: { approvedCount: number; badgeLevel: string };
  }>(HOST_BADGE, {
    variables: { firebaseUid: user?.uid ?? "" },
    skip: !user?.uid,
  });
  const [deleteMyAccount] = useMutation(DELETE_MY_ACCOUNT);
  const [updateProfileMutation] = useMutation(UPDATE_PROFILE);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Profile photo ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [localPhotoURL, setLocalPhotoURL] = useState<string | null>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      setPhotoMsg({ ok: false, text: "Please select an image file." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoMsg({ ok: false, text: "Image must be smaller than 5 MB." });
      return;
    }

    setPhotoUploading(true);
    setPhotoMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("http://localhost:3000/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json() as { url: string };
      const fullUrl = `http://localhost:3000${url}`;
      await updateProfile(user, { photoURL: fullUrl });
      await updateProfileMutation({ variables: { avatarUrl: fullUrl } });
      setLocalPhotoURL(fullUrl);
      setPhotoMsg({ ok: true, text: "Profile photo updated." });
    } catch {
      setPhotoMsg({ ok: false, text: "Upload failed. Please try again." });
    } finally {
      setPhotoUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const currentPhotoURL = localPhotoURL ?? user?.photoURL;

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
      const name = displayName.trim() || null;
      await updateProfile(user, { displayName: name });
      await updateProfileMutation({ variables: { displayName: name } });
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
            {/* Avatar with upload overlay */}
            <div className="relative flex-shrink-0 group">
              <Avatar
                name={user?.displayName}
                email={user?.email}
                photoURL={currentPhotoURL}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity disabled:cursor-wait"
                title="Change photo"
              >
                {photoUploading ? (
                  <svg className="w-5 h-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <p className="text-[10px] text-slate-400 text-center mt-1.5 font-medium">
                {photoUploading ? "Uploading…" : "Click to change"}
              </p>
            </div>
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

          {photoMsg && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm font-semibold ${
                photoMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              {photoMsg.text}
            </div>
          )}

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

        {/* Badge card */}
        {badgeData?.hostBadge && badgeData.hostBadge.badgeLevel !== "NONE" && (() => {
          const bd = BADGE_DISPLAY[badgeData.hostBadge.badgeLevel];
          if (!bd) return null;
          return (
            <div className={`rounded-xl border bg-gradient-to-br ${bd.style} p-5 flex items-center gap-4`}>
              <div className="text-5xl flex-shrink-0">{bd.emoji}</div>
              <div>
                <div className={`text-xs font-bold uppercase tracking-wide mb-0.5 opacity-60`}>
                  Host Achievement
                </div>
                <div className="text-xl font-bold">{bd.label}</div>
                <div className="text-sm font-medium mt-0.5 opacity-70">
                  {badgeData.hostBadge.approvedCount} approved listing
                  {badgeData.hostBadge.approvedCount !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
          );
        })()}

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

        {/* Contact Support */}
        <ContactSupportSection isSuperAdmin={meData?.me?.isSuperAdmin ?? false} />

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl shadow p-7 border border-red-100">
          <div className="text-sm font-bold text-red-600 mb-1">Danger Zone</div>
          <div className="text-xs text-slate-400 mb-4">
            Permanently delete your account and all your listings. This action cannot be undone.
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-5 py-2 rounded-lg border border-red-300 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <ConfirmModal
          title="Delete Account"
          description="Your account and all your listings will be permanently deleted. This cannot be undone."
          confirmLabel="Delete My Account"
          onConfirm={async () => {
            await deleteMyAccount();
            await signOut(auth);
            window.location.href = "/";
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </DashboardLayout>
  );
}
