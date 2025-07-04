import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('PWA Functionality', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
  });

  test('should register service worker', async ({ page }) => {
    await page.goto('/');
    
    // Wait for service worker registration
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('should show install prompt', async ({ page, context }) => {
    // Note: Install prompt testing is limited in automated tests
    // This test verifies the UI elements are present
    
    await page.goto('/');
    
    // Check if install button is present (when not installed)
    const installButton = page.locator('[data-testid="install-app"]');
    
    // Install button might only show in certain conditions
    if (await installButton.isVisible()) {
      // Verify install UI elements
      await expect(installButton).toContainText(/Install/);
    }
  });

  test('should cache assets for offline use', async ({ page, context }) => {
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Navigate to different pages to cache them
    await utils.navigateTo('journal');
    await utils.navigateTo('goals');
    await utils.navigateTo('habits');
    
    // Check if resources are cached
    const cacheStatus = await page.evaluate(async () => {
      const cacheNames = await caches.keys();
      const hasCache = cacheNames.length > 0;
      
      if (hasCache) {
        const cache = await caches.open(cacheNames[0]);
        const keys = await cache.keys();
        return {
          hasCache,
          cachedUrls: keys.length
        };
      }
      
      return { hasCache, cachedUrls: 0 };
    });
    
    expect(cacheStatus.hasCache).toBe(true);
    expect(cacheStatus.cachedUrls).toBeGreaterThan(0);
  });

  test('should work offline after initial load', async ({ page, context }) => {
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Create some data
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Online entry');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Go offline
    await context.setOffline(true);
    
    // Should still be able to navigate
    await utils.navigateTo('goals');
    await expect(page).toHaveURL(/.*goals/);
    
    // Should be able to create data offline
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Offline Goal');
    await page.fill('[data-testid="goal-target-value"]', '100');
    await page.click('[data-testid="save-goal"]');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Data should be queued for sync
    await expect(page.locator('[data-testid="sync-queue-count"]')).toBeVisible();
  });

  test('should sync data when coming back online', async ({ page, context }) => {
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Go offline
    await context.setOffline(true);
    
    // Create data while offline
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Offline entry to sync');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    
    // Verify sync queue has items
    const queueCount = await page.locator('[data-testid="sync-queue-count"]').textContent();
    expect(parseInt(queueCount || '0')).toBeGreaterThan(0);
    
    // Go back online
    await context.setOffline(false);
    
    // Wait for sync to complete
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 10000 });
    
    // Sync queue should be empty
    await expect(page.locator('[data-testid="sync-queue-count"]')).toContainText('0');
    
    // Offline indicator should disappear
    await expect(page.locator('[data-testid="offline-indicator"]')).not.toBeVisible();
  });

  test('should handle app updates gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Check for update notification UI
    const updateAvailable = page.locator('[data-testid="update-available"]');
    
    // If update UI is implemented
    if (await updateAvailable.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Should show update prompt
      await expect(updateAvailable).toContainText(/Update available/);
      
      // Should have reload button
      const reloadButton = page.locator('[data-testid="reload-for-update"]');
      await expect(reloadButton).toBeVisible();
    }
  });

  test('should persist data in IndexedDB across sessions', async ({ page, context }) => {
    // Create account and add data
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Persistent entry');
    await page.click('[data-testid="mood-great"]');
    await page.click('[data-testid="energy-5"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Close and reopen in new context
    await context.close();
    const newContext = await page.context().browser()!.newContext();
    const newPage = await newContext.newPage();
    const newUtils = new TestUtils(newPage);
    
    // Login again
    await newUtils.login('MySecurePassphrase123!');
    
    // Navigate to journal
    await newUtils.navigateTo('journal');
    
    // Entry should still be there
    await expect(newPage.locator('text=Persistent entry')).toBeVisible();
    
    await newContext.close();
  });

  test('should show storage usage', async ({ page }) => {
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Add some data to increase storage
    for (let i = 0; i < 5; i++) {
      await utils.navigateTo('journal');
      await page.click('[data-testid="add-journal-entry"]');
      await page.fill('[data-testid="journal-content"]', `Entry ${i} with some content to increase storage usage`);
      await page.click('[data-testid="mood-good"]');
      await page.click('[data-testid="energy-3"]');
      await page.click('[data-testid="save-journal-entry"]');
      await utils.dismissToast();
    }
    
    // Check settings for storage info
    await utils.navigateTo('settings');
    
    // Should show storage usage
    const storageInfo = await page.locator('[data-testid="storage-usage"]').textContent();
    expect(storageInfo).toMatch(/\d+(\.\d+)?\s*(KB|MB)/);
  });

  test('should handle quota exceeded gracefully', async ({ page }) => {
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Try to create a very large entry (this is a theoretical test)
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    
    // Create a very large string (10MB)
    const largeContent = 'x'.repeat(10 * 1024 * 1024);
    
    // Try to save it
    await page.fill('[data-testid="journal-content"]', largeContent);
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    
    // Should show appropriate error message
    await expect(page.locator('text=/Storage quota|quota exceeded|storage full/i')).toBeVisible({ timeout: 5000 });
  });
});