import { describe, it, expect } from 'vitest';
import { uint8ArrayToBase64, base64ToUint8Array, generateSalt, isValidBase64 } from '../base64-utils';

describe('Base64 Utilities', () => {
  describe('uint8ArrayToBase64', () => {
    it('should encode small arrays correctly', () => {
      const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const base64 = uint8ArrayToBase64(bytes);
      expect(base64).toBe('SGVsbG8=');
    });

    it('should encode large arrays without stack overflow', () => {
      // Create a large array (100KB)
      const largeArray = new Uint8Array(100000);
      for (let i = 0; i < largeArray.length; i++) {
        largeArray[i] = i % 256;
      }
      
      // This should not throw a stack overflow error
      const base64 = uint8ArrayToBase64(largeArray);
      expect(base64).toBeTruthy();
      expect(base64.length).toBeGreaterThan(0);
    });

    it('should handle empty arrays', () => {
      const empty = new Uint8Array(0);
      const base64 = uint8ArrayToBase64(empty);
      expect(base64).toBe('');
    });

    it('should handle binary data correctly', () => {
      const bytes = new Uint8Array([0, 255, 128, 64, 32, 16, 8, 4, 2, 1]);
      const base64 = uint8ArrayToBase64(bytes);
      const decoded = base64ToUint8Array(base64);
      expect(Array.from(decoded)).toEqual(Array.from(bytes));
    });
  });

  describe('base64ToUint8Array', () => {
    it('should decode base64 correctly', () => {
      const base64 = 'SGVsbG8=';
      const bytes = base64ToUint8Array(base64);
      expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111]);
    });

    it('should handle empty strings', () => {
      const bytes = base64ToUint8Array('');
      expect(bytes.length).toBe(0);
    });

    it('should round-trip correctly', () => {
      const original = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        original[i] = i;
      }
      
      const base64 = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(base64);
      
      expect(Array.from(decoded)).toEqual(Array.from(original));
    });
  });

  describe('generateSalt', () => {
    it('should generate salt of default size', () => {
      const salt = generateSalt();
      expect(salt.length).toBe(32);
    });

    it('should generate salt of specified size', () => {
      const salt = generateSalt(16);
      expect(salt.length).toBe(16);
    });

    it('should generate different salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(Array.from(salt1)).not.toEqual(Array.from(salt2));
    });

    it('should generate cryptographically random values', () => {
      const salt = generateSalt(1000);
      // Check that not all bytes are the same (would indicate non-random)
      const uniqueValues = new Set(salt);
      expect(uniqueValues.size).toBeGreaterThan(100);
    });
  });

  describe('isValidBase64', () => {
    it('should validate correct base64 strings', () => {
      expect(isValidBase64('SGVsbG8=')).toBe(true);
      expect(isValidBase64('aGVsbG8gd29ybGQ=')).toBe(true);
      expect(isValidBase64('')).toBe(true);
    });

    it('should reject invalid base64 strings', () => {
      expect(isValidBase64('Hello')).toBe(false);
      expect(isValidBase64('SGVsbG8')).toBe(false); // Missing padding
      expect(isValidBase64('!@#$%')).toBe(false);
      expect(isValidBase64('SGVs bG8=')).toBe(false); // Space in middle
    });

    it('should handle special characters correctly', () => {
      const bytes = new Uint8Array([252, 253, 254, 255]);
      const base64 = uint8ArrayToBase64(bytes);
      expect(isValidBase64(base64)).toBe(true);
    });
  });
});