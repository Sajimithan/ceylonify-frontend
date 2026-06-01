import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ConfirmModal } from "../../ui/ConfirmModal";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_ALL_USERS, ADMIN_CHANGE_USER_ROLE, ADMIN_UPDATE_SUBSCRIPTION, ADMIN_UPDATE_USER_PHONE, ADMIN_SUSPEND_USER, ADMIN_ACTIVATE_USER, ADMIN_CREATE_ADMIN_ACCOUNT, ADMIN_DELETE_USER } from "./admin.gql";
import { ADMIN_PENDING_HOST_APPLICATIONS } from "./host-applications.gql";
import { ME_QUERY } from "../browse.gql";

type UserRecord = {
  id: string;
  firebaseUid: string;
  email?: string;
  role: string;
  createdAt: string;
  badgeLevel?: string;
  approvedCount?: number;
  phone?: string;
  isSuspended?: boolean;
  subscriptionExpiresAt?: string;
  avatarUrl?: string;
};

const BADGE_EMOJI: Record<string, string> = {
  BRONZE: "🥉",
  SILVER: "🥈",
  GOLD: "🥇",
  DIAMOND: "💎",
};

const BADGE_STYLE: Record<string, string> = {
  BRONZE: "bg-amber-50 text-amber-700 border-amber-200",
  SILVER: "bg-slate-100 text-slate-600 border-slate-300",
  GOLD: "bg-yellow-50 text-yellow-700 border-yellow-300",
  DIAMOND: "bg-cyan-50 text-cyan-700 border-cyan-300",
};

type UsersData = {
  adminAllUsers: UserRecord[];
};

function userAvatarColor(role: string) {
  if (role === "ADMIN") return "bg-slate-800 text-white";
  if (role === "HOST")  return "bg-violet-100 text-violet-700";
  return "bg-brand-100 text-brand-700";
}

function userInitials(email?: string) {
  if (!email) return "?";
  return email.split("@")[0].slice(0, 2).toUpperCase();
}

