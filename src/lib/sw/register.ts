import { Workbox } from 'workbox-window';

let wb: Workbox | null = null;

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Workers not supported');
    return;
  }

  try {
    // Use Workbox for better SW management
    wb = new Workbox('/sw.js');

    // Add event listeners
    wb.addEventListener('installed', (event) => {
      if (!event.isUpdate) {
        console.log('Service Worker installed for the first time');
      }
    });

    wb.addEventListener('waiting', () => {
      console.log('Service Worker waiting to activate');
      // Could show a prompt to the user to reload
      showUpdatePrompt();
    });

    wb.addEventListener('controlling', () => {
      console.log('Service Worker took control');
      // Reload the page when the new SW takes control
      window.location.reload();
    });

    wb.addEventListener('activated', (event) => {
      if (!event.isUpdate) {
        console.log('Service Worker activated for the first time');
      }
    });

    // Register the service worker
    const registration = await wb.register();
    console.log('Service Worker registered:', registration);

  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
}

/**
 * Show update prompt to user
 */
function showUpdatePrompt(): void {
  const shouldUpdate = confirm(
    'A new version of the app is available. Would you like to update?'
  );

  if (shouldUpdate && wb) {
    // Tell the waiting SW to skip waiting and take control
    wb.messageSkipWaiting();
  }
}

/**
 * Check for updates
 */
export async function checkForUpdates(): Promise<void> {
  if (wb) {
    await wb.update();
  }
}

/**
 * Unregister service worker (for development/debugging)
 */
export async function unregisterServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
  }
}

/**
 * Request persistent storage
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    console.log(`Persistent storage ${isPersisted ? 'granted' : 'denied'}`);
    return isPersisted;
  }
  return false;
}

/**
 * Check storage persistence
 */
export async function isStoragePersisted(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return navigator.storage.persisted();
  }
  return false;
}

/**
 * Get storage estimate
 */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (navigator.storage && navigator.storage.estimate) {
    return navigator.storage.estimate();
  }
  return null;
}