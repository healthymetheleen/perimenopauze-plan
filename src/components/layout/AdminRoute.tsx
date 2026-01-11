import { Navigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingPage } from "@/components/ui/loading-state";

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * AdminRoute - Server-validated admin route protection
 * 
 * This component wraps admin pages and ensures:
 * 1. User is authenticated
 * 2. User has admin role (verified via RLS-protected user_roles table)
 * 
 * The useIsAdmin hook queries the user_roles table which is protected by RLS,
 * so the admin status cannot be faked client-side.
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Show loading while checking auth and admin status
  if (authLoading || adminLoading) {
    return <LoadingPage />;
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Not an admin - redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
