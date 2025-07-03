export interface EncryptedData {
  encrypted: string;
  iv: string;
}

class BrowserEncryptionService {
  private key: CryptoKey | null = null;
  private salt: Uint8Array | null = null;

  async initialize(passphrase: string, existingSalt?: string): Promise<string> {
    // Use existing salt or generate new one
    if (existingSalt) {
      this.salt = Uint8Array.from(atob(existingSalt), c => c.charCodeAt(0));
    } else {
      this.salt = crypto.getRandomValues(new Uint8Array(16));
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
    
    // Return salt as base64 for storage
    return btoa(String.fromCharCode(...this.salt));
  }

  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.key) {
      throw new Error('Encryption not initialized');
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

    return {
      encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
      iv: btoa(String.fromCharCode(...iv))
    };
  }

  async decrypt(data: EncryptedData): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption not initialized');
    }

    const decoder = new TextDecoder();
    const encrypted = Uint8Array.from(atob(data.encrypted), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(data.iv), c => c.charCodeAt(0));

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