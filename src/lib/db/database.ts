import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __dirname = dirname(fileURLToPath(import.meta.url));

export class AppDatabase {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor(dbPath: string = ':memory:') {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the database connection and create schema
   */
  async initialize(): Promise<void> {
    try {
      // Create database connection
      this.db = new Database(this.dbPath);
      
      // Enable foreign key constraints
      this.db.pragma('foreign_keys = ON');
      
      // Optimize for performance
      this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
      this.db.pragma('synchronous = NORMAL'); // Balance between safety and performance
      
      // Create schema
      await this.createSchema();
      
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw new Error('Database initialization failed');
    }
  }

  /**
   * Create database schema from SQL file
   */
  private async createSchema(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    try {
      // Read schema file
      const schemaPath = join(__dirname, 'schema.sql');
      const schema = readFileSync(schemaPath, 'utf-8');
      
      // Execute schema
      this.db.exec(schema);
    } catch (error) {
      console.error('Failed to create schema:', error);
      throw error;
    }
  }

  /**
   * Get database instance
   */
  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Execute a transaction
   */
  transaction<T>(fn: (db: Database.Database) => T): T {
    const db = this.getDatabase();
    return db.transaction(fn)(db);
  }

  /**
   * Prepare a statement for repeated execution
   */
  prepare(sql: string): Database.Statement {
    return this.getDatabase().prepare(sql);
  }

  /**
   * Run a single query
   */
  run(sql: string, params?: any): Database.RunResult {
    return this.getDatabase().prepare(sql).run(params || {});
  }

  /**
   * Get a single row
   */
  get<T = any>(sql: string, params?: any): T | undefined {
    return this.getDatabase().prepare(sql).get(params || {}) as T | undefined;
  }

  /**
   * Get all rows
   */
  all<T = any>(sql: string, params?: any): T[] {
    return this.getDatabase().prepare(sql).all(params || {}) as T[];
  }

  /**
   * Check if database is initialized
   */
  isInitialized(): boolean {
    return this.db !== null;
  }

  /**
   * Get database file path
   */
  getPath(): string {
    return this.dbPath;
  }
}

// Singleton instance for the app
let dbInstance: AppDatabase | null = null;

/**
 * Get or create database instance
 */
export function getDatabase(): AppDatabase {
  if (!dbInstance) {
    // In production, use a file in the user's data directory
    // For now, we'll use a local file
    const dbPath = process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : 'life-calendar.db';
    
    dbInstance = new AppDatabase(dbPath);
  }
  return dbInstance;
}

/**
 * Initialize the database
 */
export async function initializeDatabase(): Promise<AppDatabase> {
  const db = getDatabase();
  if (!db.isInitialized()) {
    await db.initialize();
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}