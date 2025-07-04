# Security Headers Configuration

This document explains the security headers implemented in the MyLife Calendar app and how to configure them for different deployment platforms.

## Headers Implemented

### 1. X-Frame-Options: DENY
Prevents the app from being embedded in iframes, protecting against clickjacking attacks.

### 2. X-Content-Type-Options: nosniff
Prevents browsers from MIME-sniffing responses away from the declared content type.

### 3. X-XSS-Protection: 1; mode=block
Enables XSS filtering in older browsers that support it.

### 4. Referrer-Policy: strict-origin-when-cross-origin
Controls how much referrer information is sent with requests.

### 5. Permissions-Policy
Disables access to sensitive browser features that the app doesn't need:
- Accelerometer
- Camera
- Geolocation
- Gyroscope
- Magnetometer
- Microphone
- Payment
- USB

### 6. Content-Security-Policy (CSP)
Restricts resources the app can load:
- `default-src 'self'` - Only allow resources from same origin
- `script-src 'self' 'wasm-unsafe-eval'` - Allow scripts from same origin and WASM
- `style-src 'self' 'unsafe-inline'` - Allow styles from same origin and inline styles
- `img-src 'self' data: blob:` - Allow images from same origin, data URLs, and blobs
- `font-src 'self'` - Only allow fonts from same origin
- `connect-src 'self' https://api.appwrite.io` - API connections allowed
- `manifest-src 'self'` - PWA manifest from same origin
- `worker-src 'self'` - Service workers from same origin

## Platform-Specific Configuration

### Netlify
Headers are configured in `/public/_headers`. This file is automatically processed by Netlify during deployment.

### Vercel
Headers are configured in `/vercel.json` at the root of the project.

### Cloudflare Pages
Create a `/public/_headers` file (same as Netlify) or use Cloudflare Workers for more control.

### Custom Server
Use the middleware in `/src/middleware/security-headers.ts` or configure your web server (Nginx, Apache, etc.).

## Testing Security Headers

1. **Development**: The security headers middleware is applied automatically in development.

2. **Production**: Use online tools to verify headers:
   - [Security Headers](https://securityheaders.com/)
   - [Mozilla Observatory](https://observatory.mozilla.org/)

3. **Browser DevTools**: Check Network tab to see response headers.

## HTTPS-Only Headers

The following header should only be enabled in production with HTTPS:

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

This forces browsers to always use HTTPS for your domain.

## Customization

### Allowing External Resources

If you need to allow external resources (e.g., analytics, fonts), update the CSP:

```
# Example: Allow Google Fonts
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
```

### Development vs Production

Some headers might need different values for development:
- CSP might need 'unsafe-eval' for hot module replacement
- CORS headers might be more permissive

## Security Considerations

1. **No Inline Scripts**: The CSP blocks inline `<script>` tags. Use external files or event handlers.

2. **No eval()**: The CSP blocks `eval()` and similar functions (except for WASM).

3. **HTTPS Required**: Many security features only work over HTTPS.

4. **Regular Updates**: Review and update headers as security best practices evolve.

## Troubleshooting

### Styles Not Loading
- Check if inline styles are blocked by CSP
- Consider moving styles to external files

### Scripts Blocked
- Ensure all scripts are from allowed origins
- Check browser console for CSP violations

### PWA Not Working
- Verify manifest.json is served with correct content type
- Check service worker headers