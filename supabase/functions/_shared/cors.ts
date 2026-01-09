/**
 * Secure CORS configuration
 * Domains configured via environment variable for production
 */

/**
 * Get allowed origins from environment or defaults
 */
function getAllowedOrigins(): string[] {
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS');

  if (envOrigins) {
    // Production: comma-separated list from env var
    return envOrigins.split(',').map(o => o.trim());
  }

  // Development fallback
  return [
    'http://localhost:5173',
    'http://localhost:4173',
  ];
}

/**
 * Get CORS headers for a specific origin
 * Rejects requests from unauthorized origins
 */
export function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = getAllowedOrigins();

  // If no origin header, reject (server-to-server requests should use service key)
  if (!origin) {
    return {
      'Access-Control-Allow-Origin': '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };
  }

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(allowed =>
    origin === allowed || origin === `https://${allowed}` || origin === `http://${allowed}`
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
