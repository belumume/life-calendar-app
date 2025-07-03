import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { syncQueue } from "../lib/sync/sync-queue";

export default function SyncStatus() {
  const [isOnline, setIsOnline] = createSignal(syncQueue.isNetworkOnline());
  const [pendingCount, setPendingCount] = createSignal(0);
  const [failedCount, setFailedCount] = createSignal(0);
  const [isSyncing, setIsSyncing] = createSignal(false);
  const [showDetails, setShowDetails] = createSignal(false);
  
  let unsubscribe: (() => void) | null = null;
  
  onMount(() => {
    // Update counts
    const updateStatus = () => {
      setPendingCount(syncQueue.getPendingCount());
      setFailedCount(syncQueue.getFailedCount());
      setIsSyncing(syncQueue.isSyncInProgress());
    };
    
    // Subscribe to queue changes
    unsubscribe = syncQueue.onQueueChange(() => {
      updateStatus();
    });
    
    // Update online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial update
    updateStatus();
    
    onCleanup(() => {
      unsubscribe?.();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  });
  
  const totalCount = () => pendingCount() + failedCount();
  
  const handleRetry = () => {
    syncQueue.retryFailedOperations();
  };
  
  const handleClearFailed = () => {
    if (confirm('Clear all failed sync operations? This data will not be synced.')) {
      syncQueue.clearFailedOperations();
    }
  };
  
  return (
    <div class="sync-status">
      <button
        class="sync-status-indicator"
        onClick={() => setShowDetails(!showDetails())}
        title="Sync Status"
      >
        <Show
          when={isOnline()}
          fallback={<span class="status-icon offline">📵</span>}
        >
          <Show
            when={totalCount() === 0}
            fallback={
              <Show
                when={failedCount() > 0}
                fallback={
                  <span class="status-icon syncing">
                    {isSyncing() ? '🔄' : '⏳'} {pendingCount()}
                  </span>
                }
              >
                <span class="status-icon error">⚠️ {failedCount()}</span>
              </Show>
            }
          >
            <span class="status-icon synced">✅</span>
          </Show>
        </Show>
      </button>
      
      <Show when={showDetails()}>
        <div class="sync-details-popup">
          <div class="sync-details-header">
            <h3>Sync Status</h3>
            <button
              class="close-button"
              onClick={() => setShowDetails(false)}
            >
              ×
            </button>
          </div>
          
          <div class="sync-details-content">
            <div class="sync-status-item">
              <span class="label">Network:</span>
              <span class={`value ${isOnline() ? 'online' : 'offline'}`}>
                {isOnline() ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <Show when={pendingCount() > 0}>
              <div class="sync-status-item">
                <span class="label">Pending:</span>
                <span class="value">{pendingCount()} operations</span>
              </div>
            </Show>
            
            <Show when={failedCount() > 0}>
              <div class="sync-status-item error">
                <span class="label">Failed:</span>
                <span class="value">{failedCount()} operations</span>
              </div>
            </Show>
            
            <Show when={isSyncing()}>
              <div class="sync-status-item">
                <span class="label">Status:</span>
                <span class="value">Syncing...</span>
              </div>
            </Show>
            
            <Show when={!isOnline()}>
              <p class="sync-message">
                Your changes will be synced when you're back online.
              </p>
            </Show>
            
            <Show when={failedCount() > 0}>
              <div class="sync-actions">
                <button
                  class="btn-secondary"
                  onClick={handleRetry}
                  disabled={!isOnline()}
                >
                  Retry Failed
                </button>
                <button
                  class="btn-danger"
                  onClick={handleClearFailed}
                >
                  Clear Failed
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}