import { test, expect } from '@playwright/test';
import { TestUtils } from './helpers/test-utils';

test.describe('Authentication Flow', () => {
  let utils: TestUtils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.clearAllData();
  });

  test('should create a new account successfully', async ({ page }) => {
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify user menu is visible
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should show error for mismatched passphrases', async ({ page }) => {
    await page.goto('/');
    
    // Fill in birth date
    await page.fill('input[name="birthDate"]', '1990-01-01');
    
    // Fill in different passphrases
    await page.fill('input[name="passphrase"]', 'MySecurePassphrase123!');
    await page.fill('input[name="confirmPassphrase"]', 'DifferentPassphrase123!');
    
    // Try to create account
    await page.click('button:has-text("Create Account")');
    
    // Should show error message
    await expect(page.locator('text=Passphrases do not match')).toBeVisible();
  });

  test('should login with existing account', async ({ page }) => {
    // First create an account
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Logout
    await utils.logout();
    
    // Login again
    await utils.login('MySecurePassphrase123!');
    
    // Verify we're logged in
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should show error for incorrect passphrase', async ({ page }) => {
    // First create an account
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    await utils.logout();
    
    // Try to login with wrong passphrase
    await page.goto('/');
    const loginLink = page.locator('text=Already have an account?');
    if (await loginLink.isVisible()) {
      await loginLink.click();
    }
    
    await page.fill('input[name="passphrase"]', 'WrongPassphrase123!');
    await page.click('button:has-text("Login")');
    
    // Should show error
    await expect(page.locator('text=Invalid passphrase')).toBeVisible();
  });

  test('should enforce rate limiting after multiple failed login attempts', async ({ page }) => {
    // Create an account
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    await utils.logout();
    
    // Make multiple failed login attempts
    for (let i = 0; i < 6; i++) {
      await page.goto('/');
      const loginLink = page.locator('text=Already have an account?');
      if (await loginLink.isVisible()) {
        await loginLink.click();
      }
      
      await page.fill('input[name="passphrase"]', 'WrongPassphrase123!');
      await page.click('button:has-text("Login")');
      
      // Wait a bit between attempts
      await page.waitForTimeout(100);
    }
    
    // Should show rate limit error
    await expect(page.locator('text=/Too many login attempts|Account temporarily locked/')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Logout
    await utils.logout();
    
    // Should be back at login page
    await expect(page).toHaveURL('/');
    
    // Dashboard should not be accessible
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should persist authentication across page refreshes', async ({ page }) => {
    await utils.createAccountAndLogin('1990-01-01', 'MySecurePassphrase123!');
    
    // Refresh the page
    await page.reload();
    
    // Should still be on dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should redirect to login when accessing protected pages without auth', async ({ page }) => {
    // Try to access protected routes without authentication
    const protectedRoutes = ['/dashboard', '/journal', '/goals', '/habits', '/settings'];
    
    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page).toHaveURL('/');
    }
  });
});