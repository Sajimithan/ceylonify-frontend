import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_ALL_USERS, ADMIN_CHANGE_USER_ROLE } from "./admin.gql";

type UserRecord = {
  id: string;
  firebaseUid: string;
  email?: string;
  role: string;
  createdAt: string;
  badgeLevel?: string;
  approvedCount?: number;
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
  const { data, loading, error, refetch } = useQuery<UsersData>(ADMIN_ALL_USERS, {
    fetchPolicy: "network-only",
  });

  const [changeRole, { loading: updating }] = useMutation(ADMIN_CHANGE_USER_ROLE);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("TRAVELER");
  const [search, setSearch]           = useState("");

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
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full">
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
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${userAvatarColor(u.role)}`}
                        >
                          {userInitials(u.email)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-700 leading-tight">
                            {u.email || "No Email (Provider Auth)"}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {u.id.slice(0, 8)}…
                          </div>
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
                            <button
                              className="text-[10px] font-bold text-brand-600 hover:text-brand-800 border border-brand-200 hover:bg-brand-50 px-3 py-1 rounded-lg transition-colors"
                              onClick={() => {
                                setEditingId(u.id);
                                setSelectedRole(u.role);
                              }}
                            >
                              Edit Role
                            </button>
                            {u.role === "TRAVELER" && (
                              <button
                                className="text-[10px] font-bold text-violet-600 hover:text-violet-800 border border-violet-200 hover:bg-violet-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                                disabled={updating}
                                onClick={async () => {
                                  await changeRole({ variables: { id: u.id, role: "HOST" } });
                                  await refetch();
                                }}
                              >
                                Grant Host
                              </button>
                            )}
                            {u.role === "HOST" && (
                              <button
                                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-40"
                                disabled={updating}
                                onClick={async () => {
                                  await changeRole({ variables: { id: u.id, role: "TRAVELER" } });
                                  await refetch();
                                }}
                              >
                                Revoke Host
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
    </DashboardLayout>
  );
}
