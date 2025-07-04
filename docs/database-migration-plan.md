# Database Migration Plan: IndexedDB to SQLite

## Overview

This document outlines the strategy for migrating from IndexedDB (current implementation) to SQLite (target implementation) for the MyLife Calendar application. The migration must ensure zero data loss, maintain encryption, and provide a seamless user experience.

## Current State (IndexedDB)

### Architecture
- **Database**: IndexedDB (browser-native)
- **Encryption**: Manual field-level encryption using Web Crypto API
- **Schema Version**: 3
- **Stores**: users, entries, periods, goals, habits

### Limitations
1. No SQL query capabilities
2. Limited cross-browser support for advanced features
3. Manual encryption for each field
4. No built-in sync capabilities
5. Performance issues with large datasets
6. Complex query operations require multiple reads

## Target State (SQLite)

### Architecture
- **Database**: SQLite with SQLCipher
- **Encryption**: Transparent full-database encryption
- **Sync**: CRSQLite for conflict-free replication
- **Access**: SQL queries for complex operations

### Benefits
1. Full SQL query support
2. Transparent encryption with SQLCipher
3. Better performance for complex queries
4. Built-in support for migrations
5. CRSQLite for multi-device sync
6. Smaller storage footprint

## Migration Strategy

### Phase 1: Preparation (Week 1-2)

#### 1.1 Environment Setup
```typescript
// Check for SQLite availability
async function checkSQLiteSupport(): Promise<boolean> {
  try {
    // Test SQLite module loading
    const sqlite = await import('better-sqlite3');
    const db = new sqlite(':memory:');
    db.close();
    return true;
  } catch (error) {
    console.error('SQLite not available:', error);
    return false;
  }
}
```

#### 1.2 Dual Database Support
Create an abstraction layer that can work with both databases:

```typescript
interface DatabaseAdapter {
  init(): Promise<void>;
  getUser(id: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  // ... other methods
}

class IndexedDBAdapter implements DatabaseAdapter {
  // Current implementation
}

class SQLiteAdapter implements DatabaseAdapter {
  // New implementation
}

class HybridDatabaseService {
  private primaryDB: DatabaseAdapter;
  private fallbackDB: DatabaseAdapter;
  
  async init() {
    if (await checkSQLiteSupport()) {
      this.primaryDB = new SQLiteAdapter();
      this.fallbackDB = new IndexedDBAdapter();
    } else {
      this.primaryDB = new IndexedDBAdapter();
    }
  }
}
```

### Phase 2: SQLite Implementation (Week 3-4)

#### 2.1 Schema Definition
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  birth_date TEXT NOT NULL,
  salt TEXT,
  theme TEXT, -- JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Journal entries table
CREATE TABLE journal_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_id TEXT,
  date TEXT NOT NULL,
  day_number INTEGER,
  content TEXT NOT NULL, -- Encrypted by SQLCipher
  mood TEXT,
  tags TEXT, -- JSON array
  achievements TEXT, -- JSON array
  gratitude TEXT, -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Goals table
CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  target_date TEXT,
  progress INTEGER DEFAULT 0,
  milestones TEXT, -- JSON array
  linked_habit_ids TEXT, -- JSON array
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Habits table
CREATE TABLE habits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  period_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  frequency TEXT NOT NULL,
  target_count INTEGER,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  completions TEXT NOT NULL, -- JSON array
  color TEXT,
  icon TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Periods table
CREATE TABLE periods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  total_days INTEGER NOT NULL,
  is_active INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- CRSQLite tables (for sync)
-- These will be auto-created by CRSQLite
```

#### 2.2 Encryption Setup
```typescript
class SQLiteEncryption {
  async initialize(passphrase: string): Promise<void> {
    // Derive key from passphrase
    const key = await this.deriveKey(passphrase);
    
    // Open encrypted database
    this.db = new Database('mylife-calendar.db');
    this.db.pragma(`key = '${key}'`);
    
    // Verify encryption
    this.db.pragma('cipher_version');
  }
  
