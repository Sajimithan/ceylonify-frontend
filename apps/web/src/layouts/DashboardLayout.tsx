import { useState } from "react";
import { useFeatureFlags } from "../auth/useFeatureFlags";
import { NotificationBell } from "../notifications/NotificationBell";
import { Link, useLocation } from "react-router-dom";
import { auth } from "../auth/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "../auth/useAuth";
import { isAdminEmail } from "../auth/admin";
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BookmarkIcon,
  PlusCircleIcon,
  ChartBarIcon,
  UserIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  FlagIcon,
  ShieldCheckIcon,
  DocumentCheckIcon,
  Cog6ToothIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  SparklesIcon,
  StarIcon,
  CreditCardIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

const NAV_ICONS: Record<string, React.ElementType> = {
  "/browse":                   MagnifyingGlassIcon,
  "/saved":                    BookmarkIcon,
  "/ai-planner":               SparklesIcon,
  "/experienced":              StarIcon,
  "/itinerary":                CalendarDaysIcon,
  "/account":                  CreditCardIcon,
  "/dashboard":                HomeIcon,
  "/host/create":              PlusCircleIcon,
  "/host/analytics":           ChartBarIcon,
  "/host/profile":             UserIcon,
  "/admin":                    ShieldCheckIcon,
  "/admin/pending":            ClipboardDocumentListIcon,
  "/admin/listings":           ClipboardDocumentListIcon,
  "/admin/users":              UsersIcon,
  "/admin/host-applications":  DocumentCheckIcon,
  "/admin/reports":            FlagIcon,
  "/admin/audit-logs":         ClockIcon,
  "/admin/features":           Cog6ToothIcon,
};

