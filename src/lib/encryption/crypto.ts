/**
 * Encryption module using Web Crypto API
 * Provides secure encryption/decryption for user data
 */

// Constants for encryption
const PBKDF2_ITERATIONS = 100000;
const SALT_LENGTH = 32;
const IV_LENGTH = 12;
const KEY_LENGTH = 256;
const TAG_LENGTH = 128;

export class CryptoService {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  /**
   * Initialize encryption with user's passphrase
   */
  async initialize(passphrase: string, salt?: Uint8Array): Promise<void> {
    // Generate or use provided salt
    this.salt = salt || crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    
    // Derive key from passphrase
    this.key = await this.deriveKey(passphrase, this.salt);
  }

  /**
   * Derive encryption key from passphrase using PBKDF2
   */
  private async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    // Convert passphrase to key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive key using PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data
   */
  async encrypt(data: string): Promise<{ encrypted: string; iv: string }> {
    if (!this.key) {
      throw new Error('Crypto service not initialized');
    }

    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    // Encode data
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: TAG_LENGTH
      },
      this.key,
      encodedData
    );

    // Convert to base64 for storage
    return {
      encrypted: this.arrayBufferToBase64(encrypted),
      iv: this.arrayBufferToBase64(iv)
    };
  }

  /**
   * Decrypt data
   */
  async decrypt(encryptedData: string, iv: string): Promise<string> {
    if (!this.key) {
      throw new Error('Crypto service not initialized');
    }

    // Convert from base64
    const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
    const ivBuffer = this.base64ToArrayBuffer(iv);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivBuffer,
        tagLength: TAG_LENGTH
      },
      this.key,
      encryptedBuffer
    );

    // Decode
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Get the salt for storage
   */
  getSalt(): string | null {
    if (!this.salt) return null;
    return this.arrayBufferToBase64(this.salt);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.key !== null;
  }

  /**
   * Clear key from memory
   */
  clear(): void {
    this.key = null;
    this.salt = null;
  }

  /**
   * Hash a passphrase (for verification without storing the passphrase)
   */
  async hashPassphrase(passphrase: string, salt: Uint8Array): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(passphrase);
    
    // Import as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      data,
      'PBKDF2',
      false,
      ['deriveBits']
    );

    // Derive bits
    const hashBuffer = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: PBKDF2_ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Verify a passphrase against a hash
   */
  async verifyPassphrase(passphrase: string, hash: string, salt: string): Promise<boolean> {
    const saltBuffer = this.base64ToArrayBuffer(salt);
    const computedHash = await this.hashPassphrase(passphrase, new Uint8Array(saltBuffer));
    return computedHash === hash;
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  /**
   * Convert base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Generate a random encryption key (for data that doesn't need passphrase)
   */
  static async generateRandomKey(): Promise<CryptoKey> {
    return crypto.subtle.generateKey(
      {
        name: 'AES-GCM',
        length: KEY_LENGTH
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Export a key to base64
   */
  static async exportKey(key: CryptoKey): Promise<string> {
    const exported = await crypto.subtle.exportKey('raw', key);
    const bytes = new Uint8Array(exported);
    const binary = String.fromCharCode(...bytes);
    return btoa(binary);
  }

  /**
   * Import a key from base64
   */
  static async importKey(keyData: string): Promise<CryptoKey> {
    const binary = atob(keyData);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return crypto.subtle.importKey(
      'raw',
      bytes,
      'AES-GCM',
      true,
      ['encrypt', 'decrypt']
    );
  }
}

// Singleton instance
let cryptoInstance: CryptoService | null = null;

/**
 * Get or create crypto service instance
 */
export function getCryptoService(): CryptoService {
  if (!cryptoInstance) {
    cryptoInstance = new CryptoService();
  }
  return cryptoInstance;
}

/**
 * Initialize crypto service with passphrase
 */
export async function initializeCrypto(passphrase: string, salt?: string): Promise<CryptoService> {
  const crypto = getCryptoService();
  const saltBuffer = salt ? 
    new Uint8Array(atob(salt).split('').map(c => c.charCodeAt(0))) : 
    undefined;
  
  await crypto.initialize(passphrase, saltBuffer);
  return crypto;
}

/**
 * Clear crypto service
 */
export function clearCrypto(): void {
  if (cryptoInstance) {
    cryptoInstance.clear();
    cryptoInstance = null;
  }
}