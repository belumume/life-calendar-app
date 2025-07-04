import { openDB, IDBPDatabase } from 'idb';
import type { User, JournalEntry, Habit } from '../validation/schemas';
import { UserSchema, JournalEntrySchema } from '../validation/schemas';

interface AppDB {
  users: {
    key: string;
    value: User;
  };
  entries: {
    key: string;
    value: {
      id: string;
      userId: string;
      periodId?: string;
      date: string;
      dayNumber: number;
      content: string;
      iv?: string;
      mood?: string;
      tags?: string[];
      achievements?: string[];
      gratitude?: string[];
      encrypted?: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-user': string; 'by-date': string };
  };
  periods: {
    key: string;
    value: {
      id: string;
      userId: string;
      name: string;
      startDate: string;
      endDate: string;
      totalDays: number;
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-user': string; 'by-active': number };
  };
  goals: {
    key: string;
    value: {
      id: string;
      userId: string;
      periodId?: string;
      title: string;
      description?: string;
      category: string;
      priority: string;
      status: string;
      targetDate?: string;
      progress: number;
      milestones?: Array<{
        id: string;
        title: string;
        completed: boolean;
        completedDate?: string;
      }>;
      linkedHabitIds?: string[];
      createdAt: string;
      updatedAt: string;
      completedAt?: string;
    };
    indexes: { 'by-user': string; 'by-status': string; 'by-period': string };
  };
  habits: {
    key: string;
    value: Habit;
    indexes: { 'by-user': string; 'by-period': string };
  };
}

class BrowserDatabase {
  private db: IDBPDatabase<AppDB> | null = null;

  async init() {
    this.db = await openDB<AppDB>('life-calendar', 3, {
      upgrade(db, oldVersion) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }

        // Entries store
        if (!db.objectStoreNames.contains('entries')) {
          const entriesStore = db.createObjectStore('entries', { keyPath: 'id' });
          entriesStore.createIndex('by-user', 'userId');
          entriesStore.createIndex('by-date', 'date');
        }

        // Periods store
        if (!db.objectStoreNames.contains('periods')) {
          const periodsStore = db.createObjectStore('periods', { keyPath: 'id' });
          periodsStore.createIndex('by-user', 'userId');
          periodsStore.createIndex('by-active', 'isActive');
        }

        // Goals store (added in version 2)
        if (!db.objectStoreNames.contains('goals')) {
          const goalsStore = db.createObjectStore('goals', { keyPath: 'id' });
          goalsStore.createIndex('by-user', 'userId');
          goalsStore.createIndex('by-status', 'status');
          goalsStore.createIndex('by-period', 'periodId');
        }

        // Habits store (added in version 3)
        if (!db.objectStoreNames.contains('habits')) {
          const habitsStore = db.createObjectStore('habits', { keyPath: 'id' });
          habitsStore.createIndex('by-user', 'userId');
          habitsStore.createIndex('by-period', 'periodId');
        }
      },
    });
  }

  async getUser(): Promise<User | null> {
    if (!this.db) await this.init();
    const users = await this.db!.getAll('users');
    return users[0] || null;
  }

  async saveUser(user: User): Promise<void> {
    if (!this.db) await this.init();
    
    // Validate before saving
    const validated = UserSchema.parse(user);
    await this.db!.put('users', validated);
  }

  async getEntries(userId: string): Promise<JournalEntry[]> {
    if (!this.db) await this.init();
    const entries = await this.db!.getAllFromIndex('entries', 'by-user', userId);
    return entries.map(e => ({
      id: e.id,
      userId: e.userId,
      periodId: e.periodId,
      date: e.date,
      dayNumber: e.dayNumber,
      content: e.content,
      iv: e.iv,
      mood: e.mood,
      tags: e.tags || [],
      achievements: e.achievements || [],
      gratitude: e.gratitude || [],
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    } as JournalEntry));
  }

