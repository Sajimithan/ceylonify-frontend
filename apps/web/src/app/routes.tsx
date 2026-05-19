import { createBrowserRouter } from "react-router-dom";
import { Login } from "../pages/Login";
import { ProtectedRoute } from "../auth/ProtectedRoute";
import { RequireAdmin } from "../auth/RequireAdmin";
import { MyListings } from "../pages/host/MyListings";
import { CreateListing } from "../pages/host/CreateListing";
import { EditListing } from "../pages/host/EditListing";
import { AdminPendingListings } from "../pages/admin/AdminPendingListings";
import { AdminOverview } from "../pages/admin/AdminOverview";
import { AdminUsers } from "../pages/admin/AdminUsers";
import { AdminAllListings } from "../pages/admin/AdminAllListings";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },

  // Host routes
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MyListings />
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

  // Admin routes — require authenticated admin email
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
    path: "/admin/users",
    element: (
      <RequireAdmin>
        <AdminUsers />
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
]);