export function AdminUsers() {
  const nav = useNavigate();
  const { data: meData } = useQuery(ME_QUERY);
  const isSuperAdmin: boolean = meData?.me?.isSuperAdmin ?? false;

  const { data, loading, error, refetch } = useQuery<UsersData>(ADMIN_ALL_USERS, {
    fetchPolicy: "network-only",
  });
  const { data: appsData } = useQuery<{ adminPendingHostApplications: { firebaseUid: string }[] }>(
    ADMIN_PENDING_HOST_APPLICATIONS,
    { fetchPolicy: "network-only" },
  );
  const pendingUids = new Set((appsData?.adminPendingHostApplications ?? []).map((a) => a.firebaseUid));

  const [showRegisterPanel, setShowRegisterPanel] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [registerStatus, setRegisterStatus] = useState<"idle" | "success" | "error">("idle");
  const [registerError, setRegisterError] = useState("");

  const [createAdminAccount, { loading: creating }] = useMutation(ADMIN_CREATE_ADMIN_ACCOUNT);
  const [changeRole, { loading: updating }] = useMutation(ADMIN_CHANGE_USER_ROLE);
  const [updateSubscription, { loading: updatingSub }] = useMutation(ADMIN_UPDATE_SUBSCRIPTION);
  const [updatePhone] = useMutation(ADMIN_UPDATE_USER_PHONE);
  const [suspendUser] = useMutation(ADMIN_SUSPEND_USER, { onCompleted: () => refetch() });
  const [activateUser] = useMutation(ADMIN_ACTIVATE_USER, { onCompleted: () => refetch() });
  const [deleteUser] = useMutation(ADMIN_DELETE_USER);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("TRAVELER");
  const [search, setSearch]           = useState("");
  const [editingPhoneUid, setEditingPhoneUid] = useState<string | null>(null);
  const [phoneInput, setPhoneInput]   = useState("");
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  const isPremiumUser = (u: { subscriptionExpiresAt?: string | null }) =>
    !!u.subscriptionExpiresAt && new Date(u.subscriptionExpiresAt) > new Date();

  async function handleRoleChange(id: string) {
    if (!editingId) return;
    try {
      await changeRole({ variables: { id, role: selectedRole } });
      setEditingId(null);
      await refetch();
    } catch (e) {
      console.error("Failed to update role", e);
    }
  }

  async function handleSavePhone(firebaseUid: string) {
    if (!phoneInput.trim()) return;
    try {
      await updatePhone({ variables: { firebaseUid, phone: phoneInput.trim() } });
      setEditingPhoneUid(null);
      setPhoneInput("");
      await refetch();
    } catch (e) {
      console.error("Failed to update phone", e);
    }
  }

  async function handleCreateAdmin() {
    if (!adminEmail.trim()) return;
    setRegisterStatus("idle");
    setRegisterError("");
    try {
      const createdEmail = adminEmail.trim();
      await createAdminAccount({ variables: { email: createdEmail } });
      setRegisterStatus("success");
      await refetch();
    } catch (e: unknown) {
      setRegisterStatus("error");
      setRegisterError((e as Error)?.message ?? "Failed to create admin account.");
    }
  }

  const filteredUsers = (data?.adminAllUsers ?? []).filter(
    (u) =>
      !search ||
      (u.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <DashboardLayout
      title="User Management"
      subtitle="View and manage user roles"
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
      <div className="mx-auto w-full max-w-7xl">
        {loading && (
          <div className="bg-white rounded-xl shadow p-8 text-center text-slate-400 font-semibold mb-4">
            Loading users…
          </div>
        )}
        {error && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 font-bold mb-4 border border-red-200">
            {error.message}
          </div>
        )}

        {/* Register Admin Panel */}
        <div className="bg-white rounded-xl shadow mb-4 overflow-hidden">
          <button
            onClick={() => { setShowRegisterPanel(!showRegisterPanel); setRegisterStatus("idle"); setRegisterError(""); setAdminEmail(""); }}
            className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-bold text-slate-700">+ Register New Admin</span>
            <span className="text-slate-400 text-xs font-semibold">{showRegisterPanel ? "▲ Collapse" : "▼ Expand"}</span>
          </button>

          {showRegisterPanel && (
            <div className="border-t border-slate-100 px-5 py-5 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>

              {/* Status messages */}
              {registerStatus === "success" && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-4 space-y-2">
                  <p className="text-sm font-bold text-emerald-700">✅ Admin account created and credentials emailed.</p>
                  <p className="text-xs text-emerald-600">Login credentials were sent to:</p>
                  <div className="bg-white border border-emerald-200 rounded-lg px-4 py-3 space-y-1">
                    <div className="text-xs text-slate-400 font-semibold uppercase">Email</div>
                    <div className="text-sm font-mono text-slate-700">{adminEmail || "—"}</div>
                  </div>
                </div>
              )}
              {registerStatus === "error" && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-700">
                  {registerError}
                </div>
              )}

              {/* Create button */}
              <button
                type="button"
                onClick={handleCreateAdmin}
                disabled={creating || !adminEmail.trim()}
                className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors"
              >
                {creating ? "Sending…" : "Create and Send Mail"}
              </button>
              <p className="text-[11px] text-slate-400 text-center">
                The account is created and login credentials are emailed to the new admin automatically.
              </p>
            </div>
          )}
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-xl shadow mb-4 px-4 py-3 flex items-center gap-3">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by email or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {data && (
          <div className="bg-white rounded-xl shadow overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Joined
                  </th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60 transition-colors"
                  >
                    {/* User cell */}
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-slate-200"
                          />
                        ) : (
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${userAvatarColor(u.role)}`}
                          >
                            {userInitials(u.email)}
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`text-sm font-semibold leading-tight ${u.role === "HOST" ? "text-brand-600 hover:underline cursor-pointer" : "text-slate-700"}`}
                              onClick={() => u.role === "HOST" && nav(`/admin/users/${u.firebaseUid}`)}
                            >
                              {u.email || "No Email (Provider Auth)"}
                            </div>
                            {u.isSuspended && (
                              <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full uppercase">Suspended</span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {u.id.slice(0, 8)}…
                          </div>
                          {/* Phone for HOST users */}
                          {u.role === "HOST" && (
                            <div className="mt-1">
                              {editingPhoneUid === u.firebaseUid ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="tel"
                                    value={phoneInput}
                                    onChange={(e) => setPhoneInput(e.target.value)}
                                    placeholder="+94 77 000 0000"
                                    className="text-[10px] border border-slate-200 rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-brand-400"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleSavePhone(u.firebaseUid);
                                      if (e.key === "Escape") { setEditingPhoneUid(null); setPhoneInput(""); }
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleSavePhone(u.firebaseUid)}
                                    className="text-[10px] font-bold text-brand-600 hover:text-brand-800"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => { setEditingPhoneUid(null); setPhoneInput(""); }}
                                    className="text-[10px] text-slate-400 hover:text-slate-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : u.phone ? (
                                <button
                                  className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-brand-600 transition-colors group"
                                  title="Click to edit phone"
                                  onClick={() => { setEditingPhoneUid(u.firebaseUid); setPhoneInput(u.phone ?? ""); }}
                                >
                                  <span>📞</span>
                                  <span className="font-mono group-hover:underline">{u.phone}</span>
                                </button>
                              ) : (
                                <button
                                  className="text-[10px] text-slate-400 hover:text-brand-600 border border-dashed border-slate-200 hover:border-brand-300 px-2 py-0.5 rounded transition-colors"
                                  onClick={() => { setEditingPhoneUid(u.firebaseUid); setPhoneInput(""); }}
                                >
                                  + Add emergency contact
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role cell */}
                    <td className="px-5 py-3">
                      {editingId === u.id ? (
                        <select
                          className="border border-slate-200 px-2 py-1 text-slate-600 bg-white rounded-lg text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-400 max-w-[130px]"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="TRAVELER">TRAVELER</option>
                          <option value="HOST">HOST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <div className="flex flex-col gap-1.5">
                          {!(u.role === "ADMIN" && u.firebaseUid === meData?.me?.firebaseUid && isSuperAdmin) && (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide w-fit
                                ${u.role === "ADMIN"
                                  ? "bg-slate-800 text-white"
                                  : u.role === "HOST"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-brand-100 text-brand-700"
                                }`}
                            >
                              {u.role}
                            </span>
                          )}
                          {u.role === "TRAVELER" && pendingUids.has(u.firebaseUid) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit bg-amber-50 text-amber-700 border-amber-300">
                              ⏳ Host Pending
                            </span>
                          )}
                          {u.role === "ADMIN" && u.firebaseUid === meData?.me?.firebaseUid && isSuperAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit bg-slate-800 text-white border-slate-700">
                              👑 Super Admin
                            </span>
                          )}
                          {u.badgeLevel && u.badgeLevel !== "NONE" && (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border w-fit ${BADGE_STYLE[u.badgeLevel] ?? ""}`}
                            >
                              {BADGE_EMOJI[u.badgeLevel]} {u.badgeLevel[0] + u.badgeLevel.slice(1).toLowerCase()} Host
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Joined cell */}
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Actions cell */}
                    <td className="px-5 py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        {editingId === u.id ? (
                          <>
                            <Button
                              className="!px-3 !py-1 !text-[10px]"
                              disabled={updating}
                              onClick={() => handleRoleChange(u.id)}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              className="!px-3 !py-1 !text-[10px]"
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {(u.role !== "ADMIN" || isSuperAdmin) && (
                            <button
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 border border-brand-200 hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors"
                              onClick={() => {
                                setEditingId(u.id);
                                setSelectedRole(u.role);
                              }}
                            >
                              Edit Role
                            </button>
                            )}
                            {u.role === "TRAVELER" && !isPremiumUser(u) && (
                              <button
                                className="text-[10px] font-bold text-amber-600 hover:text-amber-800 border border-amber-200 hover:bg-amber-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                                disabled={updatingSub}
                                title="Grant Premium AI access (30 requests/month)"
                                onClick={async () => {
                                  await updateSubscription({ variables: { targetFirebaseUid: u.firebaseUid, tier: "PREMIUM" } });
                                  await refetch();
                                }}
                              >
                                Grant Premium
                              </button>
                            )}
                            {u.role === "TRAVELER" && isPremiumUser(u) && (
                              <button
                                className="text-[10px] font-bold text-slate-400 hover:text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                                disabled={updatingSub}
                                title="Revert to Free tier (5 requests/month)"
                                onClick={async () => {
                                  await updateSubscription({ variables: { targetFirebaseUid: u.firebaseUid, tier: "FREE" } });
                                  await refetch();
                                }}
                              >
                                Revoke Premium
                              </button>
                            )}
                            {(u.role !== "ADMIN" || isSuperAdmin) && u.firebaseUid !== meData?.me?.firebaseUid && (
                              u.isSuspended ? (
                                <button
                                  className="text-[10px] font-bold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
                                  title="Re-activate this account"
                                  onClick={() => activateUser({ variables: { firebaseUid: u.firebaseUid } })}
                                >
                                  Activate
                                </button>
                              ) : (
                                <button
                                  className="text-[10px] font-bold text-red-500 border border-red-200 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                                  title="Suspend this account"
                                  onClick={() => {
                                    if (confirm(`Suspend account for ${u.email ?? u.firebaseUid}?`))
                                      suspendUser({ variables: { firebaseUid: u.firebaseUid } });
                                  }}
                                >
                                  Suspend
                                </button>
                              )
                            )}
                            {u.firebaseUid !== meData?.me?.firebaseUid && (
                              <button
                                className="text-[10px] font-bold text-red-700 hover:text-red-900 border border-red-300 hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                                title="Permanently delete this account"
                                onClick={() => { setDeleteTarget(u); setDeleteError(""); }}
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm font-semibold">
                      {search
                        ? `No users matching "${search}"`
                        : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete Account"
          description="This action is permanent and cannot be undone."
          detail={`${deleteTarget.email ?? deleteTarget.firebaseUid} · ${deleteTarget.role}`}
          confirmLabel="Delete Permanently"
          onConfirm={async () => {
            await deleteUser({ variables: { firebaseUid: deleteTarget.firebaseUid } });
            setDeleteTarget(null);
            await refetch();
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </DashboardLayout>
  );
}
