import { encryptionService } from '../../encryption/browser-crypto';
import type { EncryptedData } from '../../encryption/browser-crypto';

/**
 * Base interface for encrypted entities
 */
export interface EncryptedEntity {
  id: string;
  userId: string;
  periodId?: string;
  encryptedData: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Generic options for encryption operations
 */
export interface EncryptionOptions {
  excludeFields?: string[];
  includeTimestamps?: boolean;
}

/**
 * Base class for services that handle encrypted data
 * Reduces duplication of encryption/decryption logic
 */
export abstract class EncryptedService<T, E extends EncryptedEntity> {
  protected serviceName: string;
  
  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }
  
  /**
   * Encrypt entity data
   * @param data The data to encrypt
   * @param options Optional encryption options
   * @returns Encrypted data with IV
   */
  protected async encryptData(
    data: Partial<T>, 
    options?: EncryptionOptions
  ): Promise<EncryptedData> {
    try {
      // Remove fields that shouldn't be encrypted
      const dataToEncrypt = { ...data };
      if (options?.excludeFields) {
        options.excludeFields.forEach(field => {
          delete (dataToEncrypt as any)[field];
        });
      }
      
      // Add timestamps if requested
      if (options?.includeTimestamps) {
        (dataToEncrypt as any).encryptedAt = new Date().toISOString();
      }
      
      const jsonString = JSON.stringify(dataToEncrypt);
      return await encryptionService.encrypt(jsonString);
    } catch (error) {
      console.error(`[${this.serviceName}] Encryption failed:`, error);
      throw new Error(`Failed to encrypt ${this.serviceName} data`);
    }
  }
  
  /**
   * Decrypt entity data
   * @param encryptedEntity The encrypted entity
   * @returns Decrypted data
   */
  protected async decryptData(encryptedEntity: E): Promise<T> {
    try {
      const decrypted = await encryptionService.decrypt({
        encrypted: encryptedEntity.encryptedData,
        iv: encryptedEntity.iv,
      });
      return JSON.parse(decrypted);
    } catch (error) {
      console.error(`[${this.serviceName}] Decryption failed:`, error);
      throw new Error(`Failed to decrypt ${this.serviceName} data`);
    }
  }
  
  /**
   * Transform encrypted entity to decrypted format
   * Combines entity metadata with decrypted data
   */
  protected async transformEncryptedToDecrypted(
    encryptedEntity: E,
    additionalData?: Partial<T>
  ): Promise<T & { id: string }> {
    const decryptedData = await this.decryptData(encryptedEntity);
    
    return {
      id: encryptedEntity.id,
      ...decryptedData,
      ...additionalData,
    } as T & { id: string };
  }
  
  /**
   * Batch decrypt multiple entities
   * @param encryptedEntities Array of encrypted entities
   * @returns Array of decrypted entities
   */
  protected async batchDecrypt(
    encryptedEntities: E[]
  ): Promise<(T & { id: string })[]> {
    const decryptionPromises = encryptedEntities.map(entity =>
      this.transformEncryptedToDecrypted(entity).catch(error => {
        console.error(`[${this.serviceName}] Failed to decrypt entity ${entity.id}:`, error);
        return null;
      })
    );
    
    const results = await Promise.all(decryptionPromises);
    // Filter out failed decryptions
    return results.filter((result): result is T & { id: string } => result !== null);
  }
  
  /**
   * Create encrypted entity from data
   */
  protected async createEncryptedEntity(
    data: Partial<T>,
    metadata: {
      userId: string;
      periodId?: string;
      id?: string;
    },
    options?: EncryptionOptions
  ): Promise<Omit<E, 'createdAt' | 'updatedAt'>> {
    const encrypted = await this.encryptData(data, options);
    
    return {
      id: metadata.id || crypto.randomUUID(),
      userId: metadata.userId,
      periodId: metadata.periodId,
      encryptedData: encrypted.encrypted,
      iv: encrypted.iv,
    } as Omit<E, 'createdAt' | 'updatedAt'>;
  }
  
  /**
   * Update encrypted entity with new data
   */
  protected async updateEncryptedEntity(
    existingEntity: E,
    updates: Partial<T>,
    options?: EncryptionOptions
  ): Promise<Partial<E>> {
    // Decrypt existing data
    const currentData = await this.decryptData(existingEntity);
    
    // Merge updates
    const updatedData = { ...currentData, ...updates };
    
    // Re-encrypt
    const encrypted = await this.encryptData(updatedData, options);
    
    return {
      encryptedData: encrypted.encrypted,
      iv: encrypted.iv,
      updatedAt: new Date().toISOString(),
    } as Partial<E>;
  }
  
  /**
   * Safe decrypt with fallback
   * Returns null instead of throwing if decryption fails
   */
  protected async safeDecrypt(encryptedEntity: E): Promise<T | null> {
    try {
      return await this.decryptData(encryptedEntity);
    } catch (error) {
      console.warn(`[${this.serviceName}] Safe decrypt failed for entity ${encryptedEntity.id}`);
      return null;
    }
  }
  
  /**
   * Check if encryption service is initialized
   */
  protected requireEncryption(): void {
    if (!encryptionService.isInitialized()) {
      throw new Error(`${this.serviceName}: Encryption service not initialized`);
    }
  }
}

/**
 * Type guard to check if an object is an encrypted entity
 */
export function isEncryptedEntity(obj: any): obj is EncryptedEntity {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.userId === 'string' &&
    typeof obj.encryptedData === 'string' &&
    typeof obj.iv === 'string'
  );
}