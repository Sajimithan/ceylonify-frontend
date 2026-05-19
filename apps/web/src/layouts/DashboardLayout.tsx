import { Link, useLocation } from "react-router-dom";

import { auth } from "../auth/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../auth/useAuth";
import { isAdminEmail } from "../auth/admin";

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <li className="items-center">
      <Link
        to={to}
        className={`text-xs uppercase py-3 font-bold block ${
          active
            ? "text-sky-500 hover:text-sky-600"
            : "text-slate-700 hover:text-slate-500"
        }`}
      >
        {children}
      </Link>
    </li>
  );
}

export function DashboardLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  async function logout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans antialiased text-slate-800">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 bg-white shadow-xl md:flex md:flex-col z-20 overflow-y-auto relative">
        <div className="px-6 py-5">
          <Link
            className="md:block text-left text-slate-600 inline-block whitespace-nowrap text-sm uppercase font-bold"
            to="/"
          >
            Ceylonify
            <div className="text-[10px] text-slate-400 normal-case mt-1 font-semibold tracking-wider">
              {isAdmin ? "Admin & Host" : "Host Dashboard"}
            </div>
          </Link>
        </div>

        <div className="flex-1 px-6">
          <hr className="my-4 border-slate-200" />
          <h6 className="text-slate-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
            Host
          </h6>
          <ul className="flex flex-col list-none">
            <NavLink to="/">My Listings</NavLink>
            <NavLink to="/host/create">Create Listing</NavLink>
          </ul>

          {isAdmin && (
            <>
              <hr className="my-4 border-slate-200" />
              <h6 className="text-slate-500 text-xs uppercase font-bold block pt-1 pb-4 no-underline">
                Admin
              </h6>
              <ul className="flex flex-col list-none md:mb-4 gap-1">
                <NavLink to="/admin">Overview</NavLink>
                <NavLink to="/admin/pending">Pending Moderation</NavLink>
                <NavLink to="/admin/listings">All Listings</NavLink>
                <NavLink to="/admin/users">User Management</NavLink>
              </ul>
            </>
          )}

          <hr className="my-4 border-slate-200" />
          <button
            onClick={logout}
            className="text-xs uppercase py-3 font-bold block text-slate-600 hover:text-slate-800 text-left w-full transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 overflow-auto relative bg-slate-100 flex flex-col">
        {/* Navbar / Header overlap background */}
        <div className="relative bg-sky-600 pb-32 pt-12 md:pt-16 w-full flex-shrink-0 shadow-lg">
          <div className="px-4 md:px-10 mx-auto w-full">
            <div className="flex justify-between items-center text-white mb-4">
              <div>
                <h1 className="text-white text-2xl font-semibold">{title}</h1>
                {subtitle && (
                  <p className="text-white/80 text-sm mt-1 font-light tracking-wide">{subtitle}</p>
                )}
              </div>
              <div>{actions}</div>
            </div>
          </div>
        </div>

        {/* Page content overlapping header */}
        <div className="px-4 md:px-10 mx-auto w-full -mt-24 relative z-10 flex-1 flex flex-col">
          {children}
          
          <footer className="block pt-8 pb-4 mt-auto">
            <div className="container mx-auto px-4">
              <hr className="mb-4 border-b-1 border-slate-200" />
              <div className="flex flex-wrap items-center md:justify-between justify-center">
                <div className="w-full md:w-4/12 px-4">
                  <div className="text-sm text-slate-500 font-semibold py-1">
                    © {new Date().getFullYear()} Ceylonify
                  </div>
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
