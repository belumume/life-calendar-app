import { authRateLimiter } from './rate-limiter';
import { syncQueue } from '../sync/sync-queue';

/**
 * Global cleanup handler to prevent memory leaks
 * This should be called when the application unmounts
 */
export function setupGlobalCleanup(): void {
  // Handle page unload
  window.addEventListener('beforeunload', () => {
    authRateLimiter.destroy();
    syncQueue.destroy();
  });
  
  // Handle visibility change (mobile browsers)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Clear intervals when page is hidden
      authRateLimiter.destroy();
      syncQueue.destroy();
    }
  });
}

/**
 * Manual cleanup function that can be called on logout or app teardown
 */
export function cleanupResources(): void {
  authRateLimiter.destroy();
  syncQueue.destroy();
}