import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Habits Tracking', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
    
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
  });

  test('should create a new habit', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Click add habit button
    await page.click('[data-testid="add-habit"]');
    
    // Fill in habit form
    await page.fill('[data-testid="habit-name"]', 'Daily Meditation');
    await page.fill('[data-testid="habit-description"]', 'Meditate for 10 minutes every morning');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    
    // Save habit
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Verify habit appears in list
    await expect(page.locator('text=Daily Meditation')).toBeVisible();
    await expect(page.locator('[data-testid="habit-frequency-daily"]')).toBeVisible();
  });

  test('should track habit completion', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a daily habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Morning Exercise');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Mark habit as complete for today
    await page.click('[data-testid="habit-checkbox-today"]');
    await utils.dismissToast();
    
    // Verify completion is tracked
    await expect(page.locator('[data-testid="habit-completed-today"]')).toBeVisible();
    await expect(page.locator('[data-testid="habit-streak"]')).toContainText('1');
  });

  test('should track habit streaks', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a daily habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Read for 30 minutes');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Simulate completing habit for multiple days
    const today = new Date();
    
    // Complete for today
    await page.click('[data-testid="habit-checkbox-today"]');
    await utils.dismissToast();
    
    // Complete for yesterday (if the UI supports it)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const yesterdayCheckbox = page.locator(`[data-testid="habit-checkbox-${yesterdayStr}"]`);
    if (await yesterdayCheckbox.isVisible()) {
      await yesterdayCheckbox.click();
      await utils.dismissToast();
    }
    
    // Verify streak count
    await expect(page.locator('[data-testid="habit-current-streak"]')).toContainText(/[1-9]/);
  });

  test('should handle different habit frequencies', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create habits with different frequencies
    const habits = [
      { name: 'Daily Habit', frequency: 'daily' },
      { name: 'Weekly Habit', frequency: 'weekly' },
      { name: 'Monthly Habit', frequency: 'monthly' }
    ];
    
    for (const habit of habits) {
      await page.click('[data-testid="add-habit"]');
      await page.fill('[data-testid="habit-name"]', habit.name);
      await page.selectOption('[data-testid="habit-frequency"]', habit.frequency);
      await page.click('[data-testid="save-habit"]');
      await utils.dismissToast();
    }
    
    // Verify all habits are displayed with correct frequency
    for (const habit of habits) {
      await expect(page.locator(`text=${habit.name}`)).toBeVisible();
      await expect(page.locator(`[data-testid="habit-frequency-${habit.frequency}"]`)).toBeVisible();
    }
  });

  test('should show habit completion calendar', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Write in Journal');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Click on habit to view details
    await page.click('text=Write in Journal');
    
    // Should show calendar view
    await expect(page.locator('[data-testid="habit-calendar"]')).toBeVisible();
    
    // Mark some days as complete
    await page.click('[data-testid="habit-checkbox-today"]');
    await utils.dismissToast();
    
    // Calendar should show completion
    await expect(page.locator('[data-testid="calendar-day-completed"]')).toBeVisible();
  });

  test('should add notes to habit completion', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Practice Guitar');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Click on habit to expand
    await page.click('text=Practice Guitar');
    
    // Complete with notes
    await page.click('[data-testid="habit-add-note-today"]');
    await page.fill('[data-testid="habit-completion-note"]', 'Practiced scales and learned new chord progression');
    await page.click('[data-testid="save-habit-note"]');
    await utils.dismissToast();
    
    // Verify note is saved
    await expect(page.locator('[data-testid="habit-note-indicator"]')).toBeVisible();
    
    // Click to view note
    await page.click('[data-testid="habit-note-indicator"]');
    await expect(page.locator('text=Practiced scales and learned new chord progression')).toBeVisible();
  });

  test('should update habit details', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Original Habit Name');
    await page.fill('[data-testid="habit-description"]', 'Original description');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Click edit button
    await page.click('[data-testid="edit-habit"]');
    
    // Update habit details
    await page.fill('[data-testid="habit-name"]', 'Updated Habit Name');
    await page.fill('[data-testid="habit-description"]', 'Updated description with more details');
    await page.selectOption('[data-testid="habit-frequency"]', 'weekly');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Verify updates
    await expect(page.locator('text=Updated Habit Name')).toBeVisible();
    await expect(page.locator('[data-testid="habit-frequency-weekly"]')).toBeVisible();
  });

  test('should delete a habit', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Habit to Delete');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Click delete button
    await page.click('[data-testid="delete-habit"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    await utils.dismissToast();
    
    // Habit should be removed
    await expect(page.locator('text=Habit to Delete')).not.toBeVisible();
  });

  test('should show habit statistics', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create multiple habits and complete some
    const habits = ['Habit 1', 'Habit 2', 'Habit 3'];
    
    for (const habit of habits) {
      await page.click('[data-testid="add-habit"]');
      await page.fill('[data-testid="habit-name"]', habit);
      await page.selectOption('[data-testid="habit-frequency"]', 'daily');
      await page.click('[data-testid="save-habit"]');
      await utils.dismissToast();
    }
    
    // Complete first two habits for today
    await page.locator('[data-testid="habit-checkbox-today"]').first().click();
    await utils.dismissToast();
    await page.locator('[data-testid="habit-checkbox-today"]').nth(1).click();
    await utils.dismissToast();
    
    // Check statistics
    await expect(page.locator('[data-testid="total-habits"]')).toContainText('3');
    await expect(page.locator('[data-testid="completed-today"]')).toContainText('2');
    await expect(page.locator('[data-testid="completion-rate"]')).toContainText('66%');
  });

  test('should associate habits with periods', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit for current period
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Summer 2025 Habit');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    
    // Select current period if available
    const periodSelect = page.locator('[data-testid="habit-period"]');
    if (await periodSelect.isVisible()) {
      await periodSelect.selectOption({ index: 1 }); // Select first available period
    }
    
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Habit should show period association
    await expect(page.locator('[data-testid="habit-period-badge"]')).toBeVisible();
  });

  test('should encrypt habit data', async ({ page }) => {
    await utils.navigateTo('habits');
    
    // Create a habit with sensitive information
    await page.click('[data-testid="add-habit"]');
    await page.fill('[data-testid="habit-name"]', 'Private Health Habit');
    await page.fill('[data-testid="habit-description"]', 'Take medication XYZ at 8am daily');
    await page.selectOption('[data-testid="habit-frequency"]', 'daily');
    await page.click('[data-testid="save-habit"]');
    await utils.dismissToast();
    
    // Check IndexedDB to ensure data is encrypted
    const isEncrypted = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('mylife-calendar-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const tx = db.transaction(['habits'], 'readonly');
      const store = tx.objectStore('habits');
      const habits = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Check if any habit contains unencrypted sensitive text
      return !habits.some(habit => 
        habit.name?.includes('Private Health Habit') ||
        habit.description?.includes('medication XYZ') ||
        JSON.stringify(habit).includes('Private Health Habit')
      );
    });
    
    expect(isEncrypted).toBe(true);
  });
});