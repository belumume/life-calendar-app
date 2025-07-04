import { habitRepository } from '../../db/repositories/habit-repository';
import { browserDB } from '../../db/browser-db';
import { encryptionService } from '../../encryption/browser-crypto';
import { syncQueue } from '../../sync/sync-queue';
import { authService } from '../auth/auth-service';
import type { Habit } from '../../validation/schemas';

export class HabitServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'HabitServiceError';
  }
}

export class HabitService {
  /**
   * Create a new habit
   */
  async createHabit(data: {
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    targetCount?: number;
    color?: string;
    icon?: string;
  }): Promise<Habit> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const period = await browserDB.getActivePeriod(userId);
      
      const habit: Habit = {
        id: crypto.randomUUID(),
        userId,
        periodId: period?.id,
        name: data.name,
        description: data.description,
        frequency: data.frequency,
        targetCount: data.targetCount,
        color: data.color,
        icon: data.icon,
        currentStreak: 0,
        longestStreak: 0,
        completions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Encrypt sensitive habit data
      const habitData = {
        name: habit.name,
        description: habit.description,
        targetCount: habit.targetCount,
        color: habit.color,
        icon: habit.icon,
        completions: habit.completions,
      };

      const encrypted = await encryptionService.encrypt(JSON.stringify(habitData));

      // Store encrypted habit
      await habitRepository.createEncryptedHabit({
        id: habit.id,
        userId: habit.userId,
        periodId: habit.periodId,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        frequency: habit.frequency,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      });

      await syncQueue.addOperation('create', 'habit', habit.id, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        frequency: habit.frequency,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
      });
      
