import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Goals Management', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
    
    // Create account and login
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
  });

  test('should create a new goal', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Click add goal button
    await page.click('[data-testid="add-goal"]');
    
    // Fill in goal form
    await page.fill('[data-testid="goal-title"]', 'Complete E2E Testing Suite');
    await page.fill('[data-testid="goal-description"]', 'Write comprehensive E2E tests for all features');
    await page.fill('[data-testid="goal-target-value"]', '100');
    await page.fill('[data-testid="goal-target-date"]', '2025-12-31');
    
    // Add milestones
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-0-title"]', 'Auth tests complete');
    await page.fill('[data-testid="milestone-0-target"]', '25');
    
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-1-title"]', 'Journal tests complete');
    await page.fill('[data-testid="milestone-1-target"]', '50');
    
    // Save goal
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Verify goal appears in list
    await expect(page.locator('text=Complete E2E Testing Suite')).toBeVisible();
    await expect(page.locator('[data-testid="goal-progress-bar"]')).toBeVisible();
  });

  test('should update goal progress', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create a goal
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Read 12 Books');
    await page.fill('[data-testid="goal-description"]', 'Read one book per month');
    await page.fill('[data-testid="goal-target-value"]', '12');
    await page.fill('[data-testid="goal-target-date"]', '2025-12-31');
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Click on the goal to expand/edit
    await page.click('text=Read 12 Books');
    
    // Update progress
    await page.fill('[data-testid="goal-current-progress"]', '3');
    await page.click('[data-testid="update-progress"]');
    await utils.dismissToast();
    
    // Verify progress is updated
    await expect(page.locator('[data-testid="goal-progress-text"]')).toContainText('3 / 12');
    await expect(page.locator('[data-testid="goal-progress-percentage"]')).toContainText('25%');
  });

  test('should toggle milestone completion', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create a goal with milestones
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Launch MVP');
    await page.fill('[data-testid="goal-target-value"]', '100');
    
    await page.click('[data-testid="add-milestone"]');
    await page.fill('[data-testid="milestone-0-title"]', 'Complete frontend');
    await page.fill('[data-testid="milestone-0-target"]', '50');
    
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Click on goal to expand
    await page.click('text=Launch MVP');
    
    // Toggle milestone completion
    await page.click('[data-testid="milestone-0-checkbox"]');
    await utils.dismissToast();
    
    // Verify milestone is marked as complete
    await expect(page.locator('[data-testid="milestone-0-completed"]')).toBeVisible();
    
    // Progress should auto-update to 50
    await expect(page.locator('[data-testid="goal-progress-text"]')).toContainText('50 / 100');
  });

  test('should filter goals by status', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create active goal
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Active Goal');
    await page.fill('[data-testid="goal-target-value"]', '100');
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Create and complete a goal
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Completed Goal');
    await page.fill('[data-testid="goal-target-value"]', '10');
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Mark second goal as complete
    await page.click('text=Completed Goal');
    await page.fill('[data-testid="goal-current-progress"]', '10');
    await page.click('[data-testid="update-progress"]');
    await utils.dismissToast();
    
    // Filter by active
    await page.click('[data-testid="filter-active-goals"]');
    await expect(page.locator('text=Active Goal')).toBeVisible();
    await expect(page.locator('text=Completed Goal')).not.toBeVisible();
    
    // Filter by completed
    await page.click('[data-testid="filter-completed-goals"]');
    await expect(page.locator('text=Completed Goal')).toBeVisible();
    await expect(page.locator('text=Active Goal')).not.toBeVisible();
  });

  test('should delete a goal', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create a goal
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Goal to Delete');
    await page.fill('[data-testid="goal-target-value"]', '100');
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Click on goal to expand
    await page.click('text=Goal to Delete');
    
    // Click delete button
    await page.click('[data-testid="delete-goal"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');
    await utils.dismissToast();
    
    // Goal should be removed
    await expect(page.locator('text=Goal to Delete')).not.toBeVisible();
  });

  test('should show goal statistics', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create multiple goals with different progress
    const goals = [
      { title: 'Goal 1', target: 100, progress: 100 }, // Completed
      { title: 'Goal 2', target: 50, progress: 25 },   // In progress
      { title: 'Goal 3', target: 20, progress: 0 }     // Not started
    ];
    
    for (const goal of goals) {
      await page.click('[data-testid="add-goal"]');
      await page.fill('[data-testid="goal-title"]', goal.title);
      await page.fill('[data-testid="goal-target-value"]', goal.target.toString());
      await page.click('[data-testid="save-goal"]');
      await utils.dismissToast();
      
      if (goal.progress > 0) {
        await page.click(`text=${goal.title}`);
        await page.fill('[data-testid="goal-current-progress"]', goal.progress.toString());
        await page.click('[data-testid="update-progress"]');
        await utils.dismissToast();
      }
    }
    
    // Check statistics
    await expect(page.locator('[data-testid="total-goals"]')).toContainText('3');
    await expect(page.locator('[data-testid="completed-goals"]')).toContainText('1');
    await expect(page.locator('[data-testid="in-progress-goals"]')).toContainText('2');
  });

  test('should associate goals with periods', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create a goal for current period
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Summer 2025 Goal');
    await page.fill('[data-testid="goal-target-value"]', '88');
    
    // Select current period if available
    const periodSelect = page.locator('[data-testid="goal-period"]');
    if (await periodSelect.isVisible()) {
      await periodSelect.selectOption({ index: 1 }); // Select first available period
    }
    
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Goal should show period association
    await expect(page.locator('[data-testid="goal-period-badge"]')).toBeVisible();
  });

  test('should encrypt goal data', async ({ page }) => {
    await utils.navigateTo('goals');
    
    // Create a goal with sensitive information
    await page.click('[data-testid="add-goal"]');
    await page.fill('[data-testid="goal-title"]', 'Private Financial Goal');
    await page.fill('[data-testid="goal-description"]', 'Save $50,000 for retirement');
    await page.fill('[data-testid="goal-target-value"]', '50000');
    await page.click('[data-testid="save-goal"]');
    await utils.dismissToast();
    
    // Check IndexedDB to ensure data is encrypted
    const isEncrypted = await page.evaluate(async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('mylife-calendar-db');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      const tx = db.transaction(['goals'], 'readonly');
      const store = tx.objectStore('goals');
      const goals = await new Promise<any[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      // Check if any goal contains unencrypted sensitive text
      return !goals.some(goal => 
        goal.title?.includes('Private Financial Goal') ||
        goal.description?.includes('50,000') ||
        JSON.stringify(goal).includes('Private Financial Goal')
      );
    });
    
    expect(isEncrypted).toBe(true);
  });
});