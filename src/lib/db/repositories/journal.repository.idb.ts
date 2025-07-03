import { BaseRepositoryIDB } from './base.repository.idb';
import { JournalEntry, JournalEntrySchema } from '../../validation/schemas';
import { IndexedDatabase } from '../indexed-db';

export class JournalRepositoryIDB extends BaseRepositoryIDB<JournalEntry> {
  constructor(db: IndexedDatabase) {
    super(db, 'journalEntries');
  }

  async create(data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const entry: JournalEntry = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    // Validate data
    const validated = JournalEntrySchema.parse(entry);

    // Encrypt sensitive content
    const sensitiveData = {
      content: validated.content,
      mood: validated.mood,
      tags: validated.tags,
      achievements: validated.achievements,
      gratitude: validated.gratitude,
    };

    const { encrypted, iv } = await this.encryptData(sensitiveData);

    // Save to IndexedDB
    const db = this.db.getDatabase();
    await db.put('journalEntries', {
      id: validated.id,
      userId: validated.userId,
      periodId: validated.periodId,
      date: validated.date,
      dayNumber: validated.dayNumber,
      encryptedContent: encrypted,
      iv: iv,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async findById(id: string): Promise<JournalEntry | null> {
    const db = this.db.getDatabase();
    const data = await db.get('journalEntries', id);
    
    if (!data) return null;
    
    return this.decryptEntry(data);
  }

  async findAll(): Promise<JournalEntry[]> {
    const db = this.db.getDatabase();
    const all = await db.getAll('journalEntries');
    
    return Promise.all(all.map(data => this.decryptEntry(data)));
  }

  async findByUserId(userId: string): Promise<JournalEntry[]> {
    const db = this.db.getDatabase();
    const entries = await db.getAllFromIndex('journalEntries', 'by-user', userId);
    
    return Promise.all(entries.map(data => this.decryptEntry(data)));
  }

  async findByPeriodId(periodId: string): Promise<JournalEntry[]> {
    const db = this.db.getDatabase();
    const entries = await db.getAllFromIndex('journalEntries', 'by-period', periodId);
    
    return Promise.all(entries.map(data => this.decryptEntry(data)));
  }

  async findByDate(userId: string, date: string): Promise<JournalEntry | null> {
    const db = this.db.getDatabase();
    
    // Get all entries for the user
    const userEntries = await db.getAllFromIndex('journalEntries', 'by-user', userId);
    
    // Filter by date
    const dateStr = new Date(date).toISOString().split('T')[0];
    const matching = userEntries.filter(entry => 
      new Date(entry.date).toISOString().split('T')[0] === dateStr
    );
    
    if (matching.length === 0) return null;
    
    return this.decryptEntry(matching[0]);
  }

  async findByDateRange(userId: string, startDate: string, endDate: string): Promise<JournalEntry[]> {
    const db = this.db.getDatabase();
    const userEntries = await db.getAllFromIndex('journalEntries', 'by-user', userId);
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const matching = userEntries.filter(entry => {
      const entryTime = new Date(entry.date).getTime();
      return entryTime >= start && entryTime <= end;
    });
    
    return Promise.all(matching.map(data => this.decryptEntry(data)));
  }

  async update(id: string, data: Partial<JournalEntry>): Promise<JournalEntry | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...data,
      id: existing.id,
      userId: existing.userId, // Cannot change user
      createdAt: existing.createdAt,
      updatedAt: this.getCurrentTimestamp(),
    };

    // Validate data
    const validated = JournalEntrySchema.parse(updated);

    // Encrypt sensitive content
    const sensitiveData = {
      content: validated.content,
      mood: validated.mood,
      tags: validated.tags,
      achievements: validated.achievements,
      gratitude: validated.gratitude,
    };

    const { encrypted, iv } = await this.encryptData(sensitiveData);

    // Update in IndexedDB
    const db = this.db.getDatabase();
    await db.put('journalEntries', {
      id: validated.id,
      userId: validated.userId,
      periodId: validated.periodId,
      date: validated.date,
      dayNumber: validated.dayNumber,
      encryptedContent: encrypted,
      iv: iv,
      createdAt: validated.createdAt,
      updatedAt: validated.updatedAt,
    });

    return validated;
  }

  async delete(id: string): Promise<boolean> {
    const db = this.db.getDatabase();
    const existing = await db.get('journalEntries', id);
    
    if (!existing) return false;
    
    await db.delete('journalEntries', id);
    return true;
  }

  /**
   * Decrypt journal entry data
   */
  private async decryptEntry(data: any): Promise<JournalEntry> {
    const decrypted = await this.decryptData(data.encryptedContent, data.iv);
    
    const entry: JournalEntry = {
      id: data.id,
      userId: data.userId,
      periodId: data.periodId,
      date: data.date,
      dayNumber: data.dayNumber,
      content: decrypted.content,
      mood: decrypted.mood,
      tags: decrypted.tags,
      achievements: decrypted.achievements,
      gratitude: decrypted.gratitude,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return JournalEntrySchema.parse(entry);
  }

  /**
   * Get entry count for a user
   */
  async getCount(userId: string): Promise<number> {
    const db = this.db.getDatabase();
    const entries = await db.getAllFromIndex('journalEntries', 'by-user', userId);
    return entries.length;
  }

  /**
   * Get recent entries for a user
   */
  async getRecent(userId: string, limit: number = 10): Promise<JournalEntry[]> {
    const entries = await this.findByUserId(userId);
    
    // Sort by date descending and take the limit
    return entries
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, limit);
  }
}