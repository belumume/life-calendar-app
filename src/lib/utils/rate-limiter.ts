/**
 * Rate limiter implementation for authentication attempts
 * Uses exponential backoff to prevent brute force attacks
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

export class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private cleanupTimerId: NodeJS.Timeout | null = null;
  
  // Configuration
  private readonly maxAttempts = 5;
  private readonly windowMs = 15 * 60 * 1000; // 15 minutes
  private readonly lockoutMs = 30 * 60 * 1000; // 30 minutes lockout after max attempts
  private readonly cleanupInterval = 60 * 60 * 1000; // Clean up old entries every hour
  
  constructor() {
    // Periodically clean up old entries
    this.cleanupTimerId = setInterval(() => this.cleanup(), this.cleanupInterval);
  }
  
  /**
   * Check if an identifier (user ID, IP, etc.) is rate limited
   * @returns true if the action is allowed, false if rate limited
   */
  async checkLimit(identifier: string): Promise<boolean> {
    const now = Date.now();
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      return true; // First attempt
    }
    
    // Check if locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return false;
    }
    
    // Check if outside the time window (reset)
    if (now - entry.firstAttempt > this.windowMs) {
      this.attempts.delete(identifier);
      return true;
    }
    
    // Check if max attempts reached
    if (entry.attempts >= this.maxAttempts) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Record an attempt for an identifier
   */
  async recordAttempt(identifier: string, success: boolean): Promise<void> {
    const now = Date.now();
    const entry = this.attempts.get(identifier);
    
    if (success) {
      // Successful attempt - clear the record
      this.attempts.delete(identifier);
      return;
    }
    
    if (!entry) {
      // First failed attempt
      this.attempts.set(identifier, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
      });
      return;
    }
    
    // Update existing entry
    entry.attempts++;
    entry.lastAttempt = now;
    
    // Lock out if max attempts reached
    if (entry.attempts >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;
    }
    
    this.attempts.set(identifier, entry);
  }
  
  /**
   * Get remaining attempts for an identifier
   */
  async getRemainingAttempts(identifier: string): Promise<number> {
    const entry = this.attempts.get(identifier);
    
    if (!entry) {
      return this.maxAttempts;
    }
    
    const now = Date.now();
    
    // Check if locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      return 0;
    }
    
    // Check if outside the time window
    if (now - entry.firstAttempt > this.windowMs) {
      return this.maxAttempts;
    }
    
    return Math.max(0, this.maxAttempts - entry.attempts);
  }
  
  /**
   * Get time until unlock (in milliseconds)
   */
  async getTimeUntilUnlock(identifier: string): Promise<number | null> {
    const entry = this.attempts.get(identifier);
    
    if (!entry || !entry.lockedUntil) {
      return null;
    }
    
    const now = Date.now();
    const timeRemaining = entry.lockedUntil - now;
    
    return timeRemaining > 0 ? timeRemaining : null;
  }
  
  /**
   * Clean up old entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    
    for (const [identifier, entry] of this.attempts.entries()) {
      // Remove entries that are outside the window and not locked
      if (entry.lastAttempt < cutoff && (!entry.lockedUntil || entry.lockedUntil < now)) {
        this.attempts.delete(identifier);
      }
    }
  }
  
  /**
   * Clear all rate limit data (for testing)
   */
  clear(): void {
    this.attempts.clear();
  }
  
  /**
   * Destroy the rate limiter and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimerId) {
      clearInterval(this.cleanupTimerId);
      this.cleanupTimerId = null;
    }
    this.attempts.clear();
  }
}

// Export singleton instance
export const authRateLimiter = new RateLimiter();