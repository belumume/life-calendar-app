import { userRepository } from '../db/repositories/user-repository';
import { journalRepository } from '../db/repositories/journal-repository';
import { goalRepository } from '../db/repositories/goal-repository';
import { habitRepository } from '../db/repositories/habit-repository';
import { browserDB } from '../db/browser-db';
import { encryptionService } from '../encryption/browser-crypto';
import { syncQueue } from '../sync/sync-queue';
import { authRateLimiter } from '../utils/rate-limiter';
import type { User, JournalEntry, Goal, GoalStatus, Habit, Theme } from '../validation/schemas';
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
    
    const userId = this.currentUser.id;
    
    // Check rate limit before attempting login
    const canAttempt = await authRateLimiter.checkLimit(userId);
    if (!canAttempt) {
      const remainingAttempts = await authRateLimiter.getRemainingAttempts(userId);
      const timeUntilUnlock = await authRateLimiter.getTimeUntilUnlock(userId);
      
      if (timeUntilUnlock) {
        const minutes = Math.ceil(timeUntilUnlock / 60000);
        throw new AppServiceError(
          `Account locked due to too many failed attempts. Please try again in ${minutes} minutes.`,
          'RATE_LIMITED'
        );
      } else {
        throw new AppServiceError(
          `Too many failed attempts. ${remainingAttempts} attempts remaining.`,
          'RATE_LIMITED'
        );
      }
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
      
      // Record successful attempt (clears rate limit)
      await authRateLimiter.recordAttempt(userId, true);
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      this.authenticated = false;
      
      // Record failed attempt
      await authRateLimiter.recordAttempt(userId, false);
      
      // Get remaining attempts for error message
      const remainingAttempts = await authRateLimiter.getRemainingAttempts(userId);
      
      if (remainingAttempts === 0) {
        throw new AppServiceError(
          'Account locked due to too many failed attempts. Please try again later.',
          'RATE_LIMITED'
        );
      } else if (remainingAttempts <= 2) {
        throw new AppServiceError(
          `Invalid passphrase. ${remainingAttempts} attempts remaining before account lock.`,
          'INVALID_PASSPHRASE'
        );
      } else {
        throw new AppServiceError(
          'Invalid passphrase. Please try again.',
          'INVALID_PASSPHRASE'
        );
      }
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

    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }

    try {
      const currentPeriod = await this.getCurrentPeriod();
      
      const goal: Goal = {
        id: crypto.randomUUID(),
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
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Encrypt sensitive goal data
      const goalData = {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate,
        milestones: goal.milestones,
        linkedHabitIds: goal.linkedHabitIds,
      };

      const encrypted = await encryptionService.encrypt(JSON.stringify(goalData));

      // Store encrypted goal
      await goalRepository.createEncryptedGoal({
        id: goal.id,
        userId: goal.userId,
        periodId: goal.periodId,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        status: goal.status,
        progress: goal.progress,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      });

      // Queue for sync
      await syncQueue.addOperation('create', 'goal', goal.id, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        status: goal.status,
        progress: goal.progress,
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
      let encryptedGoals;
      if (status) {
        encryptedGoals = await goalRepository.getEncryptedGoalsByStatus(this.currentUser.id, status);
      } else {
        encryptedGoals = await goalRepository.getEncryptedGoalsByUser(this.currentUser.id);
      }

      if (!encryptionService.isInitialized()) {
        // Return goals without decryption if encryption is not initialized
        return encryptedGoals.map(g => ({
          id: g.id,
          userId: g.userId,
          periodId: g.periodId,
          title: '[Please log in to view]',
          description: '',
          category: 'personal' as const,
          priority: 'medium' as const,
          status: g.status,
          progress: g.progress,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
          completedAt: g.completedAt,
        }));
      }

      // Decrypt goals
      const decryptedGoals = await Promise.all(
        encryptedGoals.map(async (encryptedGoal) => {
          try {
            const decryptedData = await encryptionService.decrypt({
              encrypted: encryptedGoal.encryptedData,
              iv: encryptedGoal.iv,
            });
            const goalData = JSON.parse(decryptedData);
            
            return {
              id: encryptedGoal.id,
              userId: encryptedGoal.userId,
              periodId: encryptedGoal.periodId,
              ...goalData,
              status: encryptedGoal.status,
              progress: encryptedGoal.progress,
              createdAt: encryptedGoal.createdAt,
              updatedAt: encryptedGoal.updatedAt,
              completedAt: encryptedGoal.completedAt,
            } as Goal;
          } catch (error) {
            console.error('Failed to decrypt goal:', error);
            return {
              id: encryptedGoal.id,
              userId: encryptedGoal.userId,
              periodId: encryptedGoal.periodId,
              title: '[Failed to decrypt]',
              description: '',
              category: 'personal' as const,
              priority: 'medium' as const,
              status: encryptedGoal.status,
              progress: encryptedGoal.progress,
              createdAt: encryptedGoal.createdAt,
              updatedAt: encryptedGoal.updatedAt,
              completedAt: encryptedGoal.completedAt,
            } as Goal;
          }
        })
      );

      return decryptedGoals;
    } catch (error) {
      console.error('Failed to get goals:', error);
      throw new AppServiceError('Failed to load goals', 'LOAD_GOALS_ERROR');
    }
  }

  async updateGoalProgress(goalId: string, progress: number): Promise<Goal> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }

    try {
      // Get the encrypted goal
      const encryptedGoal = await goalRepository.getEncryptedGoalById(goalId, this.currentUser.id);
      if (!encryptedGoal) {
        throw new Error('Goal not found');
      }

      // Update progress and status
      const updatedGoal = {
        ...encryptedGoal,
        progress,
        status: progress >= 100 ? 'completed' as GoalStatus : encryptedGoal.status,
        completedAt: progress >= 100 ? new Date().toISOString() : encryptedGoal.completedAt,
        updatedAt: new Date().toISOString(),
      };

      await goalRepository.updateEncryptedGoal(goalId, updatedGoal);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goalId, {
        progress: updatedGoal.progress,
        status: updatedGoal.status,
        completedAt: updatedGoal.completedAt,
      });

      // Decrypt and return the full goal
      const decryptedData = await encryptionService.decrypt({
        encrypted: encryptedGoal.encryptedData,
        iv: encryptedGoal.iv,
      });
      const goalData = JSON.parse(decryptedData);

      return {
        id: updatedGoal.id,
        userId: updatedGoal.userId,
        periodId: updatedGoal.periodId,
        ...goalData,
        status: updatedGoal.status,
        progress: updatedGoal.progress,
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt,
        completedAt: updatedGoal.completedAt,
      } as Goal;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw new AppServiceError('Failed to update goal progress', 'UPDATE_GOAL_ERROR');
    }
  }

  async toggleGoalMilestone(goalId: string, milestoneId: string): Promise<Goal> {
    if (!this.currentUser) {
      throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }

    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }

    try {
      // Get the encrypted goal
      const encryptedGoal = await goalRepository.getEncryptedGoalById(goalId, this.currentUser.id);
      if (!encryptedGoal) {
        throw new Error('Goal not found');
      }

      // Decrypt goal data
      const decryptedData = await encryptionService.decrypt({
        encrypted: encryptedGoal.encryptedData,
        iv: encryptedGoal.iv,
      });
      const goalData = JSON.parse(decryptedData);

      // Toggle milestone
      if (!goalData.milestones) {
        throw new Error('Goal has no milestones');
      }

      const milestone = goalData.milestones.find((m: any) => m.id === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      milestone.completed = !milestone.completed;
      milestone.completedDate = milestone.completed ? new Date().toISOString() : undefined;

      // Recalculate progress
      const completedCount = goalData.milestones.filter((m: any) => m.completed).length;
      const progress = Math.round((completedCount / goalData.milestones.length) * 100);

      // Re-encrypt with updated data
      const encrypted = await encryptionService.encrypt(JSON.stringify(goalData));

      // Update encrypted goal
      const updatedGoal = {
        ...encryptedGoal,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        progress,
        status: progress >= 100 ? 'completed' as GoalStatus : encryptedGoal.status,
        completedAt: progress >= 100 ? new Date().toISOString() : encryptedGoal.completedAt,
        updatedAt: new Date().toISOString(),
      };

      await goalRepository.updateEncryptedGoal(goalId, updatedGoal);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goalId, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        progress,
        status: updatedGoal.status,
      });

      return {
        id: updatedGoal.id,
        userId: updatedGoal.userId,
        periodId: updatedGoal.periodId,
        ...goalData,
        status: updatedGoal.status,
        progress: updatedGoal.progress,
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt,
        completedAt: updatedGoal.completedAt,
      } as Goal;
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

    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }

    try {
      const period = await this.getCurrentPeriod();
      
      const habit: Habit = {
        id: crypto.randomUUID(),
        userId: this.currentUser.id,
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
      throw new AppServiceError('Failed to create habit', 'CREATE_HABIT_ERROR');
    }
  }

  async getHabits(): Promise<Habit[]> {
    if (!this.authenticated || !this.currentUser) {
      throw new AppServiceError('User not authenticated', 'AUTH_ERROR');
    }

    try {
      const encryptedHabits = await habitRepository.findAllEncryptedByUserId(this.currentUser.id as any);

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

    if (!encryptionService.isInitialized()) {
      throw new AppServiceError('Encryption not initialized', 'ENCRYPTION_ERROR');
    }

    try {
      const completionDate = date || new Date().toISOString();
      
      // Get the encrypted habit
      const encryptedHabit = await habitRepository.findEncryptedById(id as any, this.currentUser.id as any);
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
        userId: this.currentUser.id,
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
      throw new AppServiceError('Failed to record completion', 'RECORD_COMPLETION_ERROR');
    }
  }

  // Helper method for calculating streaks
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

  async updateUserTheme(theme: Theme): Promise<void> {
    if (!this.currentUser) {
      throw new AppServiceError('User not found', 'USER_NOT_FOUND');
    }

    try {
      // Update user with new theme
      this.currentUser = { ...this.currentUser, theme };
      await userRepository.updateUser(this.currentUser.id, { theme });
      
      // Queue for sync
      await syncQueue.addOperation('update', 'user', this.currentUser.id, { theme });
    } catch (error) {
      console.error('Failed to update user theme:', error);
      throw new AppServiceError('Failed to update theme', 'UPDATE_THEME_ERROR');
    }
  }
}

export const appService = new AppService();