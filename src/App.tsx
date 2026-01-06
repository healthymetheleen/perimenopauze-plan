import { lazy, Suspense } from "react";
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

// Lazy loaded pages for code splitting
const LoginPage = lazy(() => import("./pages/Login"));
const ConsentPage = lazy(() => import("./pages/Consent"));
const ProfileOnboardingPage = lazy(() => import("./pages/ProfileOnboarding"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const DashboardPage = lazy(() => import("./pages/Dashboard"));
const DiaryPage = lazy(() => import("./pages/Diary"));
const TrendsPage = lazy(() => import("./pages/Trends"));
const AccountPage = lazy(() => import("./pages/Account"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const CyclePage = lazy(() => import("./pages/Cycle"));
const CycleOnboardingPage = lazy(() => import("./pages/CycleOnboarding"));
const RecipesPage = lazy(() => import("./pages/Recipes"));
const RecipeDetailPage = lazy(() => import("./pages/RecipeDetail"));
const RecipeAdminPage = lazy(() => import("./pages/RecipeAdmin"));
const SleepPage = lazy(() => import("./pages/Sleep"));
const MovementPage = lazy(() => import("./pages/Movement"));
const MeditationPage = lazy(() => import("./pages/Meditation"));
const CommunityPage = lazy(() => import("./pages/Community"));
const CommunityPostPage = lazy(() => import("./pages/CommunityPost"));
const ContentAdminPage = lazy(() => import("./pages/ContentAdmin"));
const InstallPage = lazy(() => import("./pages/Install"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Terms = lazy(() => import("./pages/Terms"));
const IntendedUse = lazy(() => import("./pages/IntendedUse"));
const MonthlyAnalysisPage = lazy(() => import("./pages/MonthlyAnalysis"));
const SubscriptionPage = lazy(() => import("./pages/Subscription"));
const NutritionAdminPage = lazy(() => import("./pages/NutritionAdmin"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboard"));
const ProductsPage = lazy(() => import("./pages/Products"));
const EducationPage = lazy(() => import("./pages/Education"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
    <Suspense fallback={<LoadingPage />}>
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
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminDashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/producten" element={
        <ProtectedRoute>
          <ProductsPage />
        </ProtectedRoute>
      } />
      <Route path="/educatie" element={
        <ProtectedRoute>
          <EducationPage />
        </ProtectedRoute>
      } />
      
      
      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    </Suspense>
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