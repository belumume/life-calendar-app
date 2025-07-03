import { userRepository } from '../db/repositories/user-repository';
import { journalRepository } from '../db/repositories/journal-repository';
import { browserDB } from '../db/browser-db';
import { encryptionService } from '../encryption/browser-crypto';
import type { User, JournalEntry } from '../validation/schemas';

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
      
      return await journalRepository.createEntry({
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
}

export const appService = new AppService();