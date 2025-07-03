import { AppDatabase } from '../database';
import { getCryptoService } from '../../encryption/crypto';

export interface Repository<T> {
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
}

export abstract class BaseRepository<T extends { id: string }> implements Repository<T> {
  protected db: AppDatabase;
  protected tableName: string;

  constructor(db: AppDatabase, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  /**
   * Generate a UUID v4
   */
  protected generateId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get current timestamp in ISO format
   */
  protected getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Encrypt sensitive data if crypto service is available
   */
  protected async encryptData(data: any): Promise<{ encrypted: string; iv: string }> {
    const crypto = getCryptoService();
    if (!crypto.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    
    const jsonData = JSON.stringify(data);
    return crypto.encrypt(jsonData);
  }

  /**
   * Decrypt sensitive data
   */
  protected async decryptData(encrypted: string, iv: string): Promise<any> {
    const crypto = getCryptoService();
    if (!crypto.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    
    const decrypted = await crypto.decrypt(encrypted, iv);
    return JSON.parse(decrypted);
  }

  /**
   * Abstract methods to be implemented by specific repositories
   */
  abstract create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<T>;
  abstract findById(id: string): Promise<T | null>;
  abstract findAll(): Promise<T[]>;
  abstract update(id: string, data: Partial<T>): Promise<T | null>;
  abstract delete(id: string): Promise<boolean>;
}