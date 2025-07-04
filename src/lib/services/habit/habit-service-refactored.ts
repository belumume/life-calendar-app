import { habitRepository } from '../../db/repositories/habit-repository';
import { browserDB } from '../../db/browser-db';
import { syncQueue } from '../../sync/sync-queue';
import { authService } from '../auth/auth-service';
import { EncryptedService } from '../base/encrypted-service';
import type { Habit, HabitFrequency, HabitCompletionData } from '../../validation/schemas';
import type { HabitFormData } from '../../validation/input-schemas';
import type { EncryptedHabit } from '../../db/repositories/habit-repository';

export class HabitServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'HabitServiceError';
  }
}

interface HabitData {
  name: string;
  description?: string;
  frequency: HabitFrequency;
  targetCount?: number;
  icon?: string;
  color?: string;
  reminderTime?: string;
  startDate: string;
  completions: HabitCompletionData[];
}

export class HabitServiceRefactored extends EncryptedService<HabitData, EncryptedHabit> {
  constructor() {
    super('HabitService');
  }

  /**
   * Create a new habit
   */
  async createHabit(formData: HabitFormData): Promise<Habit> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const currentPeriod = await browserDB.getActivePeriod(userId);
      
      const habit: Habit = {
        id: crypto.randomUUID(),
        userId,
        periodId: currentPeriod?.id,
        name: formData.name,
        description: formData.description,
        frequency: formData.frequency,
        targetCount: formData.targetCount,
        icon: formData.icon,
        color: formData.color,
        reminderTime: formData.reminderTime,
        startDate: new Date().toISOString(),
        completions: [],
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Prepare habit data for encryption
      const habitData: HabitData = {
        name: habit.name,
        description: habit.description,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        icon: habit.icon,
        color: habit.color,
        reminderTime: habit.reminderTime,
        startDate: habit.startDate,
        completions: habit.completions,
      };

      // Use base class method for encryption
      const encryptedEntity = await this.createEncryptedEntity(
        habitData,
        {
          id: habit.id,
          userId: habit.userId,
          periodId: habit.periodId,
        }
      );

      // Store encrypted habit
      await habitRepository.createEncryptedHabit({
        ...encryptedEntity,
        frequency: habit.frequency,
        currentStreak: habit.currentStreak,
        longestStreak: habit.longestStreak,
        lastCompletedDate: null,
        createdAt: habit.createdAt,
        updatedAt: habit.updatedAt,
      });

      // Queue for sync
      await syncQueue.addOperation('create', 'habit', habit.id, encryptedEntity);

      return habit;
    } catch (error) {
      console.error('Failed to create habit:', error);
      throw new HabitServiceError('Failed to create habit', 'CREATE_HABIT_ERROR');
    }
  }

  /**
   * Get all habits
   */
  async getHabits(): Promise<Habit[]> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const encryptedHabits = await habitRepository.getEncryptedHabitsByUser(userId);
      
      this.requireEncryption();

      // Use base class batch decrypt method
      const decryptedHabits = await this.batchDecrypt(encryptedHabits);
      
      // Map to Habit format with additional metadata
      const habitsMap = new Map(encryptedHabits.map(h => [h.id, h]));
      
      return decryptedHabits.map(decryptedData => {
        const encryptedHabit = habitsMap.get(decryptedData.id)!;
        return {
          id: decryptedData.id,
          userId: encryptedHabit.userId,
          periodId: encryptedHabit.periodId,
          ...decryptedData,
          currentStreak: encryptedHabit.currentStreak,
          longestStreak: encryptedHabit.longestStreak,
          totalCompletions: decryptedData.completions?.length ?? 0,
          createdAt: encryptedHabit.createdAt,
          updatedAt: encryptedHabit.updatedAt,
        } as Habit;
      });
    } catch (error) {
      console.error('Failed to get habits:', error);
      throw new HabitServiceError('Failed to load habits', 'LOAD_HABITS_ERROR');
    }
  }

  /**
   * Add completion to habit
   */
  async addCompletion(habitId: string, completionDate: string, notes?: string): Promise<Habit> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const encryptedHabit = await habitRepository.getEncryptedHabitById(habitId, userId);
      if (!encryptedHabit) {
        throw new HabitServiceError('Habit not found', 'HABIT_NOT_FOUND');
      }

      // Decrypt current data
      const habitData = await this.decryptData(encryptedHabit);

      // Add completion
      const dateOnly = completionDate.split('T')[0];
      if (!habitData.completions) {
        habitData.completions = [];
      }
      
      const alreadyCompleted = habitData.completions.some((c) => c.date.split('T')[0] === dateOnly);
      if (!alreadyCompleted) {
        habitData.completions.push({ date: completionDate, notes });
      }

      // Calculate streaks
      const { currentStreak, longestStreak } = this.calculateStreaks(habitData.completions, encryptedHabit.frequency);

      // Update encrypted data
      const updates = await this.updateEncryptedEntity(encryptedHabit, habitData);

      // Update habit
      const updatedHabit = await habitRepository.updateEncryptedHabit(habitId, {
        ...updates,
        currentStreak,
        longestStreak,
        lastCompletedDate: completionDate,
      });

      // Queue for sync
      await syncQueue.addOperation('update', 'habit', habitId, {
        completion: { date: completionDate, notes },
        currentStreak,
        longestStreak,
      });

      // Return decrypted habit
      return await this.transformEncryptedToDecrypted(updatedHabit, {
        currentStreak,
        longestStreak,
        totalCompletions: habitData.completions.length,
      }) as Habit;
    } catch (error) {
      console.error('Failed to add completion:', error);
      throw new HabitServiceError('Failed to track habit', 'TRACK_HABIT_ERROR');
    }
  }

  /**
   * Calculate streaks from completions
   */
  private calculateStreaks(
    completions: HabitCompletionData[],
    frequency: HabitFrequency
  ): { currentStreak: number; longestStreak: number } {
    if (!completions || completions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort completions by date
    const sortedCompletions = [...completions].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastCompletion = new Date(sortedCompletions[sortedCompletions.length - 1].date);
    lastCompletion.setHours(0, 0, 0, 0);
    
    // Check if streak is broken
    const daysDiff = Math.floor((today.getTime() - lastCompletion.getTime()) / (1000 * 60 * 60 * 24));
    
    if (frequency === 'daily' && daysDiff <= 1) {
      currentStreak = 1;
    } else if (frequency === 'weekly' && daysDiff <= 7) {
      currentStreak = 1;
    }

    // Calculate longest streak
    for (let i = 1; i < sortedCompletions.length; i++) {
      const prevDate = new Date(sortedCompletions[i - 1].date);
      const currDate = new Date(sortedCompletions[i].date);
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);
      
      const daysBetween = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if ((frequency === 'daily' && daysBetween === 1) ||
          (frequency === 'weekly' && daysBetween <= 7)) {
        tempStreak++;
        if (i === sortedCompletions.length - 1 && currentStreak > 0) {
          currentStreak = tempStreak;
        }
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    
    longestStreak = Math.max(longestStreak, tempStreak, currentStreak);
    
    return { currentStreak, longestStreak };
  }
}

export const habitServiceRefactored = new HabitServiceRefactored();