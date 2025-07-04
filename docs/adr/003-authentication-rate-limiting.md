# ADR-003: Implement Authentication Rate Limiting

## Status
Accepted

## Context
The application had no protection against brute force attacks on the passphrase. Given that the passphrase is the only protection for encrypted data, this was a critical security vulnerability.

## Decision
Implement client-side rate limiting for authentication attempts with:
- Maximum 5 attempts within 15 minutes
- 30-minute lockout after exceeding limit
- Per-user tracking (based on stored user ID)
- Progressive warnings as limit approaches

## Implementation
```typescript
class RateLimiter {
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly lockoutMs = 30 * 60 * 1000; // 30 minutes
  
  async checkLimit(identifier: string): Promise<boolean> {
    // Check if within limits
  }
  
  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    // Track attempt and reset on success
  }
}
```

## Consequences

### Positive
- **Brute Force Protection**: Makes passphrase guessing impractical
- **User Feedback**: Clear warnings before lockout
- **Automatic Reset**: Successful login clears attempt history
- **No Server Required**: Works offline with localStorage

### Negative
- **Client-Side Only**: Can be bypassed by clearing browser data
- **User Frustration**: Legitimate users might get locked out
- **No Central Monitoring**: Cannot detect distributed attacks

### Mitigation
- Store attempt data in IndexedDB (harder to clear accidentally)
- Implement exponential backoff for better UX
- Add optional server-side rate limiting for sync operations
- Consider biometric authentication as alternative

## Notes
This provides a reasonable level of protection for a local-first application. For higher security requirements, consider additional factors like:
- Device fingerprinting
- CAPTCHA after failed attempts
- Two-factor authentication options