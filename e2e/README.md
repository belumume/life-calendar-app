# E2E Tests

This directory contains end-to-end tests for the MyLife Calendar app using Playwright.

## Running E2E Tests

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run E2E tests in UI mode (recommended for development)
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test e2e/auth.spec.ts

# Run tests in specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Structure

- `auth.spec.ts` - Authentication flows (login, logout, account creation)
- `journal.spec.ts` - Journal entry creation, search, encryption
- `goals.spec.ts` - Goal management and progress tracking
- `habits.spec.ts` - Habit tracking and completion
- `settings.spec.ts` - Settings, themes, data export/import
- `pwa.spec.ts` - PWA functionality, offline mode, service workers
- `helpers/test-utils.ts` - Reusable test utilities

## Writing Tests

Tests use the Page Object Model pattern with the `TestUtils` helper class:

```typescript
import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Feature Name', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
    await utils.createAccountAndLogin('1990-01-01', 'passphrase');
  });

  test('should do something', async ({ page }) => {
    await utils.navigateTo('journal');
    // ... test implementation
  });
});
```

## Safari/WebKit Considerations

The `clearAllData()` method handles Safari's security restrictions by:
1. Attempting to delete the IndexedDB database
2. If that fails (due to security), opening the database and clearing all object stores
3. Gracefully continuing if clearing fails

## Debugging Failed Tests

1. Use the Playwright UI mode to see what's happening:
   ```bash
   npm run test:e2e:ui
   ```

2. Use the debug mode to step through tests:
   ```bash
   npm run test:e2e:debug
   ```

3. Check test artifacts in:
   - `test-results/` - Screenshots and traces for failed tests
   - `playwright-report/` - HTML report

## CI/CD Integration

The tests are configured to:
- Run in parallel across multiple browsers
- Retry failed tests on CI (2 retries)
- Generate screenshots on failure
- Create trace files for debugging