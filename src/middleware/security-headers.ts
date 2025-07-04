import type { MiddlewareResponseHandler } from "@solidjs/start/middleware";

/**
 * Security headers middleware for development
 * In production, use platform-specific configuration (Netlify _headers, Vercel vercel.json, etc.)
 */
export const securityHeaders: MiddlewareResponseHandler = async ({ request }, next) => {
  const response = await next();
  
  // Apply security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy", 
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"
  );
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.appwrite.io",
    "manifest-src 'self'",
    "worker-src 'self'"
  ].join("; ");
  
  response.headers.set("Content-Security-Policy", csp);
  
  // For service worker - prevent caching
  if (request.url.endsWith("/sw.js")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  
  // For manifest.json
  if (request.url.endsWith("/manifest.json")) {
    response.headers.set("Content-Type", "application/manifest+json");
    response.headers.set("Cache-Control", "public, max-age=3600");
  }
  
  return response;
};