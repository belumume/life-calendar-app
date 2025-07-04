import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Settings and Data Management', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
    
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
  });

  test('should change theme settings', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Check current theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('data-theme');
    
    // Toggle theme
    await page.click('[data-testid="theme-toggle"]');
    await utils.dismissToast();
    
    // Verify theme changed
    const newTheme = await htmlElement.getAttribute('data-theme');
    expect(newTheme).not.toBe(initialTheme);
    
    // Theme should persist after reload
    await page.reload();
    const persistedTheme = await htmlElement.getAttribute('data-theme');
    expect(persistedTheme).toBe(newTheme);
  });

  test('should customize theme colors', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Open theme customization
    await page.click('[data-testid="customize-theme"]');
    
    // Change primary color
    await page.fill('[data-testid="primary-color"]', '#ff6b6b');
    
    // Change accent color
    await page.fill('[data-testid="accent-color"]', '#4ecdc4');
    
    // Save theme
    await page.click('[data-testid="save-theme"]');
    await utils.dismissToast();
    
    // Verify CSS variables are updated
    const primaryColor = await page.evaluate(() => 
      getComputedStyle(document.documentElement).getPropertyValue('--primary-color')
    );
    expect(primaryColor.trim()).toBe('#ff6b6b');
  });

  test('should export all data', async ({ page }) => {
    // First create some data
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Test entry for export');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Navigate to settings
    await utils.navigateTo('settings');
    
    // Start export
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-data"]')
    ]);
    
    // Verify download
    expect(download.suggestedFilename()).toMatch(/mylife-calendar-export-\d{4}-\d{2}-\d{2}\.json/);
    
    // Read the downloaded file
    const content = await download.path().then(path => 
      page.evaluate(async (path) => {
        const response = await fetch(`file://${path}`);
        return response.json();
      }, download.path())
    ).catch(() => null);
    
    if (content) {
      expect(content).toHaveProperty('version');
      expect(content).toHaveProperty('exportDate');
      expect(content).toHaveProperty('data');
      expect(content.data).toHaveProperty('entries');
    }
  });

  test('should export data in different formats', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Test CSV export
    await page.selectOption('[data-testid="export-format"]', 'csv');
    const [csvDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-data"]')
    ]);
    expect(csvDownload.suggestedFilename()).toContain('.csv');
    
    // Test Markdown export
    await page.selectOption('[data-testid="export-format"]', 'markdown');
    const [mdDownload] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="export-data"]')
    ]);
    expect(mdDownload.suggestedFilename()).toContain('.md');
  });

  test('should handle data import', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Create a mock import file
    const importData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      data: {
        entries: [{
          id: 'imported-entry-1',
          content: 'Imported journal entry',
          mood: 'great',
          energyLevel: 5,
          date: new Date().toISOString()
        }]
      }
    };
    
    // Create file input and upload
    await page.setInputFiles('[data-testid="import-file"]', {
      name: 'import.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(importData))
    });
    
    // Confirm import
    await page.click('[data-testid="confirm-import"]');
    await utils.dismissToast();
    
    // Navigate to journal to verify import
    await utils.navigateTo('journal');
    await expect(page.locator('text=Imported journal entry')).toBeVisible();
  });

  test('should clear all data with confirmation', async ({ page }) => {
    // Create some data first
    await utils.navigateTo('journal');
    await page.click('[data-testid="add-journal-entry"]');
    await page.fill('[data-testid="journal-content"]', 'Entry to be deleted');
    await page.click('[data-testid="mood-good"]');
    await page.click('[data-testid="energy-3"]');
    await page.click('[data-testid="save-journal-entry"]');
    await utils.dismissToast();
    
    // Navigate to settings
    await utils.navigateTo('settings');
    
    // Click clear data
    await page.click('[data-testid="clear-all-data"]');
    
    // Should show confirmation dialog
    await expect(page.locator('[data-testid="confirm-dialog"]')).toBeVisible();
    await expect(page.locator('text=/This action cannot be undone|permanently delete/')).toBeVisible();
    
    // Type confirmation text
    await page.fill('[data-testid="confirm-text"]', 'DELETE ALL DATA');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    
    // Should redirect to login
    await expect(page).toHaveURL('/');
    
    // Verify data is cleared
    await page.reload();
    await expect(page.locator('text=Create your account')).toBeVisible();
  });

  test('should manage notification settings', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Toggle daily reminder
    await page.click('[data-testid="daily-reminder-toggle"]');
    
    // Set reminder time
    await page.fill('[data-testid="reminder-time"]', '09:00');
    
    // Toggle habit reminders
    await page.click('[data-testid="habit-reminders-toggle"]');
    
    // Save settings
    await page.click('[data-testid="save-notification-settings"]');
    await utils.dismissToast();
    
    // Verify settings are saved
    await page.reload();
    await utils.navigateTo('settings');
    
    await expect(page.locator('[data-testid="daily-reminder-toggle"]')).toBeChecked();
    await expect(page.locator('[data-testid="reminder-time"]')).toHaveValue('09:00');
  });

  test('should display account information', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Should show account creation date
    await expect(page.locator('[data-testid="account-created"]')).toBeVisible();
    
    // Should show birth date
    await expect(page.locator('[data-testid="birth-date"]')).toContainText('1990-01-01');
    
    // Should show data statistics
    await expect(page.locator('[data-testid="total-entries"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-goals"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-habits"]')).toBeVisible();
  });

  test('should handle offline mode settings', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Check sync status
    await expect(page.locator('[data-testid="sync-status"]')).toBeVisible();
    
    // Toggle offline mode
    await page.click('[data-testid="offline-mode-toggle"]');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Sync queue should be paused
    await expect(page.locator('[data-testid="sync-paused"]')).toBeVisible();
  });

  test('should show app version and info', async ({ page }) => {
    await utils.navigateTo('settings');
    
    // Scroll to about section
    await page.locator('[data-testid="about-section"]').scrollIntoViewIfNeeded();
    
    // Should show version
    await expect(page.locator('[data-testid="app-version"]')).toBeVisible();
    
    // Should show privacy policy link
    await expect(page.locator('[data-testid="privacy-policy-link"]')).toBeVisible();
    
    // Should show open source link
    await expect(page.locator('[data-testid="github-link"]')).toBeVisible();
  });
});