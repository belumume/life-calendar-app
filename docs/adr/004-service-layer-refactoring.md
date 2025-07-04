# ADR-004: Refactor Monolithic AppService

## Status
Accepted

## Context
The AppService had grown to 988 lines and violated the Single Responsibility Principle. It handled authentication, user management, journal entries, goals, habits, and more in a single class.

## Decision
Split AppService into focused services:
1. **AuthService**: Authentication and session management
2. **UserService**: User account and preferences
3. **JournalService**: Journal entry operations
4. **GoalService**: Goal management
5. **HabitService**: Habit tracking
6. **PeriodService**: Time period management
7. **AppServiceRefactored**: Facade maintaining backward compatibility

## Implementation
Each service:
- Has a single, clear responsibility
- Depends only on required repositories and services
- Implements its own error types
- Manages its own state
- Can be tested in isolation

### Example
```typescript
export class GoalService {
  constructor(
    private goalRepository: GoalRepository,
    private authService: AuthService,
    private periodService: PeriodService
  ) {}
  
  async createGoal(formData: GoalFormData): Promise<Goal> {
    this.authService.requireAuth();
    const userId = this.authService.getAuthenticatedUserId();
    // ... goal-specific logic
  }
}
```

## Consequences

### Positive
- **Maintainability**: Easier to understand and modify
- **Testability**: Services can be tested independently
- **Reusability**: Services can be composed differently
- **Team Scalability**: Different developers can work on different services
- **Performance**: Only load needed services

### Negative
- **Initial Complexity**: More files and imports
- **Migration Effort**: Existing code needs updates
- **Coordination**: Services must communicate properly
- **Duplication Risk**: Some logic might be duplicated

### Mitigation
- Maintain backward-compatible facade during migration
- Share common utilities via dedicated modules
- Use dependency injection pattern consistently
- Document service interactions clearly

## Notes
This refactoring improves long-term maintainability at the cost of initial complexity. The facade pattern allows gradual migration without breaking existing code.