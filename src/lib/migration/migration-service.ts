import type { 
  MigrationStatus, 
  MigrationResult, 
  MigrationError, 
  MigrationBackup,
  DatabaseAdapter 
} from './migration-types';
import { browserDB } from '../db/browser-db';
import { encryptionService } from '../encryption/browser-crypto';

export class DatabaseMigrationService {
  private status: MigrationStatus = {
    isRequired: false,
    isInProgress: false,
    isComplete: false,
    progress: 0,
    currentStep: '',
    totalSteps: 5,
    errors: []
  };
  
  private progressListeners: Set<(status: MigrationStatus) => void> = new Set();
  private startTime: number = 0;
  
  async checkMigrationStatus(): Promise<MigrationStatus> {
    try {
      // Check if SQLite is available
      const sqliteAvailable = await this.checkSQLiteSupport();
      if (!sqliteAvailable) {
        this.status.isRequired = false;
        return this.status;
      }
      
      // Check if migration is already complete
      const migrationFlag = localStorage.getItem('mylife-calendar-migration-complete');
      if (migrationFlag === 'true') {
        this.status.isComplete = true;
        this.status.isRequired = false;
        return this.status;
      }
      
      // Check if there's data to migrate
      const hasData = await this.hasDataToMigrate();
      this.status.isRequired = hasData;
      
      return this.status;
    } catch (error) {
      console.error('Failed to check migration status:', error);
      this.status.isRequired = false;
      return this.status;
    }
  }
  
  private async checkSQLiteSupport(): Promise<boolean> {
    // In a real implementation, this would try to load the SQLite module
    // For now, we'll return false as SQLite isn't available in the browser
    return false;
  }
  
  private async hasDataToMigrate(): Promise<boolean> {
    const user = await browserDB.getUser();
    return user !== null;
  }
  
