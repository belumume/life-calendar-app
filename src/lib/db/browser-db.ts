import { openDB, IDBPDatabase } from 'idb';
import type { User, JournalEntry } from '../validation/schemas';
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
}

class BrowserDatabase {
  private db: IDBPDatabase<AppDB> | null = null;

  async init() {
    this.db = await openDB<AppDB>('life-calendar', 1, {
      upgrade(db) {
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
      date: e.date,
      dayNumber: e.dayNumber,
      content: e.content,
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

  async saveEntry(entry: any): Promise<void> {
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

  async getActivePeriod(userId: string): Promise<any | null> {
    if (!this.db) await this.init();
    const periods = await this.db!.getAllFromIndex('periods', 'by-user', userId);
    return periods.find(p => p.isActive) || null;
  }

  async savePeriod(period: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('periods', {
      ...period,
      updatedAt: new Date().toISOString(),
    });
  }

  async clear() {
    if (!this.db) await this.init();
    const tx = this.db!.transaction(['users', 'entries', 'periods'], 'readwrite');
    await Promise.all([
      tx.objectStore('users').clear(),
      tx.objectStore('entries').clear(),
      tx.objectStore('periods').clear(),
    ]);
  }
}

// Export a singleton instance
export const browserDB = new BrowserDatabase();