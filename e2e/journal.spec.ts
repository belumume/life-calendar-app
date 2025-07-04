import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Journal Functionality', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
    
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
  });

  test('should create a journal entry', async ({ page }) => {
    // Navigate to journal
    await utils.navigateTo('journal');
    
    // Click add entry button
    await page.click('[data-testid="add-journal-entry"]');
    
    // Fill in entry form
    await page.fill('[data-testid="journal-content"]', 'Today was a great day! I completed my E2E tests.');
    
    // Select mood
    await page.click('[data-testid="mood-great"]');
    
    // Select energy level
    await page.click('[data-testid="energy-4"]');
    
    // Add tags
    await page.fill('[data-testid="journal-tags"]', 'testing, success');
    
    // Add achievements
    await page.fill('[data-testid="journal-achievements"]', 'Completed E2E test suite');
    
    // Add gratitude
    await page.fill('[data-testid="journal-gratitude"]', 'Grateful for automated testing');
    
    // Save entry
    await page.click('[data-testid="save-journal-entry"]');
    
    // Dismiss success toast if visible
    await utils.dismissToast();
    
    // Verify entry appears in list
    await expect(page.locator('text=Today was a great day!')).toBeVisible();
    await expect(page.locator('[data-testid="mood-indicator-great"]')).toBeVisible();
  });

  test('should display journal entries in chronological order', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Create first entry
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'First entry');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Wait a moment
    await page.waitForTimeout(1000);
    
    // Create second entry
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Second entry');
    await page.click('[data-testid="mood-great"]');
    await page.click('[data-testid="energy-5"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Verify order - most recent first
    const entries = page.locator('[data-testid="journal-entry"]');
    await expect(entries.first()).toContainText('Second entry');
    await expect(entries.last()).toContainText('First entry');
  });

  test('should search journal entries', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Create entries with different content
    const entries = [
      { content: 'Went for a morning run', mood: 'great' },
      { content: 'Had a productive meeting at work', mood: 'good' },
      { content: 'Enjoyed a quiet evening reading', mood: 'good' }
    ];
    
    for (const entry of entries) {
      await page.click('[data-testid="add-journal-entry"]');
      await page.fill('[data-testid="journal-content"]', entry.content);
      await page.click(`[data-testid="mood-${entry.mood}"]`);
      await page.click('[data-testid="energy-3"]');
      await page.click('[data-testid="save-journal-entry"]');
      await utils.dismissToast();
    }
    
    // Search for "work"
    await page.fill('[data-testid="journal-search"]', 'work');
    
    // Should only show the work-related entry
    await expect(page.locator('text=productive meeting at work')).toBeVisible();
    await expect(page.locator('text=morning run')).not.toBeVisible();
    await expect(page.locator('text=quiet evening')).not.toBeVisible();
  });

  test('should filter journal entries by mood', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Create entries with different moods
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Great day!');
    await page.click('[data-testid="mood-great"]');
    await page.click('[data-testid="energy-4"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Okay day');
    await page.click('[data-testid="mood-neutral"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Filter by "great" mood
    await page.click('[data-testid="filter-mood-great"]');
    
    // Should only show the great mood entry
    await expect(page.locator('text=Great day!')).toBeVisible();
    await expect(page.locator('text=Okay day')).not.toBeVisible();
  });

  test('should paginate journal entries', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Create 15 entries (assuming 10 per page)
    for (let i = 1; i <= 15; i++) {
      await page.click('[data-testid="add-journal-entry"]');
      await page.fill('[data-testid="journal-content"]', `Entry ${i}`);
      await page.click('[data-testid="mood-good"]');
      await page.click('[data-testid="energy-3"]');
      await page.click('[data-testid="save-journal-entry"]');
      await utils.dismissToast();
    }
    
    // Should show pagination controls
    await expect(page.locator('[data-testid="pagination"]')).toBeVisible();
    
    // First page should show entries 15-6 (most recent first)
    await expect(page.locator('text=Entry 15')).toBeVisible();
    await expect(page.locator('text=Entry 6')).toBeVisible();
    await expect(page.locator('text=Entry 5')).not.toBeVisible();
    
    // Go to page 2
    await page.click('[data-testid="pagination-page-2"]');
    
    // Should show entries 5-1
    await expect(page.locator('text=Entry 5')).toBeVisible();
    await expect(page.locator('text=Entry 1')).toBeVisible();
    await expect(page.locator('text=Entry 6')).not.toBeVisible();
  });

  test('should encrypt journal entries', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Create an entry
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Sensitive information here');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Check IndexedDB to ensure data is encrypted
    const isEncrypted = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('mylife-calendar-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const tx = db.transaction(['entries'], 'readonly');
      const store = tx.objectStore('entries');
      const entries = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Check if any entry contains unencrypted text
      return !entries.some(entry => 
        entry.content?.includes('Sensitive information') ||
        JSON.stringify(entry).includes('Sensitive information')
      );
    });
    
    expect(isEncrypted).toBe(true);
  });

  test('should handle empty journal gracefully', async ({ page }) => {
    await utils.navigateTo('journal');
    
    // Should show empty state
    await expect(page.locator('[data-testid="journal-empty-state"]')).toBeVisible();
    await expect(page.locator('text=/No journal entries yet|Start your journaling journey/')).toBeVisible();
    
    // Add entry button should be prominent
    await expect(page.locator('[data-testid="add-journal-entry"]')).toBeVisible();
  });
});