import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useConsent } from "@/hooks/useConsent";
import { useProfile } from "@/hooks/useProfile";
import { LoadingPage } from "@/components/ui/loading-state";
import { CookieBanner } from "@/components/layout/CookieBanner";

// Pages
import LoginPage from "./pages/Login";
import ConsentPage from "./pages/Consent";
import ProfileOnboardingPage from "./pages/ProfileOnboarding";
import PricingPage from "./pages/Pricing";
import DashboardPage from "./pages/Dashboard";
import DiaryPage from "./pages/Diary";
import TrendsPage from "./pages/Trends";

import AccountPage from "./pages/Account";
import SettingsPage from "./pages/Settings";
import CyclePage from "./pages/Cycle";
import CycleOnboardingPage from "./pages/CycleOnboarding";
import RecipesPage from "./pages/Recipes";
import RecipeDetailPage from "./pages/RecipeDetail";
import RecipeAdminPage from "./pages/RecipeAdmin";
import SleepPage from "./pages/Sleep";
import MovementPage from "./pages/Movement";
import MeditationPage from "./pages/Meditation";
import CommunityPage from "./pages/Community";
import CommunityPostPage from "./pages/CommunityPost";
import ContentAdminPage from "./pages/ContentAdmin";
import InstallPage from "./pages/Install";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Terms from "./pages/Terms";
import IntendedUse from "./pages/IntendedUse";
import MonthlyAnalysisPage from "./pages/MonthlyAnalysis";
import SubscriptionPage from "./pages/Subscription";
import NutritionAdminPage from "./pages/NutritionAdmin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper - checks consent AND profile completion
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasCompletedConsent, isLoading: consentLoading } = useConsent();
  const { hasCompletedProfile, isLoading: profileLoading } = useProfile();

  if (loading || consentLoading || profileLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedConsent) {
    return <Navigate to="/consent" replace />;
  }

  if (!hasCompletedProfile) {
    return <Navigate to="/profile-onboarding" replace />;
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
    return <Navigate to="/profile-onboarding" replace />;
  }

  return <>{children}</>;
}

// Profile onboarding route wrapper
function ProfileOnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasCompletedConsent, isLoading: consentLoading } = useConsent();
  const { hasCompletedProfile, isLoading: profileLoading } = useProfile();

  if (loading || consentLoading || profileLoading) {
    return <LoadingPage />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!hasCompletedConsent) {
    return <Navigate to="/consent" replace />;
  }

  if (hasCompletedProfile) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/install" element={<InstallPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/intended-use" element={<IntendedUse />} />
      
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
      
      {/* Profile onboarding route */}
      <Route path="/profile-onboarding" element={
        <ProfileOnboardingRoute>
          <ProfileOnboardingPage />
        </ProfileOnboardingRoute>
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
      {/* Dutch alias */}
      <Route path="/dagboek" element={
        <ProtectedRoute>
          <DiaryPage />
        </ProtectedRoute>
      } />
      <Route path="/trends" element={
        <ProtectedRoute>
          <TrendsPage />
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
      <Route path="/slaap" element={
        <ProtectedRoute>
          <SleepPage />
        </ProtectedRoute>
      } />
      <Route path="/bewegen" element={
        <ProtectedRoute>
          <MovementPage />
        </ProtectedRoute>
      } />
      <Route path="/meditatie" element={
        <ProtectedRoute>
          <MeditationPage />
        </ProtectedRoute>
      } />
      <Route path="/community" element={
        <ProtectedRoute>
          <CommunityPage />
        </ProtectedRoute>
      } />
      <Route path="/community/:postId" element={
        <ProtectedRoute>
          <CommunityPostPage />
        </ProtectedRoute>
      } />
      <Route path="/content-beheer" element={
        <ProtectedRoute>
          <ContentAdminPage />
        </ProtectedRoute>
      } />
      <Route path="/analyse" element={
        <ProtectedRoute>
          <MonthlyAnalysisPage />
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      <Route path="/voeding-beheer" element={
        <ProtectedRoute>
          <NutritionAdminPage />
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
          <CookieBanner />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;