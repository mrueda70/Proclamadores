import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";
import { Loader2 } from "lucide-react";
import HomePage from "@/react-app/pages/Home";
import DailyReadings from "@/react-app/pages/DailyReadings";
import SimpleLogin from "@/react-app/pages/SimpleLogin";
import UserView from "@/react-app/pages/UserView";
import PinManagement from "@/react-app/pages/PinManagement";
import EucharistSchedule from "@/react-app/pages/EucharistSchedule";
import WeeklyReadings from "@/react-app/pages/WeeklyReadings";
import AdminRefreshReadings from "@/react-app/pages/AdminRefreshReadings";
import AdminAutoAssign from "@/react-app/pages/AdminAutoAssign";
import LectioDivina from "@/react-app/pages/LectioDivina";
import Cantos from "@/react-app/pages/Cantos";
import { AuthProvider, useAuth } from "@/react-app/contexts/AuthContext";

function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { authenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && role !== "admin") {
    return <Navigate to="/user" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { authenticated, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={!authenticated ? <SimpleLogin /> : <Navigate to={role === "admin" ? "/" : "/user"} replace />} 
      />
      
      <Route
        path="/"
        element={
          <ProtectedRoute requireAdmin>
            <HomePage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/user"
        element={
          <ProtectedRoute>
            <UserView />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/readings/:date"
        element={
          <ProtectedRoute>
            <DailyReadings />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/eucharist-schedule"
        element={
          <ProtectedRoute>
            <EucharistSchedule />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/weekly-readings"
        element={
          <ProtectedRoute>
            <WeeklyReadings />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/lectio-divina/:date"
        element={
          <ProtectedRoute>
            <LectioDivina />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/cantos/:date"
        element={
          <ProtectedRoute>
            <Cantos />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/pin-management"
        element={
          <ProtectedRoute requireAdmin>
            <PinManagement />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/refresh-readings"
        element={
          <ProtectedRoute requireAdmin>
            <AdminRefreshReadings />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/admin/auto-assign"
        element={
          <ProtectedRoute requireAdmin>
            <AdminAutoAssign />
          </ProtectedRoute>
        }
      />
      
      <Route path="*" element={<Navigate to={authenticated ? (role === "admin" ? "/" : "/user") : "/login"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}