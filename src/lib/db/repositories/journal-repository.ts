import { browserDB } from '../browser-db';
import type { JournalEntry } from '../../validation/schemas';
import { createJournalEntrySchema } from '../../validation/schemas';

export class JournalRepository {
  async createEntry(data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<JournalEntry> {
    const entry: JournalEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate before saving
    const validated = createJournalEntrySchema.parse(entry);
    await browserDB.saveEntry(validated);
    
    return validated;
  }

  async getEntriesByUser(userId: string): Promise<JournalEntry[]> {
    return await browserDB.getEntries(userId);
  }

  async getEntryByDate(userId: string, date: string): Promise<JournalEntry | null> {
    const entries = await this.getEntriesByUser(userId);
    return entries.find(e => e.date === date) || null;
  }

  async updateEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry> {
    const entries = await browserDB.getEntries(updates.userId || '');
    const existing = entries.find(e => e.id === id);
    
    if (!existing) {
      throw new Error('Entry not found');
    }

    const updated: JournalEntry = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await browserDB.saveEntry(updated);
    return updated;
  }

  async deleteEntry(id: string, userId: string): Promise<void> {
    // IndexedDB doesn't have a direct delete method in our simple implementation
    // For now, we'd need to implement this in browser-db.ts
    console.warn('Delete not implemented yet');
  }
}

export const journalRepository = new JournalRepository();