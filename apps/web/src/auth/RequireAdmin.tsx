import { Navigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { isAdminEmail } from "./admin";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-4">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (!isAdminEmail(user.email)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
