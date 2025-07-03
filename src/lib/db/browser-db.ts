import { openDB, IDBPDatabase } from 'idb';
import type { User, JournalEntry } from '../validation/schemas';

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
      date: string;
      dayNumber: number;
      content: string;
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
    await this.db!.put('users', user);
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

  async saveEntry(entry: any): Promise<void> {
    if (!this.db) await this.init();
    await this.db!.put('entries', {
      ...entry,
      updatedAt: new Date().toISOString(),
    });
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