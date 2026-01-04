/**
 * Sanitizes a URL to prevent XSS attacks.
 * Only allows http://, https://, and data: URLs for images.
 * Returns undefined for invalid or potentially malicious URLs.
 */
export function sanitizeImageUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== 'string') {
    return undefined;
  }

  const trimmedUrl = url.trim();
  
  // Only allow safe protocols
  const safeProtocols = ['https://', 'http://', 'data:image/'];
  const isValidProtocol = safeProtocols.some(protocol => 
    trimmedUrl.toLowerCase().startsWith(protocol)
  );

  if (!isValidProtocol) {
    return undefined;
  }

  // Block javascript: and other dangerous protocols that might be encoded
  const dangerousPatterns = [
    /javascript:/i,
    /vbscript:/i,
    /data:text/i,
    /data:application/i,
    /<script/i,
    /onerror/i,
    /onload/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedUrl)) {
      return undefined;
    }
  }

  return trimmedUrl;
}