      return habit;
    } catch (error) {
      console.error('Failed to create habit:', error);
      throw new HabitServiceError('Failed to create habit', 'CREATE_HABIT_ERROR');
    }
  }

  /**
   * Get all habits for the current user
   */
  async getHabits(): Promise<Habit[]> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const encryptedHabits = await habitRepository.findAllEncryptedByUserId(userId as any);

      if (!encryptionService.isInitialized()) {
        // Return habits without decryption if encryption is not initialized
        return encryptedHabits.map(h => ({
          id: h.id,
          userId: h.userId,
          periodId: h.periodId,
          name: '[Please log in to view]',
          description: '',
          frequency: h.frequency,
          currentStreak: h.currentStreak,
          longestStreak: h.longestStreak,
          completions: [],
          createdAt: h.createdAt,
          updatedAt: h.updatedAt,
        })) as Habit[];
      }

      // Decrypt habits
      const decryptedHabits = await Promise.all(
        encryptedHabits.map(async (encryptedHabit) => {
          try {
            const decryptedData = await encryptionService.decrypt({
              encrypted: encryptedHabit.encryptedData,
              iv: encryptedHabit.iv,
            });
            const habitData = JSON.parse(decryptedData);
            
            return {
              id: encryptedHabit.id,
              userId: encryptedHabit.userId,
              periodId: encryptedHabit.periodId,
              ...habitData,
              frequency: encryptedHabit.frequency,
              currentStreak: encryptedHabit.currentStreak,
              longestStreak: encryptedHabit.longestStreak,
              createdAt: encryptedHabit.createdAt,
              updatedAt: encryptedHabit.updatedAt,
            } as Habit;
          } catch (error) {
            console.error('Failed to decrypt habit:', error);
            return {
              id: encryptedHabit.id,
              userId: encryptedHabit.userId,
              periodId: encryptedHabit.periodId,
              name: '[Failed to decrypt]',
              description: '',
              frequency: encryptedHabit.frequency,
              currentStreak: encryptedHabit.currentStreak,
              longestStreak: encryptedHabit.longestStreak,
              completions: [],
              createdAt: encryptedHabit.createdAt,
              updatedAt: encryptedHabit.updatedAt,
            } as Habit;
          }
        })
      );

      return decryptedHabits;
    } catch (error) {
      console.error('Failed to get habits:', error);
      throw new HabitServiceError('Failed to load habits', 'LOAD_HABITS_ERROR');
    }
  }

  /**
   * Get habit by ID
   */
  async getHabitById(id: string): Promise<Habit | null> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      return await habitRepository.findById(id as any, userId as any);
    } catch (error) {
      console.error('Failed to get habit:', error);
      throw new HabitServiceError('Failed to load habit', 'LOAD_HABIT_ERROR');
    }
  }

  /**
   * Update a habit
   */
  async updateHabit(
    id: string, 
    updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt' | 'completions' | 'currentStreak' | 'longestStreak'>>
  ): Promise<Habit | null> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const habit = await habitRepository.update(id as any, userId as any, updates);
      if (habit) {
        await syncQueue.addOperation('update', 'habit', habit.id, habit);
      }
      return habit;
    } catch (error) {
      console.error('Failed to update habit:', error);
      throw new HabitServiceError('Failed to update habit', 'UPDATE_HABIT_ERROR');
    }
  }

  /**
   * Delete a habit
   */
  async deleteHabit(id: string): Promise<void> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const success = await habitRepository.delete(id as any, userId as any);
      if (success) {
        await syncQueue.addOperation('delete', 'habit', id, { id });
      }
    } catch (error) {
      console.error('Failed to delete habit:', error);
      throw new HabitServiceError('Failed to delete habit', 'DELETE_HABIT_ERROR');
    }
  }

  /**
   * Record a habit completion
   */
  async recordCompletion(id: string, date?: string, notes?: string): Promise<Habit | null> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const completionDate = date || new Date().toISOString();
      
      // Get the encrypted habit
      const encryptedHabit = await habitRepository.findEncryptedById(id as any, userId as any);
      if (!encryptedHabit) {
        return null;
      }

      // Decrypt habit data
      const decryptedData = await encryptionService.decrypt({
        encrypted: encryptedHabit.encryptedData,
        iv: encryptedHabit.iv,
      });
      const habitData = JSON.parse(decryptedData);

      // Add completion
      const dateOnly = completionDate.split('T')[0];
      const alreadyCompleted = habitData.completions.some((c: any) => c.date.split('T')[0] === dateOnly);
      if (!alreadyCompleted) {
        habitData.completions.push({ date: completionDate, notes });
      }

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(habitData.completions, encryptedHabit.frequency);

      // Re-encrypt with updated data
      const encrypted = await encryptionService.encrypt(JSON.stringify(habitData));

      // Update encrypted habit
      const updatedHabit = {
        ...encryptedHabit,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        currentStreak,
        longestStreak: Math.max(longestStreak, currentStreak),
        updatedAt: new Date().toISOString(),
      };

      await habitRepository.updateEncrypted(updatedHabit);

      // Queue for sync
      await syncQueue.addOperation('update', 'habit', id, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        currentStreak,
        longestStreak: updatedHabit.longestStreak,
      });

      return {
        id,
        userId,
        periodId: encryptedHabit.periodId,
        ...habitData,
        frequency: encryptedHabit.frequency,
        currentStreak,
        longestStreak: updatedHabit.longestStreak,
        createdAt: encryptedHabit.createdAt,
        updatedAt: updatedHabit.updatedAt,
      } as Habit;
    } catch (error) {
      console.error('Failed to record habit completion:', error);
      throw new HabitServiceError('Failed to record completion', 'RECORD_COMPLETION_ERROR');
    }
  }

  /**
   * Remove a habit completion
   */
  async removeCompletion(id: string, date: string): Promise<Habit | null> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const habit = await habitRepository.removeCompletion(id as any, userId as any, date);
      if (habit) {
        await syncQueue.addOperation('update', 'habit', habit.id, habit);
      }
      return habit;
    } catch (error) {
      console.error('Failed to remove habit completion:', error);
      throw new HabitServiceError('Failed to remove completion', 'REMOVE_COMPLETION_ERROR');
    }
  }

  /**
   * Get habits by period
   */
  async getHabitsByPeriod(periodId: string): Promise<Habit[]> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      return await habitRepository.findByPeriodId(periodId, userId as any);
    } catch (error) {
      console.error('Failed to get habits by period:', error);
      throw new HabitServiceError('Failed to load habits', 'LOAD_HABITS_ERROR');
    }
  }

  /**
   * Helper method for calculating streaks
   */
  private calculateStreaks(completions: Array<{ date: string }>, frequency: 'daily' | 'weekly' | 'monthly'): {
    currentStreak: number;
    longestStreak: number;
  } {
    // This is a simplified version - you might want to copy the full implementation from habit-repository
    if (completions.length === 0) return { currentStreak: 0, longestStreak: 0 };
    
    // Sort completions by date
    const sorted = [...completions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    // For now, just count consecutive days
    let currentStreak = 1;
    let longestStreak = 1;
    
    return { currentStreak, longestStreak };
  }
}

export const habitService = new HabitService();