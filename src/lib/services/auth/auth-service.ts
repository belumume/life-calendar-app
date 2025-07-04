import { userRepository } from '../../db/repositories/user-repository';
import { journalRepository } from '../../db/repositories/journal-repository';
import { encryptionService } from '../../encryption/browser-crypto';
import { authRateLimiter } from '../../utils/rate-limiter';
import { addAuthenticationDelay } from '../../utils/crypto-utils';
import type { User } from '../../validation/schemas';

export class AuthServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AuthServiceError';
  }
}

export class AuthService {
  private currentUser: User | null = null;
  private authenticated = false;

  /**
   * Initialize the auth service and load existing user
   */
  async initialize(): Promise<void> {
    this.currentUser = await userRepository.getUser();
  }

  /**
   * Get the current user
   */
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Set the current user (used after account creation)
   */
  setCurrentUser(user: User): void {
    this.currentUser = user;
    this.authenticated = true;
  }

  /**
   * Check if a user exists
   */
  hasUser(): boolean {
    return this.currentUser !== null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated && encryptionService.isInitialized();
  }

  /**
   * Authenticate with passphrase
   */
  async authenticate(passphrase: string): Promise<boolean> {
    if (!this.currentUser) {
      throw new AuthServiceError('No user found. Please create an account first.', 'NO_USER');
    }
    
    const userId = this.currentUser.id;
    
    // Check rate limit before attempting login
    const canAttempt = await authRateLimiter.checkLimit(userId);
    if (!canAttempt) {
      const remainingAttempts = await authRateLimiter.getRemainingAttempts(userId);
      const timeUntilUnlock = await authRateLimiter.getTimeUntilUnlock(userId);
      
      if (timeUntilUnlock) {
        const minutes = Math.ceil(timeUntilUnlock / 60000);
        throw new AuthServiceError(
          `Account locked due to too many failed attempts. Please try again in ${minutes} minutes.`,
          'RATE_LIMITED'
        );
      } else {
        throw new AuthServiceError(
          `Too many failed attempts. ${remainingAttempts} attempts remaining.`,
          'RATE_LIMITED'
        );
      }
    }
    
    let authSuccess = false;
    let authError: Error | null = null;
    
    try {
      // Initialize encryption with passphrase and user's salt
      await encryptionService.initialize(passphrase, this.currentUser.salt);
      
      // Try to decrypt a test entry to verify passphrase
      const entries = await journalRepository.getEntriesByUser(this.currentUser.id);
      if (entries.length > 0 && entries[0].content && entries[0].iv) {
        // If we have encrypted entries, try to decrypt one
        // Store result instead of throwing immediately
        try {
          await encryptionService.decrypt({
            encrypted: entries[0].content,
            iv: entries[0].iv
          });
          authSuccess = true;
        } catch (decryptError) {
          authSuccess = false;
          authError = decryptError as Error;
        }
      } else {
        // No entries to verify against, consider auth successful
        // (This is for new users who haven't created any data yet)
        authSuccess = true;
      }
      
      // Add random delay to prevent timing attacks
      await addAuthenticationDelay();
      
      if (authSuccess) {
        // Mark as authenticated on successful login
        this.authenticated = true;
        
        // Record successful attempt (clears rate limit)
        await authRateLimiter.recordAttempt(userId, true);
        
        return true;
      } else {
        throw authError || new Error('Authentication failed');
      }
    } catch (error) {
      // Add delay for failed attempts too
      await addAuthenticationDelay();
      
      console.error('Login failed:', error);
      this.authenticated = false;
      
      // Record failed attempt
      await authRateLimiter.recordAttempt(userId, false);
      
      // Get remaining attempts for error message
      const remainingAttempts = await authRateLimiter.getRemainingAttempts(userId);
      
      if (remainingAttempts === 0) {
        throw new AuthServiceError(
          'Account locked due to too many failed attempts. Please try again later.',
          'RATE_LIMITED'
        );
      } else if (remainingAttempts <= 2) {
        throw new AuthServiceError(
          `Invalid passphrase. ${remainingAttempts} attempts remaining before account lock.`,
          'INVALID_PASSPHRASE'
        );
      } else {
        throw new AuthServiceError(
          'Invalid passphrase. Please try again.',
          'INVALID_PASSPHRASE'
        );
      }
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    this.authenticated = false;
    encryptionService.clear();
    // Keep currentUser for login page
  }

  /**
   * Require authentication for operations
   */
  requireAuth(): void {
    if (!this.authenticated || !this.currentUser) {
      throw new AuthServiceError('User not authenticated', 'AUTH_ERROR');
    }
    
    if (!encryptionService.isInitialized()) {
      throw new AuthServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }
  }

  /**
   * Get authenticated user ID
   */
  getAuthenticatedUserId(): string {
    if (!this.authenticated || !this.currentUser) {
      throw new AuthServiceError('User not authenticated', 'AUTH_ERROR');
    }
    return this.currentUser.id;
  }
}

export const authService = new AuthService();