  private async deriveKey(passphrase: string): Promise<string> {
    // Use same PBKDF2 parameters as current implementation
    // to maintain compatibility
  }
}
```

### Phase 3: Migration Implementation (Week 5-6)

#### 3.1 Migration Service
```typescript
class DatabaseMigrationService {
  private progress = 0;
  private errors: MigrationError[] = [];
  
  async migrate(): Promise<MigrationResult> {
    try {
      // 1. Check if migration needed
      if (await this.isMigrationComplete()) {
        return { success: true, alreadyMigrated: true };
      }
      
      // 2. Create backup
      await this.createBackup();
      
      // 3. Initialize SQLite
      await this.initializeSQLite();
      
      // 4. Migrate data
      await this.migrateUsers();
      await this.migratePeriods();
      await this.migrateJournalEntries();
      await this.migrateGoals();
      await this.migrateHabits();
      
      // 5. Verify migration
      await this.verifyMigration();
      
      // 6. Mark as complete
      await this.markMigrationComplete();
      
      return { success: true, errors: this.errors };
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
  
  private async migrateJournalEntries(): Promise<void> {
    const entries = await indexedDB.getAllEntries();
    const total = entries.length;
    
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        
        // Decrypt from IndexedDB format
        const decrypted = await this.decryptEntry(entry);
        
        // Insert into SQLite (SQLCipher handles encryption)
        await sqliteDB.insertEntry(decrypted);
        
        this.progress = ((i + 1) / total) * 100;
        this.notifyProgress();
      } catch (error) {
        this.errors.push({
          type: 'journal_entry',
          id: entry.id,
          error: error.message
        });
      }
    }
  }
}
```

#### 3.2 Progressive Migration UI
```typescript
export default function MigrationProgress() {
  const [status, setStatus] = createSignal<MigrationStatus>('checking');
  const [progress, setProgress] = createSignal(0);
  const [error, setError] = createSignal<string | null>(null);
  
  onMount(async () => {
    const migrationService = new DatabaseMigrationService();
    
    migrationService.onProgress((progress) => {
      setProgress(progress);
    });
    
    try {
      setStatus('migrating');
      const result = await migrationService.migrate();
      
      if (result.success) {
        setStatus('complete');
      }
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  });
  
  return (
    <div class="migration-container">
      <Show when={status() === 'migrating'}>
        <h2>Upgrading Your Database</h2>
        <p>This one-time process will improve performance and enable new features.</p>
        <div class="progress-bar">
          <div 
            class="progress-fill" 
            style={{ width: `${progress()}%` }}
          />
        </div>
        <p>{progress().toFixed(0)}% Complete</p>
      </Show>
      
      <Show when={status() === 'complete'}>
        <h2>✅ Migration Complete!</h2>
        <p>Your data has been successfully upgraded.</p>
        <button onClick={() => window.location.reload()}>
          Continue to App
        </button>
      </Show>
      
      <Show when={status() === 'error'}>
        <h2>❌ Migration Failed</h2>
        <p>Error: {error()}</p>
        <p>Your data is safe. Please try again or contact support.</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </Show>
    </div>
  );
}
```

### Phase 4: Testing & Validation (Week 7-8)

#### 4.1 Migration Tests
```typescript
describe('Database Migration', () => {
  it('should migrate all user data correctly', async () => {
    // Setup IndexedDB with test data
    await setupTestData();
    
    // Run migration
    const result = await migrationService.migrate();
    
    // Verify all data migrated
    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(0);
    
    // Compare data
    const oldEntries = await indexedDB.getAllEntries();
    const newEntries = await sqliteDB.getAllEntries();
    
    expect(newEntries).toHaveLength(oldEntries.length);
    // ... more assertions
  });
  
  it('should handle migration failures gracefully', async () => {
    // Force a failure
    jest.spyOn(sqliteDB, 'insertEntry').mockRejectedValue(new Error('Test error'));
    
    // Run migration
    await expect(migrationService.migrate()).rejects.toThrow();
    
    // Verify rollback
    const dataIntact = await verifyDataIntegrity();
    expect(dataIntact).toBe(true);
  });
});
```

#### 4.2 Performance Benchmarks
```typescript
async function runPerformanceBenchmarks() {
  const results = {
    indexedDB: {},
    sqlite: {}
  };
  
  // Test 1: Insert 10,000 entries
  results.indexedDB.insert = await benchmarkIndexedDBInsert(10000);
  results.sqlite.insert = await benchmarkSQLiteInsert(10000);
  
  // Test 2: Complex queries
  results.indexedDB.query = await benchmarkIndexedDBQuery();
  results.sqlite.query = await benchmarkSQLiteQuery();
  
  // Test 3: Full-text search
  results.indexedDB.search = await benchmarkIndexedDBSearch();
  results.sqlite.search = await benchmarkSQLiteSearch();
  
  console.table(results);
}
```

### Phase 5: Rollout Strategy (Week 9-10)

#### 5.1 Gradual Rollout
1. **Alpha Testing**: Internal testing with test accounts
2. **Beta Testing**: 5% of users with rollback capability
3. **Staged Rollout**: 
   - Week 1: 25% of users
   - Week 2: 50% of users
   - Week 3: 100% of users

#### 5.2 Feature Flags
```typescript
const FEATURE_FLAGS = {
  USE_SQLITE: {
    enabled: false,
    percentage: 0, // 0-100
    userIds: [] // Specific users for testing
  }
};

async function shouldUseSQLite(userId: string): Promise<boolean> {
  // Check if SQLite is available
  if (!await checkSQLiteSupport()) {
    return false;
  }
  
  // Check feature flag
  const flag = FEATURE_FLAGS.USE_SQLITE;
  if (!flag.enabled) {
    return false;
  }
  
  // Check specific users
  if (flag.userIds.includes(userId)) {
    return true;
  }
  
  // Check percentage rollout
  const hash = hashUserId(userId);
  return (hash % 100) < flag.percentage;
}
```

### Phase 6: Post-Migration (Week 11-12)

#### 6.1 Cleanup
```typescript
class PostMigrationCleanup {
  async cleanup(): Promise<void> {
    // 1. Verify all users migrated successfully
    const unmigrated = await this.findUnmigratedUsers();
    if (unmigrated.length > 0) {
      await this.retryMigration(unmigrated);
    }
    
    // 2. Remove IndexedDB data (after backup period)
    if (await this.isBackupPeriodOver()) {
      await this.removeIndexedDBData();
    }
    
    // 3. Update app to use SQLite exclusively
    await this.updateAppConfiguration();
  }
}
```

#### 6.2 Monitoring
```typescript
class MigrationMonitoring {
  async monitor(): Promise<MigrationMetrics> {
    return {
      totalUsers: await this.getTotalUsers(),
      migratedUsers: await this.getMigratedUsers(),
      failedMigrations: await this.getFailedMigrations(),
      performanceMetrics: await this.getPerformanceMetrics(),
      errorRate: await this.getErrorRate()
    };
  }
}
```

## Risk Mitigation

### 1. Data Loss Prevention
- Automated backups before migration
- Verification step after each data type
- Rollback capability
- Export functionality as ultimate backup

### 2. Performance Issues
- Migration runs in background
- Progressive migration with resumability
- User notification of long-running migrations

### 3. Compatibility Issues
- Fallback to IndexedDB if SQLite unavailable
- Hybrid mode during transition
- Feature detection before migration

### 4. User Experience
- Clear communication about migration benefits
- Progress indicators
- Minimal disruption to app usage
- Option to defer migration

## Success Criteria

1. **Zero Data Loss**: 100% of user data successfully migrated
2. **Performance Improvement**: 50%+ improvement in query performance
3. **User Satisfaction**: <1% user complaints about migration
4. **Reliability**: 99.9%+ migration success rate
5. **Rollback Success**: 100% successful rollbacks when needed

## Timeline

- **Weeks 1-2**: Preparation and dual database support
- **Weeks 3-4**: SQLite implementation
- **Weeks 5-6**: Migration service development
- **Weeks 7-8**: Testing and validation
- **Weeks 9-10**: Gradual rollout
- **Weeks 11-12**: Cleanup and monitoring

Total estimated time: 12 weeks

## Conclusion

This migration plan provides a comprehensive approach to transitioning from IndexedDB to SQLite while maintaining data integrity, security, and user experience. The phased approach with extensive testing and rollback capabilities ensures minimal risk to users' valuable data.