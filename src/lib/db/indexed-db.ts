import { openDB, DBSchema, IDBPDatabase, deleteDB } from 'idb';
import type { User, JournalEntry, Goal, Habit, Period } from '../validation/schemas';

// Define the database schema
interface LifeCalendarDB extends DBSchema {
  users: {
    key: string;
    value: {
      id: string;
      birthDate: string;
      createdAt: string;
      updatedAt: string;
    };
  };
  periods: {
    key: string;
    value: {
      id: string;
      userId: string;
      name: string;
      startDate: string;
      endDate: string;
      description?: string;
      totalDays?: number;
      theme?: {
        primaryColor?: string;
        icon?: string;
      };
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 'by-user': string };
  };
  journalEntries: {
    key: string;
    value: {
      id: string;
      userId: string;
      periodId?: string;
      date: string;
      dayNumber?: number;
      encryptedContent: string;
      iv: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 
      'by-user': string;
      'by-period': string;
      'by-date': string;
      'by-user-date': [string, string];
    };
  };
  goals: {
    key: string;
    value: {
      id: string;
      userId: string;
      periodId?: string;
      encryptedData: string;
      iv: string;
      completed: boolean;
      completedAt?: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 
      'by-user': string;
      'by-period': string;
    };
  };
  habits: {
    key: string;
    value: {
      id: string;
      userId: string;
      periodId?: string;
      encryptedData: string;
      iv: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      currentStreak: number;
      longestStreak: number;
      createdAt: string;
      updatedAt: string;
    };
    indexes: { 
      'by-user': string;
      'by-period': string;
    };
  };
  habitCompletions: {
    key: string;
    value: {
      id: string;
      habitId: string;
      date: string;
      notes?: string;
      createdAt: string;
    };
    indexes: { 
      'by-habit': string;
      'by-habit-date': [string, string];
    };
  };
}

const DB_NAME = 'life-calendar-db';
const DB_VERSION = 1;

export class IndexedDatabase {
  private db: IDBPDatabase<LifeCalendarDB> | null = null;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      this.db = await openDB<LifeCalendarDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // Users store
          if (!db.objectStoreNames.contains('users')) {
            db.createObjectStore('users', { keyPath: 'id' });
          }

          // Periods store
          if (!db.objectStoreNames.contains('periods')) {
            const periodStore = db.createObjectStore('periods', { keyPath: 'id' });
            periodStore.createIndex('by-user', 'userId');
          }

          // Journal entries store
          if (!db.objectStoreNames.contains('journalEntries')) {
            const journalStore = db.createObjectStore('journalEntries', { keyPath: 'id' });
            journalStore.createIndex('by-user', 'userId');
            journalStore.createIndex('by-period', 'periodId');
            journalStore.createIndex('by-date', 'date');
            journalStore.createIndex('by-user-date', ['userId', 'date']);
          }

          // Goals store
          if (!db.objectStoreNames.contains('goals')) {
            const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
            goalStore.createIndex('by-user', 'userId');
            goalStore.createIndex('by-period', 'periodId');
          }

          // Habits store
          if (!db.objectStoreNames.contains('habits')) {
            const habitStore = db.createObjectStore('habits', { keyPath: 'id' });
            habitStore.createIndex('by-user', 'userId');
            habitStore.createIndex('by-period', 'periodId');
          }

          // Habit completions store
          if (!db.objectStoreNames.contains('habitCompletions')) {
            const completionStore = db.createObjectStore('habitCompletions', { keyPath: 'id' });
            completionStore.createIndex('by-habit', 'habitId');
            completionStore.createIndex('by-habit-date', ['habitId', 'date']);
          }
        },
      });

      console.log('IndexedDB initialized successfully');
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): IDBPDatabase<LifeCalendarDB> {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Clear all data (for testing/reset)
   */
  async clearAll(): Promise<void> {
    const db = this.getDatabase();
    const tx = db.transaction(
      ['users', 'periods', 'journalEntries', 'goals', 'habits', 'habitCompletions'],
      'readwrite'
    );
    
    await Promise.all([
      tx.objectStore('users').clear(),
      tx.objectStore('periods').clear(),
      tx.objectStore('journalEntries').clear(),
      tx.objectStore('goals').clear(),
      tx.objectStore('habits').clear(),
      tx.objectStore('habitCompletions').clear(),
    ]);
    
    await tx.done;
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Delete the entire database
   */
  static async deleteDatabase(): Promise<void> {
    await deleteDB(DB_NAME);
  }
}

// Singleton instance
let dbInstance: IndexedDatabase | null = null;

/**
 * Get or create database instance
 */
export function getIndexedDB(): IndexedDatabase {
  if (!dbInstance) {
    dbInstance = new IndexedDatabase();
  }
  return dbInstance;
}

/**
 * Initialize the IndexedDB
 */
export async function initializeIndexedDB(): Promise<IndexedDatabase> {
  const db = getIndexedDB();
  if (!db.isInitialized()) {
    await db.initialize();
  }
  return db;
}

/**
 * Close the IndexedDB connection
 */
export function closeIndexedDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

// Re-export deleteDB for convenience
export { deleteDB } from 'idb';