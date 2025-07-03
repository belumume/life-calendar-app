import { describe, it, expect, beforeEach } from 'vitest';
import { encryptionService } from '../browser-crypto';

describe('BrowserCryptoService', () => {
  beforeEach(() => {
    // Clear any existing state
    encryptionService.clear();
  });

  describe('initialize', () => {
    it('should initialize with a passphrase and generate a salt', async () => {
      const passphrase = 'test-passphrase-123';
      const salt = await encryptionService.initialize(passphrase);
      
      expect(salt).toBeTruthy();
      expect(salt.length).toBeGreaterThan(0);
      expect(encryptionService.isInitialized()).toBe(true);
    });

    it('should initialize with a passphrase and existing salt', async () => {
      const passphrase = 'test-passphrase-123';
      const existingSalt = 'existing-salt-value';
      
      const salt = await encryptionService.initialize(passphrase, existingSalt);
      
      // Salt is returned as base64
      expect(salt).toBeTruthy();
      expect(salt).not.toBe(existingSalt); // It will be base64 encoded
      expect(encryptionService.isInitialized()).toBe(true);
    });

    it('should generate different salts for different initializations', async () => {
      const passphrase = 'test-passphrase-123';
      
      const salt1 = await encryptionService.initialize(passphrase);
      encryptionService.clear();
      const salt2 = await encryptionService.initialize(passphrase);
      
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('encrypt/decrypt', () => {
    const passphrase = 'test-passphrase-123';
    const testData = 'This is sensitive data that needs encryption';

    beforeEach(async () => {
      await encryptionService.initialize(passphrase);
    });

    it('should encrypt and decrypt data successfully', async () => {
      const encrypted = await encryptionService.encrypt(testData);
      
      expect(encrypted.encrypted).toBeTruthy();
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.encrypted).not.toBe(testData);
      
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const encrypted1 = await encryptionService.encrypt(testData);
      const encrypted2 = await encryptionService.encrypt(testData);
      
      expect(encrypted1.encrypted).not.toBe(encrypted2.encrypted);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // Both should decrypt to same value
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });

    it('should handle empty strings', async () => {
      const encrypted = await encryptionService.encrypt('');
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe('');
    });

    it('should handle special characters and unicode', async () => {
      const specialData = '🎉 Special chars: !@#$%^&*() 中文 العربية';
      
      const encrypted = await encryptionService.encrypt(specialData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(specialData);
    });

    it('should handle very long strings', async () => {
      const longData = 'x'.repeat(10000);
      
      const encrypted = await encryptionService.encrypt(longData);
      const decrypted = await encryptionService.decrypt(encrypted);
      
      expect(decrypted).toBe(longData);
    });

    it('should throw error when not initialized', async () => {
      encryptionService.clear();
      
      await expect(encryptionService.encrypt(testData)).rejects.toThrow(
        'Encryption service not initialized'
      );
      
      await expect(
        encryptionService.decrypt({ encrypted: 'test', iv: 'test' })
      ).rejects.toThrow('Encryption service not initialized');
    });
  });

  describe('security', () => {
    it('should not decrypt with wrong passphrase', async () => {
      const rightPassphrase = 'correct-passphrase';
      const wrongPassphrase = 'wrong-passphrase';
      const testData = 'Secret information';
      
      // Encrypt with right passphrase
      await encryptionService.initialize(rightPassphrase);
      const encrypted = await encryptionService.encrypt(testData);
      
      // Try to decrypt with wrong passphrase
      encryptionService.clear();
      await encryptionService.initialize(wrongPassphrase);
      
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should not decrypt with tampered ciphertext', async () => {
      const passphrase = 'test-passphrase';
      const testData = 'Original data';
      
      await encryptionService.initialize(passphrase);
      const encrypted = await encryptionService.encrypt(testData);
      
      // Tamper with the encrypted data
      const tamperedEncrypted = {
        ...encrypted,
        encrypted: encrypted.encrypted.slice(0, -2) + 'XX'
      };
      
      await expect(encryptionService.decrypt(tamperedEncrypted)).rejects.toThrow();
    });

    it('should not decrypt with wrong IV', async () => {
      const passphrase = 'test-passphrase';
      const testData = 'Original data';
      
      await encryptionService.initialize(passphrase);
      const encrypted = await encryptionService.encrypt(testData);
      
      // Use wrong IV
      const wrongIV = {
        ...encrypted,
        iv: 'wrong-iv-value'
      };
      
      await expect(encryptionService.decrypt(wrongIV)).rejects.toThrow();
    });

    it('should maintain security with same passphrase but different salts', async () => {
      const passphrase = 'shared-passphrase';
      const testData = 'Sensitive data';
      
      // User 1 with salt 1
      const salt1 = await encryptionService.initialize(passphrase);
      const encrypted1 = await encryptionService.encrypt(testData);
      
      // User 2 with salt 2 (different salt, same passphrase)
      encryptionService.clear();
      const salt2 = await encryptionService.initialize(passphrase);
      
      // User 2 should not be able to decrypt User 1's data
      await expect(encryptionService.decrypt(encrypted1)).rejects.toThrow();
    });
  });

  describe('clear', () => {
    it('should clear the encryption key and state', async () => {
      await encryptionService.initialize('test-passphrase');
      expect(encryptionService.isInitialized()).toBe(true);
      
      encryptionService.clear();
      expect(encryptionService.isInitialized()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle invalid base64 in decrypt', async () => {
      await encryptionService.initialize('test-passphrase');
      
      const invalidData = {
        encrypted: 'not-valid-base64!@#$',
        iv: 'also-invalid!@#$'
      };
      
      await expect(encryptionService.decrypt(invalidData)).rejects.toThrow();
    });

    it('should handle missing encrypted data', async () => {
      await encryptionService.initialize('test-passphrase');
      
      await expect(
        encryptionService.decrypt({ encrypted: '', iv: 'someiv' })
      ).rejects.toThrow();
    });

    it('should handle missing IV', async () => {
      await encryptionService.initialize('test-passphrase');
      
      await expect(
        encryptionService.decrypt({ encrypted: 'somedata', iv: '' })
      ).rejects.toThrow();
    });
  });
});