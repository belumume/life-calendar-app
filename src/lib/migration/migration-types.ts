export interface MigrationStatus {
  isRequired: boolean;
  isInProgress: boolean;
  isComplete: boolean;
  progress: number;
  currentStep: string;
  totalSteps: number;
  errors: MigrationError[];
}

export interface MigrationError {
  type: 'user' | 'journal_entry' | 'goal' | 'habit' | 'period';
  id: string;
  error: string;
  timestamp: string;
}

export interface MigrationResult {
  success: boolean;
  alreadyMigrated?: boolean;
  errors: MigrationError[];
  migratedCount: {
    users: number;
    entries: number;
    goals: number;
    habits: number;
    periods: number;
  };
  duration: number;
}

export interface MigrationBackup {
  version: string;
  timestamp: string;
  data: {
    users: any[];
    entries: any[];
    goals: any[];
    habits: any[];
    periods: any[];
  };
}

export interface DatabaseAdapter {
  init(): Promise<void>;
  close(): Promise<void>;
  
  // User operations
  getUser(id: string): Promise<any>;
  saveUser(user: any): Promise<void>;
  
  // Journal operations
  getEntries(userId: string): Promise<any[]>;
  saveEntry(entry: any): Promise<void>;
  
  // Goal operations
  getGoals(userId: string): Promise<any[]>;
  saveGoal(goal: any): Promise<void>;
  
  // Habit operations
  getHabits(userId: string): Promise<any[]>;
  saveHabit(habit: any): Promise<void>;
  
  // Period operations
  getPeriods(userId: string): Promise<any[]>;
  savePeriod(period: any): Promise<void>;
  
  // Migration specific
  getAllData(): Promise<MigrationBackup['data']>;
}