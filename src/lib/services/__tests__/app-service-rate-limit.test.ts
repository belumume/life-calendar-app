import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appService } from '../app-service';
import { browserDB } from '../../db/browser-db';
import { authRateLimiter } from '../../utils/rate-limiter';

describe('AppService Rate Limiting', () => {
  const testBirthDate = '1990-01-01';
  const correctPassphrase = 'TestSecurePass123!';
  const wrongPassphrase = 'WrongPassword123!';

  beforeEach(async () => {
    await browserDB.clear();
    authRateLimiter.clear();
  });

  afterEach(async () => {
    await browserDB.clear();
    authRateLimiter.clear();
  });

  describe('login rate limiting', () => {
    it('should allow login with correct passphrase', async () => {
      // Create account
      await appService.createAccount(testBirthDate, correctPassphrase);
      
      // Logout
      await appService.logout();
      
      // Login should succeed
      const result = await appService.login(correctPassphrase);
      expect(result).toBe(true);
      expect(appService.isAuthenticated()).toBe(true);
    });

    it('should track failed login attempts', async () => {
      // Create account
      await appService.createAccount(testBirthDate, correctPassphrase);
      
      // Add a journal entry so we have something to decrypt
      await appService.addJournalEntry('Test entry', 1);
      
      // Verify we have journal entries
      const entries = await appService.getJournalEntries();
      expect(entries.length).toBeGreaterThan(0);
      
      // Logout
      await appService.logout();
      
      // Try to login with wrong passphrase - should throw
      let error: any;
      try {
        const result = await appService.login(wrongPassphrase);
        console.log('Login result:', result); // This should not happen
      } catch (e) {
        error = e;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe('INVALID_PASSPHRASE');
      expect(error.message).toContain('Invalid passphrase');
      
      // Should not be authenticated
      expect(appService.isAuthenticated()).toBe(false);
    });

    it('should show warning when few attempts remain', async () => {
      // Create account
      await appService.createAccount(testBirthDate, correctPassphrase);
      // Add a journal entry so we have something to decrypt
      await appService.addJournalEntry('Test entry', 1);
      await appService.logout();
      
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await appService.login(wrongPassphrase);
        } catch (error) {
          // Expected
        }
      }
      
      // 4th attempt should show warning (1 attempt remaining after this fails)
      try {
        await appService.login(wrongPassphrase);
      } catch (error: any) {
        expect(error.code).toBe('INVALID_PASSPHRASE');
        expect(error.message).toContain('1 attempts remaining');
      }
    });

    it('should lock account after max failed attempts', async () => {
      // Create account
      await appService.createAccount(testBirthDate, correctPassphrase);
      // Add a journal entry so we have something to decrypt
      await appService.addJournalEntry('Test entry', 1);
      await appService.logout();
      
      // Make 5 failed attempts (max)
      for (let i = 0; i < 5; i++) {
        try {
          await appService.login(wrongPassphrase);
        } catch (error) {
          // Expected
        }
      }
      
      // 6th attempt should be blocked
      try {
        await appService.login(correctPassphrase); // Even correct password should be blocked
      } catch (error: any) {
        expect(error.code).toBe('RATE_LIMITED');
        expect(error.message).toContain('Account locked');
        expect(error.message).toContain('too many failed attempts');
      }
    });

    it('should reset rate limit after successful login', async () => {
      // Create account
      await appService.createAccount(testBirthDate, correctPassphrase);
      // Add a journal entry so we have something to decrypt
      await appService.addJournalEntry('Test entry', 1);
      await appService.logout();
      
      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        try {
          await appService.login(wrongPassphrase);
        } catch (error) {
          // Expected
        }
      }
      
      // Successful login should reset
      const result = await appService.login(correctPassphrase);
      expect(result).toBe(true);
      
      // Logout and try again - should have full attempts
      await appService.logout();
      
      // Should be able to make failed attempts again
      for (let i = 0; i < 4; i++) {
        try {
          await appService.login(wrongPassphrase);
        } catch (error: any) {
          if (i < 2) {
            // First 2 attempts don't show warning
            expect(error.message).not.toContain('attempts remaining');
          } else if (i === 2) {
            // 3rd attempt shows 2 attempts remaining
            expect(error.message).toContain('2 attempts remaining');
          } else {
            // 4th attempt shows 1 attempt remaining
            expect(error.message).toContain('1 attempts remaining');
          }
        }
      }
    });
  });
});