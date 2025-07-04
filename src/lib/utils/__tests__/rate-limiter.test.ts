import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RateLimiter } from '../rate-limiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
    rateLimiter.clear();
  });

  describe('checkLimit', () => {
    it('should allow first attempt', async () => {
      const result = await rateLimiter.checkLimit('user123');
      expect(result).toBe(true);
    });

    it('should allow multiple attempts within limit', async () => {
      const userId = 'user123';
      
      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        await rateLimiter.recordAttempt(userId, false);
      }
      
      // 5th attempt should still be allowed
      const result = await rateLimiter.checkLimit(userId);
      expect(result).toBe(true);
    });

    it('should block after max attempts', async () => {
      const userId = 'user123';
      
      // Record 5 failed attempts (max)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordAttempt(userId, false);
      }
      
      // 6th attempt should be blocked
      const result = await rateLimiter.checkLimit(userId);
      expect(result).toBe(false);
    });

    it('should reset after successful attempt', async () => {
      const userId = 'user123';
      
      // Record some failed attempts
      await rateLimiter.recordAttempt(userId, false);
      await rateLimiter.recordAttempt(userId, false);
      
      // Successful attempt should reset
      await rateLimiter.recordAttempt(userId, true);
      
      // Should be allowed again
      const result = await rateLimiter.checkLimit(userId);
      expect(result).toBe(true);
      
      // Should have full attempts available
      const remaining = await rateLimiter.getRemainingAttempts(userId);
      expect(remaining).toBe(5);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new user', async () => {
      const remaining = await rateLimiter.getRemainingAttempts('newuser');
      expect(remaining).toBe(5);
    });

    it('should decrease with failed attempts', async () => {
      const userId = 'user123';
      
      await rateLimiter.recordAttempt(userId, false);
      expect(await rateLimiter.getRemainingAttempts(userId)).toBe(4);
      
      await rateLimiter.recordAttempt(userId, false);
      expect(await rateLimiter.getRemainingAttempts(userId)).toBe(3);
    });

    it('should return 0 when locked out', async () => {
      const userId = 'user123';
      
      // Max out attempts
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordAttempt(userId, false);
      }
      
      const remaining = await rateLimiter.getRemainingAttempts(userId);
      expect(remaining).toBe(0);
    });
  });

  describe('getTimeUntilUnlock', () => {
    it('should return null for user with remaining attempts', async () => {
      const userId = 'user123';
      await rateLimiter.recordAttempt(userId, false);
      
      const time = await rateLimiter.getTimeUntilUnlock(userId);
      expect(time).toBeNull();
    });

    it('should return time remaining when locked out', async () => {
      const userId = 'user123';
      
      // Max out attempts
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordAttempt(userId, false);
      }
      
      const time = await rateLimiter.getTimeUntilUnlock(userId);
      expect(time).not.toBeNull();
      expect(time).toBeGreaterThan(0);
      expect(time).toBeLessThanOrEqual(30 * 60 * 1000); // 30 minutes
    });
  });

  describe('time window reset', () => {
    it('should reset attempts after time window', async () => {
      const userId = 'user123';
      
      // Record some failed attempts
      await rateLimiter.recordAttempt(userId, false);
      await rateLimiter.recordAttempt(userId, false);
      
      // Fast forward time beyond window (15 minutes)
      vi.useFakeTimers();
      vi.advanceTimersByTime(16 * 60 * 1000);
      
      // Should be allowed again
      const result = await rateLimiter.checkLimit(userId);
      expect(result).toBe(true);
      
      // Should have full attempts
      const remaining = await rateLimiter.getRemainingAttempts(userId);
      expect(remaining).toBe(5);
      
      vi.useRealTimers();
    });
  });

  describe('multiple users', () => {
    it('should track limits independently per user', async () => {
      // User 1 - some failed attempts
      await rateLimiter.recordAttempt('user1', false);
      await rateLimiter.recordAttempt('user1', false);
      
      // User 2 - max out attempts
      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordAttempt('user2', false);
      }
      
      // User 1 should still be allowed
      expect(await rateLimiter.checkLimit('user1')).toBe(true);
      expect(await rateLimiter.getRemainingAttempts('user1')).toBe(3);
      
      // User 2 should be blocked
      expect(await rateLimiter.checkLimit('user2')).toBe(false);
      expect(await rateLimiter.getRemainingAttempts('user2')).toBe(0);
    });
  });
});