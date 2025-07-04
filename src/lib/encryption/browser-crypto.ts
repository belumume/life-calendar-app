import { uint8ArrayToBase64, base64ToUint8Array, generateSalt, isValidBase64 } from './base64-utils';

export interface EncryptedData {
  encrypted: string;
  iv: string;
}

class BrowserEncryptionService {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;
  private static readonly SALT_SIZE = 32; // Standardize on 32 bytes

  async initialize(passphrase: string, existingSalt?: string): Promise<string> {
    // Use existing salt or generate new one
    if (existingSalt) {
      // Safely decode base64 salt
      if (isValidBase64(existingSalt)) {
        this.salt = base64ToUint8Array(existingSalt);
      } else {
        // Legacy support: if not valid base64, might be from old encoding
        // Try to handle it gracefully
        console.warn('Invalid base64 salt detected, attempting recovery');
        this.salt = new TextEncoder().encode(existingSalt);
      }
    } else {
      this.salt = generateSalt(BrowserEncryptionService.SALT_SIZE);
    }
    
    // Derive key from passphrase
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    this.key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    
    // Return salt as base64 for storage using safe encoding
    return uint8ArrayToBase64(this.salt);
  }

  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.key) {
      throw new Error('Encryption service not initialized');
    }

    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      this.key,
      encoder.encode(data)
    );

    // Use safe base64 encoding
    return {
      encrypted: uint8ArrayToBase64(new Uint8Array(encrypted)),
      iv: uint8ArrayToBase64(iv)
    };
  }

  async decrypt(data: EncryptedData): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption service not initialized');
    }

    const decoder = new TextDecoder();
    
    // Use safe base64 decoding
    const encrypted = base64ToUint8Array(data.encrypted);
    const iv = base64ToUint8Array(data.iv);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      this.key,
      encrypted
    );

    return decoder.decode(decrypted);
  }

  clear(): void {
    this.key = null;
    this.salt = null;
  }

  isInitialized(): boolean {
    return this.key !== null;
  }
}

export const encryptionService = new BrowserEncryptionService();