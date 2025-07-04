import { userRepository } from '../../db/repositories/user-repository';
import { browserDB } from '../../db/browser-db';
import { encryptionService } from '../../encryption/browser-crypto';
import { syncQueue } from '../../sync/sync-queue';
import { authService } from '../auth/auth-service';
import type { User, Theme } from '../../validation/schemas';

export class UserServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export class UserService {
  /**
   * Create a new user account
   */
  async createAccount(birthDate: string, passphrase: string): Promise<User> {
    try {
      // Initialize encryption with passphrase and get salt
      const salt = await encryptionService.initialize(passphrase);
      
      // Create user with salt
      const user = await userRepository.createUser({ birthDate, passphrase });
      
      // Update user with salt
      const updatedUser = await userRepository.updateUser(user.id, { salt });
      
      // Create initial 88-day period
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 88 * 24 * 60 * 60 * 1000).toISOString();
      
      await browserDB.savePeriod({
        id: crypto.randomUUID(),
        userId: user.id,
        name: '88 Days of Summer',
        startDate,
        endDate,
        totalDays: 88,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      // Set user in auth service
      authService.setCurrentUser(updatedUser);
      
      // Queue for sync
      await syncQueue.addOperation('create', 'user', updatedUser.id, {
        birthDate: updatedUser.birthDate,
        // Don't sync sensitive data like passphrase or salt
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw new UserServiceError('Failed to create account. Please try again.', 'CREATE_ACCOUNT_ERROR');
    }
  }

  /**
   * Update user theme preferences
   */
  async updateTheme(theme: Theme): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new UserServiceError('User not found', 'USER_NOT_FOUND');
    }

    try {
      // Update user with new theme
      const updatedUser = { ...currentUser, theme };
      await userRepository.updateUser(currentUser.id, { theme });
      
      // Update auth service with new user data
      authService.setCurrentUser(updatedUser);
      
      // Queue for sync
      await syncQueue.addOperation('update', 'user', currentUser.id, { theme });
    } catch (error) {
      console.error('Failed to update user theme:', error);
      throw new UserServiceError('Failed to update theme', 'UPDATE_THEME_ERROR');
    }
  }

  /**
   * Clear all user data
   */
  async clearAllData(): Promise<void> {
    await browserDB.clear();
    await authService.logout();
  }
}

export const userService = new UserService();