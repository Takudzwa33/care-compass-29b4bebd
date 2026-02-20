import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import PatientManagement from "@/pages/PatientManagement";
import NurseManagement from "@/pages/NurseManagement";
import RatioCalculation from "@/pages/RatioCalculation";
import CodeBlueManagement from "@/pages/CodeBlueManagement";
import AlertsNotifications from "@/pages/AlertsNotifications";
import PatientFeedback from "@/pages/PatientFeedback";
import ReportsAnalytics from "@/pages/ReportsAnalytics";
import AdminSettings from "@/pages/AdminSettings";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <span className="animate-spin w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><PatientManagement /></ProtectedRoute>} />
      <Route path="/nurses" element={<ProtectedRoute><NurseManagement /></ProtectedRoute>} />
      <Route path="/ratios" element={<ProtectedRoute><RatioCalculation /></ProtectedRoute>} />
      <Route path="/code-blue" element={<ProtectedRoute><CodeBlueManagement /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><AlertsNotifications /></ProtectedRoute>} />
      <Route path="/feedback" element={<ProtectedRoute><PatientFeedback /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ReportsAnalytics /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminSettings /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
