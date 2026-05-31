import { createBrowserRouter } from "react-router-dom";
import { Landing } from "../pages/Landing";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { RequireHost } from "../auth/RequireHost";
import { RequireAdmin } from "../auth/RequireAdmin";

// Host pages
import { MyListings } from "../pages/host/MyListings";
import { CreateListing } from "../pages/host/CreateListing";
import { EditListing } from "../pages/host/EditListing";
import { SavedListings } from "../pages/host/SavedListings";
import { HostAnalytics } from "../pages/host/HostAnalytics";
import { HostProfile } from "../pages/host/HostProfile";

// Browse / detail
import { Browse } from "../pages/Browse";
import { ListingDetail } from "../pages/ListingDetail";

// AI Planner
import { AiPlanner } from "../pages/AiPlanner";

// New feature pages
import { Experienced } from "../pages/Experienced";
import { HostPublicProfile } from "../pages/HostPublicProfile";
import { TravelerAccount } from "../pages/TravelerAccount";
import { Itinerary } from "../pages/Itinerary";

// Admin pages
import { AdminPendingListings } from "../pages/admin/AdminPendingListings";
import { AdminOverview } from "../pages/admin/AdminOverview";
import { AdminUsers } from "../pages/admin/AdminUsers";
import { AdminUserDetail } from "../pages/admin/AdminUserDetail";
import { AdminAllListings } from "../pages/admin/AdminAllListings";
import { AdminReports } from "../pages/admin/AdminReports";
import { AdminAuditLogs } from "../pages/admin/AdminAuditLogs";
import { AdminHostApplications } from "../pages/admin/AdminHostApplications";
import { AdminFeatureFlags } from "../pages/admin/AdminFeatureFlags";
import { ForgotPassword } from "../pages/ForgotPassword";

export const router = createBrowserRouter([
  // Public
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },
  { path: "/forgot-password", element: <ForgotPassword /> },

  // HOST + ADMIN only
  {
    path: "/dashboard",
    element: <RequireHost><MyListings /></RequireHost>,
  },
  {
    path: "/browse",
    element: <RequireHost><Browse /></RequireHost>,
  },
  {
    path: "/listing/:id",
    element: <RequireHost><ListingDetail /></RequireHost>,
  },
  {
    path: "/saved",
    element: <RequireHost><SavedListings /></RequireHost>,
  },
  {
    path: "/ai-planner",
    element: <RequireHost><AiPlanner /></RequireHost>,
  },
  {
    path: "/experienced",
    element: <RequireHost><Experienced /></RequireHost>,
  },
  {
    path: "/itinerary",
    element: <RequireHost><Itinerary /></RequireHost>,
  },
  {
    path: "/hosts/:firebaseUid",
    element: <RequireHost><HostPublicProfile /></RequireHost>,
  },
  {
    path: "/account",
    element: <RequireHost><TravelerAccount /></RequireHost>,
  },
  {
    path: "/host/create",
    element: <RequireHost><CreateListing /></RequireHost>,
  },
  {
    path: "/host/edit/:id",
    element: <RequireHost><EditListing /></RequireHost>,
  },
  {
    path: "/host/analytics",
    element: <RequireHost><HostAnalytics /></RequireHost>,
  },
  {
    path: "/host/profile",
    element: <RequireHost><HostProfile /></RequireHost>,
  },

  // ADMIN only
  {
    path: "/admin",
    element: <RequireAdmin><AdminOverview /></RequireAdmin>,
  },
  {
    path: "/admin/pending",
    element: <RequireAdmin><AdminPendingListings /></RequireAdmin>,
  },
  {
    path: "/admin/listings",
    element: <RequireAdmin><AdminAllListings /></RequireAdmin>,
  },
  {
    path: "/admin/users",
    element: <RequireAdmin><AdminUsers /></RequireAdmin>,
  },
  {
    path: "/admin/users/:firebaseUid",
    element: <RequireAdmin><AdminUserDetail /></RequireAdmin>,
  },
  {
    path: "/admin/reports",
    element: <RequireAdmin><AdminReports /></RequireAdmin>,
  },
  {
    path: "/admin/audit-logs",
    element: <RequireAdmin><AdminAuditLogs /></RequireAdmin>,
  },
  {
    path: "/admin/host-applications",
    element: <RequireAdmin><AdminHostApplications /></RequireAdmin>,
  },
  {
    path: "/admin/features",
    element: <RequireAdmin><AdminFeatureFlags /></RequireAdmin>,
  },
]);
