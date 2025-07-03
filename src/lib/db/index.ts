import { AppDatabase, initializeDatabase, closeDatabase } from './database';
import { UserRepository } from './repositories/user.repository';
import { JournalRepository } from './repositories/journal.repository';
import { getCryptoService, initializeCrypto } from '../encryption/crypto';

export interface DatabaseService {
  db: AppDatabase;
  users: UserRepository;
  journal: JournalRepository;
  // TODO: Add more repositories
  // periods: PeriodRepository;
  // goals: GoalRepository;
  // habits: HabitRepository;
}

let dbService: DatabaseService | null = null;

/**
 * Initialize the database service with encryption
 */
export async function initializeDatabaseService(passphrase?: string): Promise<DatabaseService> {
  // Initialize database
  const db = await initializeDatabase();
  
  // Initialize repositories
  const users = new UserRepository(db);
  const journal = new JournalRepository(db);
  
  // Check if we have an existing user to get the salt
  const existingUser = await users.findFirst();
  
  if (passphrase) {
    // Initialize encryption
    if (existingUser) {
      // Use existing salt from user metadata (we'll need to store this)
      // For now, we'll generate a new one
      await initializeCrypto(passphrase);
    } else {
      // New user, generate new salt
      await initializeCrypto(passphrase);
    }
  }
  
  dbService = {
    db,
    users,
    journal,
  };
  
  return dbService;
}

/**
 * Get the database service instance
 */
export function getDatabaseService(): DatabaseService {
  if (!dbService) {
    throw new Error('Database service not initialized. Call initializeDatabaseService() first.');
  }
  return dbService;
}

/**
 * Close the database service
 */
export function closeDatabaseService(): void {
  if (dbService) {
    closeDatabase();
    dbService = null;
  }
}

/**
 * Check if database service is initialized
 */
export function isDatabaseServiceInitialized(): boolean {
  return dbService !== null;
}

// Export types and utilities
export * from './database';
export * from './repositories';
export type { User, JournalEntry, Period, Goal, Habit } from '../validation/schemas';