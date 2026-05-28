import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@apollo/client/react";
import { DashboardLayout } from "../../layouts/DashboardLayout";
import { Button } from "../../ui/Button";
import { ADMIN_ALL_USERS, ADMIN_CHANGE_USER_ROLE } from "./admin.gql";

type UserRecord = {
  id: string;
  firebaseUid: string;
  email?: string;
  role: string;
  createdAt: string;
};

type UsersData = {
  adminAllUsers: UserRecord[];
};

export function AdminUsers() {
  const { data, loading, error, refetch } = useQuery<UsersData>(ADMIN_ALL_USERS, {
    fetchPolicy: "network-only",
  });
  
  const [changeRole, { loading: updating }] = useMutation(ADMIN_CHANGE_USER_ROLE);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState("TRAVELER");

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
            <Button variant="ghost" className="text-white border border-white">
              Back to Overview
            </Button>
          </Link>
        </>
      }
    >
      <div className="mx-auto w-full max-w-7xl">
        {loading && <div className="text-slate-500 font-bold mb-4">Loading users...</div>}
        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 font-bold mb-4">
            {error.message}
          </div>
        )}

        {data && (
          <div className="block w-full overflow-x-auto bg-white rounded shadow">
            <table className="items-center w-full bg-transparent border-collapse">
              <thead>
                <tr>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    ID
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Email
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Role
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Created At
                  </th>
                  <th className="px-6 bg-slate-50 text-slate-500 align-middle border border-solid border-slate-100 py-3 text-xs uppercase border-l-0 border-r-0 whitespace-nowrap font-semibold text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.adminAllUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition">
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-slate-500 font-mono">
                      {u.id.slice(0, 8)}...
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-slate-700 font-bold">
                      {u.email || "No Email (Provider Auth)"}
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
                      {editingId === u.id ? (
                        <select
                          className="border px-2 py-1 text-slate-600 bg-white rounded text-xs shadow-sm focus:outline-none focus:ring w-full max-w-[120px]"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="TRAVELER">TRAVELER</option>
                          <option value="HOST">HOST</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase
                          ${u.role === "ADMIN" ? "bg-slate-800 text-white" : 
                            u.role === "HOST" ? "bg-indigo-100 text-indigo-700" : 
                            "bg-sky-100 text-sky-700"}`}
                        >
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="border-t-0 px-6 align-middle border-l-0 border-r-0 text-xs whitespace-nowrap p-4">
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
                            <Button
                              variant="ghost"
                              className="!px-3 !py-1 !text-[10px] text-sky-600 shadow-none border border-sky-100 hover:bg-sky-50"
                              onClick={() => {
                                setEditingId(u.id);
                                setSelectedRole(u.role);
                              }}
                            >
                              Edit Role
                            </Button>
                            {u.role === "TRAVELER" && (
                              <Button
                                variant="ghost"
                                className="!px-3 !py-1 !text-[10px] text-violet-600 shadow-none border border-violet-100 hover:bg-violet-50"
                                disabled={updating}
                                onClick={async () => {
                                  await changeRole({ variables: { id: u.id, role: "HOST" } });
                                  await refetch();
                                }}
                              >
                                Grant Premium
                              </Button>
                            )}
                            {u.role === "HOST" && (
                              <Button
                                variant="ghost"
                                className="!px-3 !py-1 !text-[10px] text-slate-500 shadow-none border border-slate-200 hover:bg-slate-50"
                                disabled={updating}
                                onClick={async () => {
                                  await changeRole({ variables: { id: u.id, role: "TRAVELER" } });
                                  await refetch();
                                }}
                              >
                                Revoke Premium
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
