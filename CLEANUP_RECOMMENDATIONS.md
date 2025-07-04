# Codebase Cleanup Recommendations

## Summary
The codebase is generally well-maintained, but there are several areas that need cleanup to improve maintainability and reduce technical debt.

## 1. Remove Unused Files 🗑️

### Dead Code Files (Not imported anywhere)
- `/src/lib/state/simple-store.ts` - Abandoned state management approach
- `/src/lib/db/database.ts` - SQLite implementation (not used due to IndexedDB pivot)
- `/src/lib/db/indexed-db.ts` - Full IndexedDB schema (superseded by browser-db.ts)
- `/src/lib/db/idb-service.ts` - Service wrapper (not imported)

### Temporary Build Files
- `app.config.timestamp_1751564570851.js`
- `app.config.timestamp_1751565117960.js`
- `app.config.timestamp_1751569167311.js`

**Action:** Delete these files as they're not part of the active codebase.

## 2. Console.log Statements to Remove 📝

Found in 20 non-test files. Priority removals:

### High Priority (User-facing components)
- `src/components/Setup.tsx:38` - Error logging
- `src/routes/login.tsx` - Multiple console.error statements
- `src/routes/period/index.tsx:47` - Failed to load data

### Medium Priority (Service layer)
- `src/lib/services/app-service.ts:38` - Failed to initialize
- `src/lib/sync/sync-queue.ts` - Multiple debug logs
- `src/lib/migration/migration-service.ts` - Migration progress logs

**Action:** Replace with proper logging service or remove entirely.

## 3. TODO Comments to Address 📋

### Critical TODOs
1. **Delete functionality missing**
   ```typescript
   // journal-repository.ts:49-53
   async deleteEntry(id: string, userId: string): Promise<void> {
     console.warn('Delete not implemented yet');
   }
   ```

2. **Missing repositories**
   ```typescript
   // src/lib/db/repositories/index.ts:6
   // TODO: Add these repositories
   ```

### Low Priority TODOs
- `src/lib/db/idb-service.ts:10` - Add more repositories
- `src/lib/db/idb-service.ts:35` - Store salt with user data (already fixed)

**Action:** Create issues for each TODO or implement immediately.

## 4. Unused Imports to Clean

### Common patterns found:
- Importing unused validation schemas
- Importing types that aren't used
- Importing both named and default exports when only one is needed

**Action:** Configure ESLint to catch unused imports.

## 5. Inconsistent Code Patterns 🔧

### Issue 1: Error Handling
```typescript
// Some places:
throw new Error('Message');

// Others:
throw new AppServiceError('Message', 'CODE');

// Some catch blocks:
console.error(err);

// Others have proper error states:
setError(err.message);
```

### Issue 2: Null Handling
```typescript
// Sometimes:
currentPeriod()?.totalDays

// Other times:
this.db!.put('entries', entry)
```

**Action:** Standardize error handling and null checking patterns.

## 6. Configuration Cleanup 🛠️

### Package.json Scripts
The lint script exists but ESLint isn't properly configured:
```json
"lint": "eslint src/**/*.{ts,tsx}"
```

**Action:** Either configure ESLint properly or remove the script.

## 7. Type Safety Improvements 🔒

### Any Types in Critical Functions
```typescript
// browser-db.ts:187
async saveEntry(entry: any): Promise<void> {
```

**Action:** Replace `any` with proper types throughout.

## 8. Recommended Cleanup Script

Create a cleanup script to automate these tasks:

```bash
#!/bin/bash
# cleanup.sh

echo "🧹 Starting codebase cleanup..."

# Remove temporary files
echo "Removing temporary config files..."
rm -f app.config.timestamp_*.js

# Remove unused source files
echo "Removing dead code files..."
rm -f src/lib/state/simple-store.ts
rm -f src/lib/db/database.ts
rm -f src/lib/db/indexed-db.ts
rm -f src/lib/db/idb-service.ts

# Find remaining console statements
echo "Console statements remaining:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "console\." | grep -v test

# Find remaining TODOs
echo "TODOs remaining:"
find src -name "*.ts" -o -name "*.tsx" | xargs grep -n "TODO\|FIXME"

echo "✅ Cleanup complete!"
```

## 9. Quick Wins 🎯

1. **Implement delete functionality** in journal-repository.ts
2. **Remove all console.log statements** (replace with proper error handling)
3. **Delete unused files** listed above
4. **Fix TypeScript strict mode issues** (any types, non-null assertions)
5. **Add .gitignore entries** for `app.config.timestamp_*.js`

## 10. Long-term Improvements 🚀

1. **Set up proper logging service**
   - Replace console.* with structured logging
   - Add log levels (debug, info, warn, error)
   - Disable debug logs in production

2. **Configure linting and formatting**
   - Set up ESLint with TypeScript rules
   - Add Prettier for consistent formatting
   - Add pre-commit hooks

3. **Improve type safety**
   - Enable TypeScript strict mode
   - Remove all `any` types
   - Add proper error types

4. **Consolidate database layer**
   - Remove unused IndexedDB implementations
   - Focus on browser-db.ts as single source
   - Document why SQLite files remain (for reference)

## Conclusion

The codebase is in good shape overall, but these cleanup tasks will significantly improve maintainability. Most issues are minor and can be addressed quickly. Priority should be given to removing dead code, fixing missing functionality (delete operations), and removing console statements.