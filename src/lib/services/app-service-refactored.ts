import { browserDB } from '../db/browser-db';
import { syncQueue } from '../sync/sync-queue';
import { authService } from './auth/auth-service';
import { userService } from './user/user-service';
import { journalService } from './journal/journal-service';
import { goalService } from './goal/goal-service';
import { habitService } from './habit/habit-service';
import { periodService } from './period/period-service';
import type { User, JournalEntry, Goal, GoalStatus, Habit, Theme } from '../validation/schemas';
import type { GoalFormData } from '../validation/input-schemas';

/**
 * AppService - Facade for all application services
 * 
 * This refactored version delegates to smaller, focused services
 * while maintaining the same public API for backward compatibility
 */
export class AppServiceRefactored {
  async initialize(): Promise<void> {
    // Initialize database
    await browserDB.init();
    
    // Initialize auth service
    await authService.initialize();
    
    // Load sync queue
    await syncQueue.loadQueue();
  }

  // === Authentication Methods ===
  async createAccount(birthDate: string, passphrase: string): Promise<User> {
    return await userService.createAccount(birthDate, passphrase);
  }

  async login(passphrase: string): Promise<boolean> {
    return await authService.authenticate(passphrase);
  }

  async logout(): Promise<void> {
    return await authService.logout();
  }

  getCurrentUser(): User | null {
    return authService.getCurrentUser();
  }

  hasUser(): boolean {
    return authService.hasUser();
  }

  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }

  // === Journal Methods ===
  async addJournalEntry(
    content: string,
    dayNumber: number,
    mood?: string,
    tags?: string[],
    achievements?: string[],
    gratitude?: string[]
  ): Promise<JournalEntry> {
    return await journalService.addEntry(content, dayNumber, mood, tags, achievements, gratitude);
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    return await journalService.getEntries();
  }

  async getJournalEntriesPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ entries: JournalEntry[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    return await journalService.getEntriesPaginated(page, pageSize);
  }

  // === Goal Methods ===
  async createGoal(formData: GoalFormData): Promise<Goal> {
    return await goalService.createGoal(formData);
  }

  async getGoals(status?: GoalStatus): Promise<Goal[]> {
    return await goalService.getGoals(status);
  }

  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    return await goalService.updateProgress(goalId, progress);
  }

  async toggleGoalMilestone(goalId: string, milestoneId: string): Promise<Goal> {
    return await goalService.toggleMilestone(goalId, milestoneId);
  }

  async deleteGoal(goalId: string): Promise<void> {
    return await goalService.deleteGoal(goalId);
  }

  // === Habit Methods ===
  async createHabit(data: {
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    targetCount?: number;
    color?: string;
    icon?: string;
  }): Promise<Habit> {
    return await habitService.createHabit(data);
  }

  async getHabits(): Promise<Habit[]> {
    return await habitService.getHabits();
  }

  async getHabitById(id: string): Promise<Habit | null> {
    return await habitService.getHabitById(id);
  }

  async updateHabit(
    id: string, 
    updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt' | 'completions' | 'currentStreak' | 'longestStreak'>>
  ): Promise<Habit | null> {
    return await habitService.updateHabit(id, updates);
  }

  async deleteHabit(id: string): Promise<void> {
    return await habitService.deleteHabit(id);
  }

  async recordHabitCompletion(id: string, date?: string, notes?: string): Promise<Habit | null> {
    return await habitService.recordCompletion(id, date, notes);
  }

  async removeHabitCompletion(id: string, date: string): Promise<Habit | null> {
    return await habitService.removeCompletion(id, date);
  }

  async getHabitsByPeriod(periodId: string): Promise<Habit[]> {
    return await habitService.getHabitsByPeriod(periodId);
  }

  // === Period Methods ===
  async getCurrentPeriod() {
    return await periodService.getCurrentPeriod();
  }

  // === User Methods ===
  async updateUserTheme(theme: Theme): Promise<void> {
    return await userService.updateTheme(theme);
  }

  async clearAllData(): Promise<void> {
    return await userService.clearAllData();
  }
}

// Export the refactored service
export const appServiceRefactored = new AppServiceRefactored();