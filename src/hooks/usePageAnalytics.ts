import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';

/**
 * GDPR-friendly page analytics hook.
 * Only tracks page path + monthly view count (no user IDs stored).
 * Call this once in AppLayout to track all page visits.
 */
export function usePageAnalytics() {
  const location = useLocation();
  const { user } = useAuth();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    // Only track if user is logged in
    if (!user) return;

    // Don't track the same path twice in a row (e.g., on re-render)
    if (lastTrackedPath.current === location.pathname) return;
    lastTrackedPath.current = location.pathname;

    // Track page view (async, fire-and-forget)
    const trackPageView = async () => {
      try {
        // Clean path for analytics (remove IDs, normalize)
        const cleanPath = cleanPathForAnalytics(location.pathname);
        
        await supabase.rpc('increment_page_view', { 
          p_page_path: cleanPath 
        });
      } catch (error) {
        // Silent fail - analytics should never break the app
        console.debug('Page analytics error (non-critical):', error);
      }
    };

    trackPageView();
  }, [location.pathname, user]);
}

/**
 * Clean path for analytics:
 * - Remove UUIDs and IDs
 * - Normalize dynamic segments
 * - Keep main route structure
 */
function cleanPathForAnalytics(path: string): string {
  // Remove UUIDs (8-4-4-4-12 format)
  let cleaned = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
  
  // Remove numeric IDs in path
  cleaned = cleaned.replace(/\/\d+(?=\/|$)/g, '/:id');
  
  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, '');
  
  // Ensure starts with /
  if (!cleaned.startsWith('/')) {
    cleaned = '/' + cleaned;
  }
  
  // Default to /dashboard for root
  if (cleaned === '' || cleaned === '/') {
    cleaned = '/dashboard';
  }
  
  return cleaned;
}
