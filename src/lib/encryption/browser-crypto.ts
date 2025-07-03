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
      // Handle base64 salt more safely
      try {
        const binaryString = atob(existingSalt);
        this.salt = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          this.salt[i] = binaryString.charCodeAt(i);
        }
      } catch (e) {
        // If not valid base64, treat as raw string
        this.salt = new TextEncoder().encode(existingSalt);
      }
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
    // Convert to array for safer base64 encoding
    const saltArray = Array.from(this.salt);
    return btoa(saltArray.map(b => String.fromCharCode(b)).join(''));
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

    // Convert to array for safer base64 encoding
    const encryptedArray = Array.from(new Uint8Array(encrypted));
    const ivArray = Array.from(iv);
    
    return {
      encrypted: btoa(encryptedArray.map(b => String.fromCharCode(b)).join('')),
      iv: btoa(ivArray.map(b => String.fromCharCode(b)).join(''))
    };
  }

  async decrypt(data: EncryptedData): Promise<string> {
    if (!this.key) {
      throw new Error('Encryption service not initialized');
    }

    const decoder = new TextDecoder();
    
    // Safer base64 decoding
    const encryptedBinary = atob(data.encrypted);
    const encrypted = new Uint8Array(encryptedBinary.length);
    for (let i = 0; i < encryptedBinary.length; i++) {
      encrypted[i] = encryptedBinary.charCodeAt(i);
    }
    
    const ivBinary = atob(data.iv);
    const iv = new Uint8Array(ivBinary.length);
    for (let i = 0; i < ivBinary.length; i++) {
      iv[i] = ivBinary.charCodeAt(i);
    }

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