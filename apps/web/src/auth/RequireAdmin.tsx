import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./useAuth";
import { ME_QUERY } from "../pages/browse.gql";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data, loading: meLoading, error: meError } = useQuery(ME_QUERY, {
    skip: !user,
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (meError) {
      signOut(auth).then(() => navigate("/", { replace: true }));
    }
  }, [meError, navigate]);

  if (authLoading || (user && meLoading && !data)) {
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

  if (role !== "ADMIN") {
    // HOST gets dashboard, TRAVELER gets redirected to login-equivalent
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
