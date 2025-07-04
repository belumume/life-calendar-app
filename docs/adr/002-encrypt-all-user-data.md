# ADR-002: Encrypt All User Data Types

## Status
Accepted

## Context
During code review, it was discovered that while journal entries were encrypted, goals and habits data were stored in plaintext. This violated the zero-knowledge architecture promise.

## Decision
All user-generated content must be encrypted before storage, including:
- Journal entries (already implemented)
- Goals (now implemented)
- Habits (now implemented)
- Any future user data types

## Implementation
Each data type follows the same pattern:
1. Sensitive fields are extracted into an object
2. Object is JSON stringified
3. Encrypted using AES-GCM with user's derived key
4. Stored with encrypted data + IV
5. Non-sensitive metadata remains unencrypted for querying

### Example Structure
```typescript
interface EncryptedGoal {
  id: string;
  userId: string;
  encryptedData: string; // Contains: title, description, milestones, etc.
  iv: string;
  status: GoalStatus; // Unencrypted for filtering
  progress: number; // Unencrypted for quick access
  createdAt: string;
  updatedAt: string;
}
```

## Consequences

### Positive
- **Complete Privacy**: Server/database admin cannot read any user content
- **Consistent Security**: All data types have same security guarantees
- **User Trust**: Fulfills zero-knowledge promise
- **Legal Compliance**: Helps with data protection regulations

### Negative
- **Performance**: Encryption/decryption overhead on every operation
- **Search Limitations**: Cannot search encrypted content server-side
- **Complexity**: More complex data access patterns
- **No Recovery**: If user forgets passphrase, data is permanently lost

### Mitigation
- Cache decrypted data in memory during session
- Implement client-side search after decryption
- Clear documentation about passphrase importance
- Optional passphrase hints (stored separately)