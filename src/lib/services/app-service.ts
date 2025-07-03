import { userRepository } from '../db/repositories/user-repository';
import { journalRepository } from '../db/repositories/journal-repository';
import { goalRepository } from '../db/repositories/goal-repository';
import { habitRepository } from '../db/repositories/habit-repository';
import { browserDB } from '../db/browser-db';
import { encryptionService } from '../encryption/browser-crypto';
import { syncQueue } from '../sync/sync-queue';
import type { User, JournalEntry, Goal, GoalStatus, Habit } from '../validation/schemas';
import type { GoalFormData } from '../validation/input-schemas';

export class AppServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'AppServiceError';
  }
}

export class AppService {
  private currentUser: User | null = null;
  private isInitialized = false;
  private authenticated = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Initialize database
      await browserDB.init();
      
      // Check for existing user
      this.currentUser = await userRepository.getUser();
      
      // Load sync queue
      await syncQueue.loadQueue();
      
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize app service:', error);
      throw new AppServiceError('Failed to initialize application', 'INIT_ERROR');
    }
  }

  async createAccount(birthDate: string, passphrase: string): Promise<User> {
    try {
      // Initialize encryption with passphrase and get salt
      const salt = await encryptionService.initialize(passphrase);
      
      // Create user with salt
      const user = await userRepository.createUser({ birthDate, passphrase });
      
      // Update user with salt
      const updatedUser = await userRepository.updateUser(user.id, { salt });
      this.currentUser = updatedUser;
      
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
      
      // Mark as authenticated after account creation
      this.authenticated = true;
      
      // Queue for sync
      await syncQueue.addOperation('create', 'user', updatedUser.id, {
        birthDate: updatedUser.birthDate,
        // Don't sync sensitive data like passphrase or salt
      });
      
      return updatedUser;
    } catch (error) {
      console.error('Failed to create account:', error);
      throw new AppServiceError('Failed to create account. Please try again.', 'CREATE_ACCOUNT_ERROR');
    }
  }

  async login(passphrase: string): Promise<boolean> {
    if (!this.currentUser) {
      throw new AppServiceError('No user found. Please create an account first.', 'NO_USER');
    }
    
    try {
      // Initialize encryption with passphrase and user's salt
      await encryptionService.initialize(passphrase, this.currentUser.salt);
      
      // Try to decrypt a test entry to verify passphrase
      const entries = await journalRepository.getEntriesByUser(this.currentUser.id);
      if (entries.length > 0 && entries[0].content && entries[0].iv) {
        // If we have encrypted entries, try to decrypt one
        // This will throw if passphrase is wrong
        await encryptionService.decrypt({
          encrypted: entries[0].content,
          iv: entries[0].iv
        });
      }
      
      // Mark as authenticated on successful login
      this.authenticated = true;
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      this.authenticated = false;
      return false;
    }
  }

  async addJournalEntry(
    content: string,
    dayNumber: number,
    mood?: string,
    tags?: string[],
    achievements?: string[],
    gratitude?: string[]
  ): Promise<JournalEntry> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }
    
    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized. Please log in again.', 'ENCRYPTION_NOT_INITIALIZED');
    }
    
    try {
      const period = await browserDB.getActivePeriod(this.currentUser.id);
      if (!period) {
        throw new AppServiceError('No active period found', 'NO_ACTIVE_PERIOD');
      }
      
      // Encrypt content
      const encrypted = await encryptionService.encrypt(content);
      
      const entry = await journalRepository.createEntry({
        userId: this.currentUser.id,
        periodId: period.id,
        date: new Date().toISOString(),
        dayNumber,
        content: encrypted.encrypted,
        iv: encrypted.iv,
        mood: mood as any,
        tags: tags || [],
        achievements: achievements || [],
        gratitude: gratitude || [],
      });
      
      // Queue for sync (encrypted data)
      await syncQueue.addOperation('create', 'journal', entry.id, {
        periodId: entry.periodId,
        date: entry.date,
        dayNumber: entry.dayNumber,
        content: entry.content,
        iv: entry.iv,
        mood: entry.mood,
        tags: entry.tags,
        achievements: entry.achievements,
        gratitude: entry.gratitude,
      });
      
      return entry;
    } catch (error) {
      if (error instanceof AppServiceError) throw error;
      console.error('Failed to add journal entry:', error);
      throw new AppServiceError('Failed to save journal entry', 'SAVE_ENTRY_ERROR');
    }
  }

  async getJournalEntries(): Promise<JournalEntry[]> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }
    
    try {
      const entries = await journalRepository.getEntriesByUser(this.currentUser.id);
      
      if (!encryptionService.isInitialized()) {
        // Return entries without decryption if encryption is not initialized
        return entries.map(entry => ({ ...entry, content: '[Please log in to view]' }));
      }
      
      // Decrypt entries
      const decrypted = await Promise.all(
        entries.map(async (entry) => {
          if (entry.content && entry.iv) {
            try {
              const decryptedContent = await encryptionService.decrypt({
                encrypted: entry.content,
                iv: entry.iv,
              });
              return { ...entry, content: decryptedContent };
            } catch (error) {
              console.error('Failed to decrypt entry:', error);
              return { ...entry, content: '[Failed to decrypt]' };
            }
          }
          return entry;
        })
      );
      
      return decrypted;
    } catch (error) {
      console.error('Failed to get journal entries:', error);
      throw new AppServiceError('Failed to load journal entries', 'LOAD_ENTRIES_ERROR');
    }
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  async getCurrentPeriod() {
    if (!this.currentUser) return null;
    return await browserDB.getActivePeriod(this.currentUser.id);
  }

  hasUser(): boolean {
    return this.currentUser !== null;
  }

  async logout(): Promise<void> {
    this.authenticated = false;
    encryptionService.clear();
    // Keep currentUser for login page
  }

  isAuthenticated(): boolean {
    return this.authenticated && encryptionService.isInitialized();
  }

  async clearAllData(): Promise<void> {
    await browserDB.clear();
    this.currentUser = null;
    encryptionService.clear();
  }

  async getJournalEntriesPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ entries: JournalEntry[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }
    
    try {
      const result = await journalRepository.getEntriesPaginated(this.currentUser.id, page, pageSize);
      
      if (!encryptionService.isInitialized()) {
        // Return entries without decryption if encryption is not initialized
        return {
          ...result,
          entries: result.entries.map(entry => ({ ...entry, content: '[Please log in to view]' }))
        };
      }
      
      // Decrypt entries
      const decryptedEntries = await Promise.all(
        result.entries.map(async (entry) => {
          if (entry.content && entry.iv) {
            try {
              const decryptedContent = await encryptionService.decrypt({
                encrypted: entry.content,
                iv: entry.iv,
              });
              return { ...entry, content: decryptedContent };
            } catch (error) {
              console.error('Failed to decrypt entry:', error);
              return { ...entry, content: '[Failed to decrypt]' };
            }
          }
          return entry;
        })
      );
      
      return {
        ...result,
        entries: decryptedEntries
      };
    } catch (error) {
      console.error('Failed to get journal entries:', error);
      throw new AppServiceError('Failed to load journal entries', 'LOAD_ENTRIES_ERROR');
    }
  }

  // Goal methods
  async createGoal(formData: GoalFormData): Promise<Goal> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    try {
      const currentPeriod = await this.getCurrentPeriod();
      
      const goal = await goalRepository.createGoal({
        userId: this.currentUser.id,
        periodId: currentPeriod?.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'active',
        targetDate: formData.targetDate,
        progress: 0,
        milestones: formData.milestones?.map((m, index) => ({
          id: crypto.randomUUID(),
          title: m.title,
          completed: false,
        })),
      });

      // Queue for sync
      await syncQueue.addOperation('create', 'goal', goal.id, {
        ...goal,
        userId: undefined, // Don't sync userId
      });

      return goal;
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw new AppServiceError('Failed to create goal', 'CREATE_GOAL_ERROR');
    }
  }

  async getGoals(status?: GoalStatus): Promise<Goal[]> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    try {
      if (status) {
        return await goalRepository.getGoalsByStatus(this.currentUser.id, status);
      }
      return await goalRepository.getGoalsByUser(this.currentUser.id);
    } catch (error) {
      console.error('Failed to get goals:', error);
      throw new AppServiceError('Failed to load goals', 'LOAD_GOALS_ERROR');
    }
  }

  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    try {
      const goal = await goalRepository.updateProgress(goalId, this.currentUser.id, progress);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goal.id, {
        progress: goal.progress,
        status: goal.status,
        completedAt: goal.completedAt,
      });

      return goal;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw new AppServiceError('Failed to update goal progress', 'UPDATE_GOAL_ERROR');
    }
  }

  async toggleGoalMilestone(goalId: string, milestoneId: string): Promise<Goal> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    try {
      const goal = await goalRepository.toggleMilestone(goalId, this.currentUser.id, milestoneId);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goal.id, {
        milestones: goal.milestones,
        progress: goal.progress,
      });

      return goal;
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
      throw new AppServiceError('Failed to update milestone', 'UPDATE_MILESTONE_ERROR');
    }
  }

  async deleteGoal(goalId: string): Promise<void> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    try {
      await goalRepository.deleteGoal(goalId);

      // Queue for sync
      await syncQueue.addOperation('delete', 'goal', goalId, {});
    } catch (error) {
      console.error('Failed to delete goal:', error);
      throw new AppServiceError('Failed to delete goal', 'DELETE_GOAL_ERROR');
    }
  }

  // Habit methods
  async createHabit(data: {
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    targetCount?: number;
    color?: string;
    icon?: string;
  }): Promise<Habit> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const period = await this.getCurrentPeriod();
      const habit = await habitRepository.create({
        ...data,
        userId: this.currentUser.id,
        periodId: period?.id,
        currentStreak: 0,
        longestStreak: 0,
        completions: [],
      });

      await syncQueue.addOperation('create', 'habit', habit.id, habit);
      return habit;
    } catch (error) {
      console.error('Failed to create habit:', error);
      throw new AppServiceError('Failed to create habit', 'CREATE_HABIT_ERROR');
    }
  }

  async getHabits(): Promise<Habit[]> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      return await habitRepository.findAllByUserId(this.currentUser.id as any);
    } catch (error) {
      console.error('Failed to get habits:', error);
      throw new AppServiceError('Failed to load habits', 'LOAD_HABITS_ERROR');
    }
  }

  async getHabitById(id: string): Promise<Habit | null> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      return await habitRepository.findById(id as any, this.currentUser.id as any);
    } catch (error) {
      console.error('Failed to get habit:', error);
      throw new AppServiceError('Failed to load habit', 'LOAD_HABIT_ERROR');
    }
  }

  async updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt' | 'completions' | 'currentStreak' | 'longestStreak'>>): Promise<Habit | null> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const habit = await habitRepository.update(id as any, this.currentUser.id as any, updates);
      if (habit) {
        await syncQueue.addOperation('update', 'habit', habit.id, habit);
      }
      return habit;
    } catch (error) {
      console.error('Failed to update habit:', error);
      throw new AppServiceError('Failed to update habit', 'UPDATE_HABIT_ERROR');
    }
  }

  async deleteHabit(id: string): Promise<void> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const success = await habitRepository.delete(id as any, this.currentUser.id as any);
      if (success) {
        await syncQueue.addOperation('delete', 'habit', id, { id });
      }
    } catch (error) {
      console.error('Failed to delete habit:', error);
      throw new AppServiceError('Failed to delete habit', 'DELETE_HABIT_ERROR');
    }
  }

  async recordHabitCompletion(id: string, date?: string, notes?: string): Promise<Habit | null> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const completionDate = date || new Date().toISOString();
      const habit = await habitRepository.recordCompletion(id as any, this.currentUser.id as any, completionDate, notes);
      if (habit) {
        await syncQueue.addOperation('update', 'habit', habit.id, habit);
      }
      return habit;
    } catch (error) {
      console.error('Failed to record habit completion:', error);
      throw new AppServiceError('Failed to record completion', 'RECORD_COMPLETION_ERROR');
    }
  }

  async removeHabitCompletion(id: string, date: string): Promise<Habit | null> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const habit = await habitRepository.removeCompletion(id as any, this.currentUser.id as any, date);
      if (habit) {
        await syncQueue.addOperation('update', 'habit', habit.id, habit);
      }
      return habit;
    } catch (error) {
      console.error('Failed to remove habit completion:', error);
      throw new AppServiceError('Failed to remove completion', 'REMOVE_COMPLETION_ERROR');
    }
  }

  async getHabitsByPeriod(periodId: string): Promise<Habit[]> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      return await habitRepository.findByPeriodId(periodId, this.currentUser.id as any);
    } catch (error) {
      console.error('Failed to get habits by period:', error);
      throw new AppServiceError('Failed to load habits', 'LOAD_HABITS_ERROR');
    }
  }
}

export const appService = new AppService();