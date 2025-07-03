// Use IndexedDB for browser compatibility
export {
  initializeDatabaseService,
  getDatabaseService,
  closeDatabaseService,
  isDatabaseServiceInitialized,
  type DatabaseService
} from './idb-service';

// Export repositories
export * from './repositories';

// Export types
export type { User, JournalEntry, Period, Goal, Habit } from '../validation/schemas';