import { createBrowserRouter } from "react-router-dom";
import { Landing } from "../pages/Landing";
import { Login } from "../pages/Login";
import { Register } from "../pages/Register";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RequireAdmin } from "../auth/RequireAdmin";

// Host pages
import { MyListings } from "../pages/host/MyListings";
import { CreateListing } from "../pages/host/CreateListing";
import { EditListing } from "../pages/host/EditListing";
import { SavedListings } from "../pages/host/SavedListings";
import { HostAnalytics } from "../pages/host/HostAnalytics";

// Traveler / Browse
import { Browse } from "../pages/Browse";
import { ListingDetail } from "../pages/ListingDetail";

// Admin pages
import { AdminPendingListings } from "../pages/admin/AdminPendingListings";
import { AdminOverview } from "../pages/admin/AdminOverview";
import { AdminUsers } from "../pages/admin/AdminUsers";
import { AdminAllListings } from "../pages/admin/AdminAllListings";
import { AdminReports } from "../pages/admin/AdminReports";
import { AdminAuditLogs } from "../pages/admin/AdminAuditLogs";

export const router = createBrowserRouter([
  // Public
  { path: "/", element: <Landing /> },
  { path: "/login", element: <Login /> },
  { path: "/register", element: <Register /> },

  // Protected — host dashboard
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <MyListings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/browse",
    element: (
      <ProtectedRoute>
        <Browse />
      </ProtectedRoute>
    ),
  },
  {
    path: "/listing/:id",
    element: (
      <ProtectedRoute>
        <ListingDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: "/saved",
    element: (
      <ProtectedRoute>
        <SavedListings />
      </ProtectedRoute>
    ),
  },
  {
    path: "/host/create",
    element: (
      <ProtectedRoute>
        <CreateListing />
      </ProtectedRoute>
    ),
  },
  {
    path: "/host/edit/:id",
    element: (
      <ProtectedRoute>
        <EditListing />
      </ProtectedRoute>
    ),
  },
  {
    path: "/host/analytics",
    element: (
      <ProtectedRoute>
        <HostAnalytics />
      </ProtectedRoute>
    ),
  },

  // Admin routes
  {
    path: "/admin",
    element: (
      <RequireAdmin>
        <AdminOverview />
      </RequireAdmin>
    ),
  },
  {
    path: "/admin/pending",
    element: (
      <RequireAdmin>
        <AdminPendingListings />
      </RequireAdmin>
    ),
  },
  {
    path: "/admin/listings",
    element: (
      <RequireAdmin>
        <AdminAllListings />
      </RequireAdmin>
    ),
  },
  {
    path: "/admin/users",
    element: (
      <RequireAdmin>
        <AdminUsers />
      </RequireAdmin>
    ),
  },
  {
    path: "/admin/reports",
    element: (
      <RequireAdmin>
        <AdminReports />
      </RequireAdmin>
    ),
  },
  {
    path: "/admin/audit-logs",
    element: (
      <RequireAdmin>
        <AdminAuditLogs />
      </RequireAdmin>
    ),
  },
]);
