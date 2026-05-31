import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./useAuth";
import { ME_QUERY } from "../pages/browse.gql";

function TravelerGate() {
  async function logout() {
    await signOut(auth);
    window.location.href = "/";
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-100 px-4 overflow-auto">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
        <div className="text-5xl mb-4">📱</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">
          Account Registered!
        </h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Your Traveler account is active. The Ceylonify web dashboard is
          reserved for hosts and administrators.
        </p>
        <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-4 mb-6 text-sm text-sky-700 font-semibold">
          Please use the{" "}
          <span className="font-bold">Ceylonify mobile app</span> to discover
          and book experiences across Sri Lanka.
        </div>
        <button
          onClick={logout}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export function RequireHost({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data, loading: meLoading, error: meError } = useQuery(ME_QUERY, {
    skip: !user,
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    if (meError) {
      signOut(auth).then(() => navigate("/", { replace: true }));
    }
  }, [meError, navigate]);

  if (authLoading || (user && meLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-sm font-semibold">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  const role = data?.me?.role;

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-sm font-semibold">
        Verifying access…
      </div>
    );
  }

  if (role === "TRAVELER") {
    return <TravelerGate />;
  }

  return <>{children}</>;
}
