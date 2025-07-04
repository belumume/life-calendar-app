# Security Best Practices

## Overview

This document outlines security best practices for the MyLife Calendar application, focusing on maintaining zero-knowledge architecture and protecting user data.

## 1. Encryption Standards

### Current Implementation
- **Algorithm**: AES-GCM (256-bit)
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **IV Generation**: Cryptographically secure random for each encryption
- **Salt**: 32 bytes, securely random

### Best Practices
```typescript
// Always use crypto.getRandomValues for random data
const iv = new Uint8Array(16);
crypto.getRandomValues(iv);

// Never reuse IVs
const encryptData = async (data: string): Promise<EncryptedData> => {
  const iv = crypto.getRandomValues(new Uint8Array(16));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(data)
  );
  return { encrypted, iv };
};

// Validate IV length
if (iv.length !== 16) {
  throw new Error('Invalid IV length');
}
```

## 2. Passphrase Security

### Requirements
- Minimum 12 characters recommended
- No maximum length (within reason)
- No character restrictions (support Unicode)

### Implementation
```typescript
// Good passphrase validation
function validatePassphrase(passphrase: string): string[] {
  const errors: string[] = [];
  
  if (passphrase.length < 12) {
    errors.push('Passphrase should be at least 12 characters');
  }
  
  // Check entropy (optional)
  const entropy = calculateEntropy(passphrase);
  if (entropy < 60) {
    errors.push('Passphrase is too predictable');
  }
  
  return errors;
}

// Never log passphrases
function login(passphrase: string) {
  console.log('Login attempt'); // Good
  // console.log('Login with:', passphrase); // NEVER DO THIS
}
```

## 3. Data Storage Security

### IndexedDB Security
```typescript
// Always encrypt before storing
async function storeEntry(entry: JournalEntry) {
  const sensitive = {
    content: entry.content,
    mood: entry.mood,
    // ... other sensitive fields
  };
  
  const encrypted = await encrypt(JSON.stringify(sensitive));
  
  await db.entries.add({
    id: entry.id,
    userId: entry.userId,
    encryptedData: encrypted.data,
    iv: encrypted.iv,
    // Non-sensitive metadata
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt
  });
}
```

### Local Storage Caution
```typescript
// NEVER store sensitive data in localStorage
localStorage.setItem('theme', 'dark'); // OK
// localStorage.setItem('passphrase', passphrase); // NEVER

// Use sessionStorage for temporary sensitive data
sessionStorage.setItem('tempKey', derivedKey); // Better, but still risky
```

## 4. Authentication Security

### Rate Limiting (Implemented)
```typescript
const rateLimiter = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutMs: 30 * 60 * 1000, // 30 minutes
};
```

### Session Management
```typescript
// Clear sensitive data on logout
async function logout() {
  // Clear memory
  cryptoService.clearKey();
  
  // Clear session storage
  sessionStorage.clear();
  
  // Clear any decrypted data from memory
  appState.clearCache();
  
  // Navigate away from protected routes
  navigate('/login');
}

// Auto-logout on inactivity
let inactivityTimer: number;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    logout();
  }, 30 * 60 * 1000); // 30 minutes
}

// Reset on user activity
document.addEventListener('click', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
```

## 5. XSS Prevention

### Content Sanitization
```typescript
// Always escape user content when displaying
import DOMPurify from 'isomorphic-dompurify';

function DisplayContent(props: { content: string }) {
  // For plain text
  return <div>{props.content}</div>; // SolidJS escapes by default
  
  // For HTML content (if needed)
  const sanitized = DOMPurify.sanitize(props.content);
  return <div innerHTML={sanitized} />;
}
```

### CSP Headers
```typescript
// In server configuration or meta tags
<meta 
  http-equiv="Content-Security-Policy" 
  content="
    default-src 'self';
    script-src 'self' 'wasm-unsafe-eval';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: blob:;
    connect-src 'self' https://api.myapp.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  "
/>
```

## 6. Secure Communication

### API Security (Future)
```typescript
// Always use HTTPS
const API_BASE = 'https://api.myapp.com';

// Implement request signing
async function signRequest(data: any): Promise<string> {
  const timestamp = Date.now();
  const payload = JSON.stringify({ ...data, timestamp });
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    apiKey,
    encoder.encode(payload)
  );
  
  return base64Encode(signature);
}

// Verify server certificates (in production)
fetch(url, {
  mode: 'cors',
  credentials: 'omit', // Don't send cookies
  headers: {
    'X-Signature': signature,
    'X-Timestamp': timestamp,
  }
});
```

## 7. Error Handling

### Don't Leak Information
```typescript
// Bad: Exposes internal details
catch (error) {
  alert(`Decryption failed: ${error.stack}`);
}

// Good: Generic user message
catch (error) {
  console.error('Decryption error:', error); // Log for debugging
  showToast('Unable to decrypt data. Please check your passphrase.');
}
```

## 8. Audit Logging

### Security Events
```typescript
interface SecurityEvent {
  type: 'login' | 'logout' | 'failed_login' | 'data_export' | 'data_clear';
  timestamp: string;
  metadata?: Record<string, any>;
}

class SecurityAudit {
  private events: SecurityEvent[] = [];
  
  log(type: SecurityEvent['type'], metadata?: any) {
    this.events.push({
      type,
      timestamp: new Date().toISOString(),
      metadata
    });
    
    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }
  }
  
  getEvents(): SecurityEvent[] {
    return [...this.events];
  }
}
```

## 9. Dependency Security

### Regular Updates
```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Lock File
```bash
# Always commit package-lock.json
git add package-lock.json

# Use exact versions for critical dependencies
"@solidjs/start": "1.1.5", // Not "^1.1.5"
```

## 10. Testing Security

### Security Test Suite
```typescript
describe('Security Tests', () => {
  it('should not store plaintext data', async () => {
    await createJournalEntry({ content: 'Secret data' });
    
    const stored = await db.entries.toArray();
    for (const entry of stored) {
      expect(entry.content).toBeUndefined();
      expect(JSON.stringify(entry)).not.toContain('Secret data');
    }
  });
  
  it('should enforce rate limiting', async () => {
    for (let i = 0; i < 6; i++) {
      try {
        await login('wrong-passphrase');
      } catch (e) {
        if (i === 5) {
          expect(e.message).toContain('locked');
        }
      }
    }
  });
  
  it('should generate unique IVs', async () => {
    const ivs = new Set();
    for (let i = 0; i < 100; i++) {
      const { iv } = await encrypt('test');
      expect(ivs.has(iv)).toBe(false);
      ivs.add(iv);
    }
  });
});
```

## Security Checklist

Before each release:

- [ ] Run `npm audit` and fix vulnerabilities
- [ ] Review all new dependencies
- [ ] Test encryption/decryption thoroughly
- [ ] Verify no sensitive data in logs
- [ ] Check for XSS vulnerabilities
- [ ] Test rate limiting
- [ ] Verify HTTPS everywhere (in production)
- [ ] Review error messages for information leaks
- [ ] Test data export doesn't leak metadata
- [ ] Verify auto-logout works

## Incident Response

If a security issue is discovered:

1. **Assess Impact**: Determine what data might be affected
2. **Patch Immediately**: Fix the vulnerability
3. **Notify Users**: If user data might be compromised
4. **Update Documentation**: Document the issue and fix
5. **Post-Mortem**: Analyze how it happened and prevent recurrence

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [SolidJS Security](https://www.solidjs.com/guides/security)