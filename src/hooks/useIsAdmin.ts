import { useAuth } from '@/lib/auth-new';

/**
 * Hook to check if current user is admin
 * Returns the is_admin flag from the user object
 */
export function useIsAdmin() {
  const { user } = useAuth();

  return {
    data: user?.is_admin || false,
    isLoading: false,
    error: null
  };
}
