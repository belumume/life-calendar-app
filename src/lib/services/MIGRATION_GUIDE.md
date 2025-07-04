# AppService Refactoring Migration Guide

## Overview

The monolithic `AppService` has been refactored into smaller, focused services following the Single Responsibility Principle. This improves maintainability, testability, and code organization.

## New Service Structure

### 1. **AuthService** (`auth/auth-service.ts`)
- Handles authentication state and login/logout operations
- Manages rate limiting for login attempts
- Provides auth checks for other services

**Key Methods:**
- `authenticate(passphrase)` - Replaces `login()`
- `requireAuth()` - Throws if user not authenticated
- `getAuthenticatedUserId()` - Gets current user ID safely

### 2. **UserService** (`user/user-service.ts`)
- Manages user account creation and preferences
- Handles theme updates
- Manages data clearing operations

**Key Methods:**
- `createAccount(birthDate, passphrase)`
- `updateTheme(theme)`
- `clearAllData()`

### 3. **JournalService** (`journal/journal-service.ts`)
- All journal entry operations
- Handles encryption/decryption of entries
- Manages paginated retrieval

**Key Methods:**
- `addEntry()` - Replaces `addJournalEntry()`
- `getEntries()` - Replaces `getJournalEntries()`
- `getEntriesPaginated()`

### 4. **GoalService** (`goal/goal-service.ts`)
- Complete goal management
- Milestone tracking
- Progress updates

**Key Methods:**
- `createGoal()`
- `updateProgress()` - Replaces `updateGoalProgress()`
- `toggleMilestone()` - Replaces `toggleGoalMilestone()`

### 5. **HabitService** (`habit/habit-service.ts`)
- Habit creation and management
- Completion tracking
- Streak calculations

**Key Methods:**
- `createHabit()`
- `recordCompletion()` - Replaces `recordHabitCompletion()`
- `removeCompletion()` - Replaces `removeHabitCompletion()`

### 6. **PeriodService** (`period/period-service.ts`)
- Period/time tracking management
- Active period retrieval

## Migration Strategies

### Option 1: Use the Refactored AppService (Recommended for gradual migration)

The `appServiceRefactored` maintains the same API as the original `appService` but delegates to the new services internally:

```typescript
// Old code (no changes needed)
import { appService } from '@/lib/services/app-service';
await appService.login(passphrase);

// New code (just change the import)
import { appServiceRefactored as appService } from '@/lib/services';
await appService.login(passphrase);
```

### Option 2: Use Individual Services Directly (Recommended for new code)

```typescript
// Old approach
import { appService } from '@/lib/services/app-service';
await appService.login(passphrase);
const goals = await appService.getGoals();

// New approach
import { authService, goalService } from '@/lib/services';
await authService.authenticate(passphrase);
const goals = await goalService.getGoals();
```

## Benefits of Refactoring

1. **Better Testing**: Each service can be tested in isolation
2. **Clearer Dependencies**: Services explicitly declare what they need
3. **Easier Maintenance**: Changes to one feature don't affect others
4. **Improved Performance**: Only load the services you need
5. **Better Type Safety**: More focused interfaces and error types

## Common Patterns

### Authentication Checks

Old:
```typescript
if (!this.currentUser) {
  throw new AppServiceError('No user logged in', 'NOT_AUTHENTICATED');
}
```

New:
```typescript
authService.requireAuth(); // Throws if not authenticated
const userId = authService.getAuthenticatedUserId();
```

### Error Handling

Each service now has its own error type:
- `AuthServiceError`
- `UserServiceError`
- `JournalServiceError`
- `GoalServiceError`
- `HabitServiceError`
- `PeriodServiceError`

## Testing

Example of testing individual services:

```typescript
// Mock only what the service needs
vi.mock('@/lib/services/auth/auth-service', () => ({
  authService: {
    requireAuth: vi.fn(),
    getAuthenticatedUserId: vi.fn(() => 'test-user-id')
  }
}));

// Test the service in isolation
describe('GoalService', () => {
  it('should create a goal', async () => {
    const goal = await goalService.createGoal(formData);
    expect(goal).toBeDefined();
  });
});
```

## Next Steps

1. Update imports in existing components to use `appServiceRefactored`
2. Gradually migrate to using individual services directly
3. Update tests to mock individual services instead of the entire AppService
4. Remove the original `app-service.ts` once migration is complete