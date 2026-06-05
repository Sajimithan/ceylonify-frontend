import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { useAuth } from "./useAuth";
import { ME_QUERY } from "../pages/browse.gql";

const MY_HOST_APPLICATION = gql`
  query MyHostApplication {
    myHostApplication {
      status
      reviewNote
    }
  }
`;

function LogoutButton() {
  async function logout() {
    await signOut(auth);
    window.location.href = "/";
  }
  return (
    <button
      onClick={logout}
      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider"
    >
      Sign out
    </button>
  );
}

function PendingGate() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-100 px-4 overflow-auto">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
        <div className="text-5xl mb-4">⏳</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Application Under Review</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Your host application has been submitted and is currently being reviewed by our team.
        </p>
        <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-4 mb-6 text-sm text-amber-700">
          We'll notify you by email once your account is approved. This usually takes
          <span className="font-bold"> 2–3 business days</span>.
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

function RejectedGate({ note }: { note?: string | null }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-100 px-4 overflow-auto">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Application Not Approved</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-4">
          Unfortunately your host application was not approved at this time.
        </p>
        {note && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 mb-4 text-sm text-red-700 text-left">
            <span className="font-bold">Reason: </span>{note}
          </div>
        )}
        <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-3 mb-6 text-sm text-sky-700">
          If you believe this is an error, please contact support.
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

function TravelerGate() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-100 px-4 overflow-auto">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-10 text-center">
        <div className="text-5xl mb-4">📱</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Account Registered!</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          Your Traveler account is active. The Ceylonify web dashboard is
          reserved for hosts and administrators.
        </p>
        <div className="rounded-xl bg-sky-50 border border-sky-100 px-4 py-4 mb-6 text-sm text-sky-700 font-semibold">
          Please use the <span className="font-bold">Ceylonify mobile app</span> to discover
          and book experiences across Sri Lanka.
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}

export function RequireHost({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const { data: meData, loading: meLoading, error: meError } = useQuery(ME_QUERY, {
    skip: !user,
    fetchPolicy: "cache-first",
  });

  const role = meData?.me?.role;

  const { data: appData, loading: appLoading } = useQuery(MY_HOST_APPLICATION, {
    skip: !user || role !== "TRAVELER",
    fetchPolicy: "cache-first",
  });

  useEffect(() => {
    if (meError) {
      signOut(auth).then(() => navigate("/", { replace: true }));
    }
  }, [meError, navigate]);

  if (authLoading || (user && meLoading && !meData)) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-sm font-semibold">
        Loading…
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  if (!role) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400 text-sm font-semibold">
        Verifying access…
      </div>
    );
  }

  if (role === "TRAVELER") {
    if (appLoading && !appData) {
      return (
        <div className="flex min-h-screen items-center justify-center text-slate-400 text-sm font-semibold">
          Checking application status…
        </div>
      );
    }
    const status = appData?.myHostApplication?.status;
    if (status === "PENDING") return <PendingGate />;
    if (status === "REJECTED") return <RejectedGate note={appData?.myHostApplication?.reviewNote} />;
    return <TravelerGate />;
  }

  return <>{children}</>;
}