  async getEntriesPaginated(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ entries: JournalEntry[]; total: number; hasMore: boolean }> {
    if (!this.db) await this.init();
    
    // Get all entries for the user (sorted by date descending)
    const allEntries = await this.db!.getAllFromIndex('entries', 'by-user', userId);
    allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const total = allEntries.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    const entries = allEntries.slice(start, end).map(e => ({
      id: e.id,
      userId: e.userId,
      periodId: e.periodId,
      date: e.date,
      dayNumber: e.dayNumber,
      content: e.content,
      iv: e.iv,
      mood: e.mood,
      tags: e.tags || [],
      achievements: e.achievements || [],
      gratitude: e.gratitude || [],
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    } as JournalEntry));
    
    return {
      entries,
      total,
      hasMore: end < total
    };
  }

  async saveEntry(entry: Partial<JournalEntry>): Promise<void> {
    if (!this.db) await this.init();
    
    // Ensure entry has required fields for validation
    const entryToValidate = {
      ...entry,
      updatedAt: new Date().toISOString(),
    };
    
    // Validate essential fields (skip full validation as entry might have encrypted content)
    if (!entryToValidate.id || !entryToValidate.userId || !entryToValidate.date) {
      throw new Error('Invalid entry: missing required fields');
    }
    
    await this.db!.put('entries', entryToValidate);
  }

  async getActivePeriod(userId: string): Promise<Period | null> {
    if (!this.db) await this.init();
    const periods = await this.db!.getAllFromIndex('periods', 'by-user', userId);
    return periods.find(p => p.isActive) || null;
  }

  async savePeriod(period: Partial<Period>): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('periods', {
      ...period,
      updatedAt: new Date().toISOString(),
    });
  }

  async clear() {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(['users', 'entries', 'periods', 'goals', 'habits'], 'readwrite');
    await Promise.all([
      tx.objectStore('users').clear(),
      tx.objectStore('entries').clear(),
      tx.objectStore('periods').clear(),
      tx.objectStore('goals').clear(),
      tx.objectStore('habits').clear(),
    ]);
  }

  // Goal methods
  async saveGoal(goal: Partial<Goal>): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('goals', {
      ...goal,
      updatedAt: new Date().toISOString(),
    });
  }

  async getGoals(userId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('goals', 'by-user', userId);
  }

  async getGoalsByStatus(userId: string, status: string): Promise<any[]> {
    if (!this.db) await this.init();
    const allGoals = await this.getGoals(userId);
    return allGoals.filter(g => g.status === status);
  }

  async getGoalsByPeriod(periodId: string): Promise<any[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('goals', 'by-period', periodId);
  }

  async deleteGoal(goalId: string): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.delete('goals', goalId);
  }

  // Habit methods
  async addHabit(habit: Habit): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('habits', habit);
  }

  async getHabitById(id: string, userId: string): Promise<Habit | null> {
    if (!this.db) await this.init();
    const habit = await this.db!.get('habits', id);
    return (habit && habit.userId === userId) ? habit : null;
  }

  async getHabitsByUserId(userId: string): Promise<Habit[]> {
    if (!this.db) await this.init();
    return await this.db!.getAllFromIndex('habits', 'by-user', userId);
  }

  async getHabitsByPeriodId(periodId: string, userId: string): Promise<Habit[]> {
    if (!this.db) await this.init();
    const habits = await this.db!.getAllFromIndex('habits', 'by-period', periodId);
    return habits.filter(h => h.userId === userId);
  }

  async updateHabit(id: string, userId: string, updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt'>>): Promise<Habit | null> {
    if (!this.db) await this.init();
    const habit = await this.getHabitById(id, userId);
    if (!habit) return null;

    const updated = {
      ...habit,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.db!.put('habits', updated);
    return updated;
  }

  async deleteHabit(id: string, userId: string): Promise<boolean> {
    if (!this.db) await this.init();
    const habit = await this.getHabitById(id, userId);
    if (!habit) return false;

    await this.db!.delete('habits', id);
    return true;
  }
}

// Export a singleton instance
export const browserDB = new BrowserDatabase();