  async performMigration(): Promise<MigrationResult> {
    if (this.status.isInProgress) {
      throw new Error('Migration already in progress');
    }
    
    this.startTime = Date.now();
    this.status.isInProgress = true;
    this.status.errors = [];
    this.updateProgress(0, 'Starting migration...');
    
    const result: MigrationResult = {
      success: false,
      errors: [],
      migratedCount: {
        users: 0,
        entries: 0,
        goals: 0,
        habits: 0,
        periods: 0
      },
      duration: 0
    };
    
    try {
      // Step 1: Create backup
      this.updateProgress(10, 'Creating backup...');
      const backup = await this.createBackup();
      
      // Step 2: Initialize SQLite (would be real in production)
      this.updateProgress(20, 'Initializing new database...');
      // await this.initializeSQLite();
      
      // Step 3: Migrate users
      this.updateProgress(30, 'Migrating user data...');
      result.migratedCount.users = await this.migrateUsers(backup.data.users);
      
      // Step 4: Migrate journal entries
      this.updateProgress(50, 'Migrating journal entries...');
      result.migratedCount.entries = await this.migrateEntries(backup.data.entries);
      
      // Step 5: Migrate goals
      this.updateProgress(70, 'Migrating goals...');
      result.migratedCount.goals = await this.migrateGoals(backup.data.goals);
      
      // Step 6: Migrate habits
      this.updateProgress(80, 'Migrating habits...');
      result.migratedCount.habits = await this.migrateHabits(backup.data.habits);
      
      // Step 7: Migrate periods
      this.updateProgress(90, 'Migrating periods...');
      result.migratedCount.periods = await this.migratePeriods(backup.data.periods);
      
      // Step 8: Verify migration
      this.updateProgress(95, 'Verifying migration...');
      await this.verifyMigration(backup, result);
      
      // Step 9: Mark as complete
      this.updateProgress(100, 'Migration complete!');
      localStorage.setItem('mylife-calendar-migration-complete', 'true');
      localStorage.setItem('mylife-calendar-migration-backup', JSON.stringify(backup));
      
      result.success = true;
      result.duration = Date.now() - this.startTime;
      this.status.isComplete = true;
      this.status.isInProgress = false;
      
      return result;
    } catch (error) {
      console.error('Migration failed:', error);
      this.status.errors.push({
        type: 'journal_entry',
        id: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      // Rollback would happen here
      await this.rollback();
      
      result.errors = this.status.errors;
      result.duration = Date.now() - this.startTime;
      this.status.isInProgress = false;
      
      throw error;
    }
  }
  
  private async createBackup(): Promise<MigrationBackup> {
    const user = await browserDB.getUser();
    if (!user) throw new Error('No user found');
    
    const entries = await browserDB.getEntries(user.id);
    const goals = await browserDB.getGoals(user.id);
    const habits = await browserDB.getHabitsByUserId(user.id);
    const activePeriod = await browserDB.getActivePeriod(user.id);
    
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      data: {
        users: [user],
        entries,
        goals,
        habits,
        periods: activePeriod ? [activePeriod] : []
      }
    };
  }
  
  private async migrateUsers(users: any[]): Promise<number> {
    // In a real implementation, this would migrate to SQLite
    // For now, we'll simulate the process
    for (const user of users) {
      // Decrypt sensitive fields if needed
      // Insert into SQLite
      await this.simulateDelay(100);
    }
    return users.length;
  }
  
  private async migrateEntries(entries: any[]): Promise<number> {
    let migrated = 0;
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        // In real implementation, decrypt and re-encrypt for SQLCipher
        await this.simulateDelay(50);
        migrated++;
        
        // Update progress within this step
        const stepProgress = (i / entries.length) * 20; // 20% of total progress
        this.updateProgress(50 + stepProgress, `Migrating journal entries... (${i + 1}/${entries.length})`);
      } catch (error) {
        this.status.errors.push({
          type: 'journal_entry',
          id: entries[i].id,
          error: error instanceof Error ? error.message : 'Migration failed',
          timestamp: new Date().toISOString()
        });
      }
    }
    return migrated;
  }
  
  private async migrateGoals(goals: any[]): Promise<number> {
    for (const goal of goals) {
      await this.simulateDelay(30);
    }
    return goals.length;
  }
  
  private async migrateHabits(habits: any[]): Promise<number> {
    for (const habit of habits) {
      await this.simulateDelay(30);
    }
    return habits.length;
  }
  
  private async migratePeriods(periods: any[]): Promise<number> {
    for (const period of periods) {
      await this.simulateDelay(30);
    }
    return periods.length;
  }
  
  private async verifyMigration(backup: MigrationBackup, result: MigrationResult): Promise<void> {
    // Verify counts match
    if (backup.data.users.length !== result.migratedCount.users) {
      throw new Error('User count mismatch');
    }
    if (backup.data.entries.length !== result.migratedCount.entries) {
      throw new Error('Entry count mismatch');
    }
    // ... more verifications
  }
  
  private async rollback(): Promise<void> {
    // In a real implementation, this would restore from backup
    console.log('Rolling back migration...');
    localStorage.removeItem('mylife-calendar-migration-complete');
  }
  
  private updateProgress(progress: number, currentStep: string): void {
    this.status.progress = progress;
    this.status.currentStep = currentStep;
    this.notifyListeners();
  }
  
  private notifyListeners(): void {
    this.progressListeners.forEach(listener => listener({ ...this.status }));
  }
  
  onProgress(listener: (status: MigrationStatus) => void): () => void {
    this.progressListeners.add(listener);
    return () => this.progressListeners.delete(listener);
  }
  
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Recovery methods
  async exportBackupFile(): Promise<void> {
    const backup = await this.createBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mylife-calendar-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  async getStoredBackup(): Promise<MigrationBackup | null> {
    const backupStr = localStorage.getItem('mylife-calendar-migration-backup');
    if (!backupStr) return null;
    
    try {
      return JSON.parse(backupStr);
    } catch {
      return null;
    }
  }
}

export const migrationService = new DatabaseMigrationService();