import { IndexedDatabase, initializeIndexedDB, closeIndexedDB } from './indexed-db';
import { UserRepositoryIDB } from './repositories/user.repository.idb';
import { JournalRepositoryIDB } from './repositories/journal.repository.idb';
import { getCryptoService, initializeCrypto } from '../encryption/crypto';

export interface DatabaseService {
  db: IndexedDatabase;
  users: UserRepositoryIDB;
  journal: JournalRepositoryIDB;
  // TODO: Add more repositories
  // periods: PeriodRepositoryIDB;
  // goals: GoalRepositoryIDB;
  // habits: HabitRepositoryIDB;
}

let dbService: DatabaseService | null = null;

/**
 * Initialize the database service with encryption
 */
export async function initializeDatabaseService(passphrase?: string): Promise<DatabaseService> {
  // Initialize IndexedDB
  const db = await initializeIndexedDB();
  
  // Initialize repositories
  const users = new UserRepositoryIDB(db);
  const journal = new JournalRepositoryIDB(db);
  
  // Check if we have an existing user to get the salt
  const existingUser = await users.findFirst();
  
  if (passphrase) {
    // Initialize encryption
    if (existingUser) {
      // TODO: Store salt with user data for proper key derivation
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
    closeIndexedDB();
    dbService = null;
  }
}

/**
 * Check if database service is initialized
 */
export function isDatabaseServiceInitialized(): boolean {
  return dbService !== null;
}

// Export repositories for convenience
export { UserRepositoryIDB, JournalRepositoryIDB } from './repositories';
export type { User, JournalEntry, Period, Goal, Habit } from '../validation/schemas';