/**
 * Secure CORS configuration
 * IMPORTANT: Update ALLOWED_ORIGINS with your actual production domain(s)
 */

// TODO: Replace with your actual domain(s)
const ALLOWED_ORIGINS = [
  'http://localhost:5173',           // Local development
  'http://localhost:4173',           // Local preview
  'https://YOUR-DOMAIN.com',         // ⚠️ REPLACE THIS with your production domain
  'https://www.YOUR-DOMAIN.com',     // ⚠️ REPLACE THIS with your www domain
];

/**
 * Get CORS headers for a specific origin
 * Rejects requests from unauthorized origins
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  // If no origin header, reject (server-to-server requests should use service key)
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
  }

  // Check if origin is allowed
  const isAllowed = ALLOWED_ORIGINS.some(allowed =>
    origin === allowed || origin.endsWith(allowed)
  );

  if (!isAllowed) {
    console.warn(`Rejected CORS request from unauthorized origin: ${origin}`);
    return {
      'Access-Control-Allow-Origin': '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
}

/**
 * Handle OPTIONS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}
