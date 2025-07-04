import { Page, expect } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Create a new account and login
   */
  async createAccountAndLogin(birthDate: string, passphrase: string) {
    // Navigate to home
    await this.page.goto('/');
    
    // Fill in birth date
    await this.page.fill('input[name="birthDate"]', birthDate);
    
    // Fill in passphrase
    await this.page.fill('input[name="passphrase"]', passphrase);
    
    // Fill in confirm passphrase
    await this.page.fill('input[name="confirmPassphrase"]', passphrase);
    
    // Click create account button
    await this.page.click('button:has-text("Create Account")');
    
    // Wait for navigation to dashboard
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  /**
   * Login with existing account
   */
  async login(passphrase: string) {
    await this.page.goto('/');
    
    // Click on "Already have an account?" link if it exists
    const loginLink = this.page.locator('text=Already have an account?');
    if (await loginLink.isVisible()) {
      await loginLink.click();
    }
    
    // Fill in passphrase
    await this.page.fill('input[name="passphrase"]', passphrase);
    
    // Click login button
    await this.page.click('button:has-text("Login")');
    
    // Wait for navigation
    await expect(this.page).toHaveURL(/.*dashboard/);
  }

  /**
   * Logout from the application
   */
  async logout() {
    // Click on user menu or settings
    await this.page.click('[data-testid="user-menu"]');
    
    // Click logout
    await this.page.click('button:has-text("Logout")');
    
    // Should redirect to login page
    await expect(this.page).toHaveURL('/');
  }

  /**
   * Navigate to a specific section
   */
  async navigateTo(section: 'journal' | 'goals' | 'habits' | 'settings') {
    await this.page.click(`[data-testid="nav-${section}"]`);
    await expect(this.page).toHaveURL(new RegExp(`.*${section}`));
  }

  /**
   * Wait for and dismiss toast notifications
   */
  async dismissToast() {
    const toast = this.page.locator('[role="alert"]');
    if (await toast.isVisible()) {
      const closeButton = toast.locator('button[aria-label="Close"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      }
      await expect(toast).not.toBeVisible();
    }
  }

  /**
   * Clear all application data
   */
  async clearAllData() {
    await this.page.evaluate(() => {
      // Clear IndexedDB
      if ('indexedDB' in window) {
        indexedDB.deleteDatabase('mylife-calendar-db');
      }
      // Clear localStorage
      localStorage.clear();
      // Clear sessionStorage
      sessionStorage.clear();
    });
  }
}