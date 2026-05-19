import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login";
import { ProtectedRoute } from "./auth/ProtectedRoute";

// Host pages
import { MyListings } from "./pages/host/MyListings";
import { CreateListing } from "./pages/host/CreateListing";

// Admin pages (Day 5)
import { RequireAdmin } from "./auth/RequireAdmin";
import { AdminPendingListings } from "./pages/admin/AdminPendingListings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Host */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MyListings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/host/create"
          element={
            <ProtectedRoute>
              <CreateListing />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="/admin/pending"
          element={
            <RequireAdmin>
              <AdminPendingListings />
            </RequireAdmin>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
