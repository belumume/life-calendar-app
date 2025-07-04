/**
 * Safe base64 encoding/decoding utilities for binary data
 */

/**
 * Safely encode a Uint8Array to base64 string
 * Handles large arrays without stack overflow issues
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  // For small arrays, use the faster method
  if (bytes.length < 1024) {
    return btoa(String.fromCharCode(...bytes));
  }
  
  // For larger arrays, process in chunks to avoid stack overflow
  const CHUNK_SIZE = 0x8000; // 32KB chunks
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    binary += String.fromCharCode(...chunk);
  }
  
  return btoa(binary);
}

/**
 * Safely decode a base64 string to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}

/**
 * Generate a cryptographically secure random salt
 * @param size The size of the salt in bytes (default: 32)
 */
export function generateSalt(size: number = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(size));
}

/**
 * Validate if a string is valid base64
 */
export function isValidBase64(str: string): boolean {
  try {
    return btoa(atob(str)) === str;
  } catch {
    return false;
  }
}