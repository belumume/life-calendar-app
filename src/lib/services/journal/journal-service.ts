import { journalRepository } from '../../db/repositories/journal-repository';
import { browserDB } from '../../db/browser-db';
import { encryptionService } from '../../encryption/browser-crypto';
import { syncQueue } from '../../sync/sync-queue';
import { authService } from '../auth/auth-service';
import type { JournalEntry } from '../../validation/schemas';

export class JournalServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'JournalServiceError';
  }
}

export class JournalService {
  /**
   * Add a new journal entry
   */
  async addEntry(
    content: string,
    dayNumber: number,
    mood?: string,
    tags?: string[],
    achievements?: string[],
    gratitude?: string[]
  ): Promise<JournalEntry> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();
    
    try {
      const period = await browserDB.getActivePeriod(userId);
      if (!period) {
        throw new JournalServiceError('No active period found', 'NO_ACTIVE_PERIOD');
      }
      
      // Encrypt content
      const encrypted = await encryptionService.encrypt(content);
      
      const entry = await journalRepository.createEntry({
        userId,
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
      if (error instanceof JournalServiceError) throw error;
      console.error('Failed to add journal entry:', error);
      throw new JournalServiceError('Failed to save journal entry', 'SAVE_ENTRY_ERROR');
    }
  }

  /**
   * Get all journal entries for the current user
   */
  async getEntries(): Promise<JournalEntry[]> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new JournalServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }
    
    try {
      const entries = await journalRepository.getEntriesByUser(currentUser.id);
      
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
      throw new JournalServiceError('Failed to load journal entries', 'LOAD_ENTRIES_ERROR');
    }
  }

  /**
   * Get paginated journal entries
   */
  async getEntriesPaginated(
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ entries: JournalEntry[]; total: number; hasMore: boolean; page: number; pageSize: number }> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new JournalServiceError('No user logged in', 'NOT_AUTHENTICATED');
    }
    
    try {
      const result = await journalRepository.getEntriesPaginated(currentUser.id, page, pageSize);
      
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
      throw new JournalServiceError('Failed to load journal entries', 'LOAD_ENTRIES_ERROR');
    }
  }
}

export const journalService = new JournalService();