function NavLink({
  to,
  children,
  onNav,
}: {
  to: string;
  children: React.ReactNode;
  onNav?: () => void;
}) {
  const { pathname } = useLocation();
  const active =
    pathname === to ||
    (to !== "/dashboard" && to !== "/admin/users" && pathname.startsWith(to)) ||
    (to === "/admin/users" && (pathname === "/admin/users" || pathname.startsWith("/admin/users/")));
  const Icon = NAV_ICONS[to] ?? HomeIcon;

  return (
    <li>
      <Link
        to={to}
        onClick={onNav}
        className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-all duration-150 group border-l-2 ${
          active
            ? "bg-brand-600/20 text-white border-brand-400"
            : "text-slate-400 hover:bg-sidebar-hover hover:text-white border-transparent"
        }`}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 ${
            active
              ? "text-brand-400"
              : "text-slate-500 group-hover:text-slate-300"
          }`}
        />
        <span>{children}</span>
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
  const { isEnabledFor } = useFeatureFlags();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function logout() {
    await signOut(auth);
    window.location.href = "/login";
  }

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-sidebar-bg font-sans antialiased text-slate-800">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-20
          w-64 flex-shrink-0 flex flex-col
          bg-sidebar-bg shadow-2xl
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-y-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
          <Link
            to="/dashboard"
            onClick={closeSidebar}
            className="flex items-center gap-2.5"
          >
            <img
              src="/logo.png"
              alt="Ceylonify"
              className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-md ring-1 ring-brand-400/40"
            />
            <div>
              <div className="text-white text-sm font-bold tracking-wide leading-tight">
                Ceylonify
              </div>
              <div className="text-[9px] font-semibold uppercase tracking-widest text-sidebar-muted">
                {isAdmin ? "Admin & Host" : "Host Dashboard"}
              </div>
            </div>
          </Link>
          <button
            className="md:hidden text-slate-400 hover:text-white transition-colors"
            onClick={closeSidebar}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="mb-2">
            <p className="px-6 text-[9px] font-bold uppercase tracking-widest text-sidebar-muted mb-1">
              Discover
            </p>
            <ul className="space-y-0.5">
              <NavLink to="/browse" onNav={closeSidebar}>Browse Experiences</NavLink>
              <NavLink to="/saved" onNav={closeSidebar}>Saved Listings</NavLink>
              <NavLink to="/itinerary" onNav={closeSidebar}>My Itinerary</NavLink>
              <NavLink to="/experienced" onNav={closeSidebar}>My Experiences</NavLink>
              {isEnabledFor("AI_TRIP_PLANNER", "HOST") && (
                <NavLink to="/ai-planner" onNav={closeSidebar}>AI Travel Planner</NavLink>
              )}
              {!isAdmin && (
                <NavLink to="/account" onNav={closeSidebar}>Account & Premium</NavLink>
              )}
            </ul>
          </div>

          <div className="mt-5 mb-2">
            <p className="px-6 text-[9px] font-bold uppercase tracking-widest text-sidebar-muted mb-1">
              Host
            </p>
            <ul className="space-y-0.5">
              <NavLink to="/dashboard" onNav={closeSidebar}>My Listings</NavLink>
              {isEnabledFor("HOST_LISTING_CREATION", "HOST") && (
                <NavLink to="/host/create" onNav={closeSidebar}>Create Listing</NavLink>
              )}
              <NavLink to="/host/analytics" onNav={closeSidebar}>Analytics</NavLink>
              {!isAdmin && (
                <NavLink to="/host/profile" onNav={closeSidebar}>Profile & Settings</NavLink>
              )}
            </ul>
          </div>

          {isAdmin && (
            <div className="mt-5 mb-2">
              <p className="px-6 text-[9px] font-bold uppercase tracking-widest text-sidebar-muted mb-1">
                Admin
              </p>
              <ul className="space-y-0.5">
                <NavLink to="/admin" onNav={closeSidebar}>Overview</NavLink>
                <NavLink to="/admin/pending" onNav={closeSidebar}>Pending Moderation</NavLink>
                <NavLink to="/admin/listings" onNav={closeSidebar}>All Listings</NavLink>
                <NavLink to="/admin/users" onNav={closeSidebar}>User Management</NavLink>
                <NavLink to="/admin/host-applications" onNav={closeSidebar}>Host Applications</NavLink>
                <NavLink to="/admin/reports" onNav={closeSidebar}>Reports</NavLink>
                <NavLink to="/admin/audit-logs" onNav={closeSidebar}>Audit Logs</NavLink>
                <NavLink to="/admin/features" onNav={closeSidebar}>Feature Control</NavLink>
                <NavLink to="/host/profile" onNav={closeSidebar}>Profile & Settings</NavLink>
              </ul>
            </div>
          )}
        </nav>

        {/* Logout */}
        <div className="border-t border-sidebar-border px-2 py-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-sidebar-hover hover:text-white transition-all duration-150"
          >
            <ArrowLeftStartOnRectangleIcon className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto relative bg-surface-page flex flex-col min-w-0">

        {/* Header */}
        <div className="relative bg-header-gradient pb-32 pt-12 md:pt-16 w-full flex-shrink-0 shadow-lg">
          <div className="px-4 md:px-10 mx-auto w-full">
            <div className="flex justify-between items-start text-white">
              <div className="flex items-center gap-3">
                <button
                  className="md:hidden text-white/80 hover:text-white transition-colors mr-1"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Bars3Icon className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-white text-2xl font-semibold">{title}</h1>
                  {subtitle && (
                    <p className="text-white/70 text-sm mt-0.5 font-light tracking-wide">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {actions}
                <NotificationBell />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="px-4 md:px-10 mx-auto w-full -mt-24 relative z-10 flex-1 flex flex-col">
          {children}

          <footer className="block pt-8 pb-4 mt-auto">
            <div className="container mx-auto px-4">
              <hr className="mb-4 border-slate-200" />
              <div className="text-sm text-slate-400 font-semibold py-1">
                © {new Date().getFullYear()} Ceylonify
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
