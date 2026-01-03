import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useConsent } from "@/hooks/useConsent";
import { LoadingPage } from "@/components/ui/loading-state";

// Pages
import LoginPage from "./pages/Login";
import ConsentPage from "./pages/Consent";
import PricingPage from "./pages/Pricing";
import DashboardPage from "./pages/Dashboard";
import DiaryPage from "./pages/Diary";
import TrendsPage from "./pages/Trends";
import PatternsPage from "./pages/Patterns";
import AccountPage from "./pages/Account";
import SettingsPage from "./pages/Settings";
import CyclePage from "./pages/Cycle";
import CycleOnboardingPage from "./pages/CycleOnboarding";
import RecipesPage from "./pages/Recipes";
import RecipeDetailPage from "./pages/RecipeDetail";
import RecipeAdminPage from "./pages/RecipeAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasCompletedConsent, isLoading: consentLoading } = useConsent();

  if (loading || consentLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedConsent) {
    return <Navigate to="/consent" replace />;
  }

  return <>{children}</>;
}

// Auth route wrapper (redirect to dashboard if already logged in)
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingPage />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

// Consent route wrapper
function ConsentRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasCompletedConsent, isLoading: consentLoading } = useConsent();

  if (loading || consentLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasCompletedConsent) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/pricing" element={<PricingPage />} />
      
      {/* Auth routes */}
      <Route path="/login" element={
        <AuthRoute>
          <LoginPage />
        </AuthRoute>
      } />
      
      {/* Consent route */}
      <Route path="/consent" element={
        <ConsentRoute>
          <ConsentPage />
        </ConsentRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/diary" element={
        <ProtectedRoute>
          <DiaryPage />
        </ProtectedRoute>
      } />
      <Route path="/trends" element={
        <ProtectedRoute>
          <TrendsPage />
        </ProtectedRoute>
      } />
      <Route path="/patterns" element={
        <ProtectedRoute>
          <PatternsPage />
        </ProtectedRoute>
      } />
      <Route path="/account" element={
        <ProtectedRoute>
          <AccountPage />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <SettingsPage />
        </ProtectedRoute>
      } />
      <Route path="/cycle" element={
        <ProtectedRoute>
          <CyclePage />
        </ProtectedRoute>
      } />
      <Route path="/cycle/onboarding" element={
        <ProtectedRoute>
          <CycleOnboardingPage />
        </ProtectedRoute>
      } />
      <Route path="/recepten" element={
        <ProtectedRoute>
          <RecipesPage />
        </ProtectedRoute>
      } />
      <Route path="/recepten/:id" element={
        <ProtectedRoute>
          <RecipeDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/recepten-beheer" element={
        <ProtectedRoute>
          <RecipeAdminPage />
        </ProtectedRoute>
      } />
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;