/**
 * Constant-time string comparison to prevent timing attacks
 * @param a First string to compare
 * @param b Second string to compare
 * @returns true if strings are equal, false otherwise
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Add a random delay to authentication operations to mitigate timing attacks
 * @returns Promise that resolves after a random delay
 */
export async function addAuthenticationDelay(): Promise<void> {
  // Random delay between 100-300ms
  const delay = 100 + Math.random() * 200;
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Create a verification token from user data
 * This is used to verify the passphrase without exposing timing information
 * @param userId User ID
 * @param salt User's salt
 * @returns Verification token
 */
export async function createVerificationToken(userId: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}:${salt}`);
  
  // Use SubtleCrypto to create a hash
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}