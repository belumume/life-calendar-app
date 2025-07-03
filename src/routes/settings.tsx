import { createSignal, Show, createEffect, onMount, onCleanup } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { appService } from "../lib/services/app-service";
import { exportService } from "../lib/services/export-service";
import { useApp } from "../lib/context/AppContext";
import { syncQueue } from "../lib/sync/sync-queue";

export default function Settings() {
  const app = useApp();
  const navigate = useNavigate();
  
  const [isExporting, setIsExporting] = createSignal(false);
  const [exportError, setExportError] = createSignal<string | null>(null);
  const [exportSuccess, setExportSuccess] = createSignal<string | null>(null);
  
  // Sync status
  const [pendingSync, setPendingSync] = createSignal(0);
  const [failedSync, setFailedSync] = createSignal(0);
  const [isOnline, setIsOnline] = createSignal(syncQueue.isNetworkOnline());
  
  let unsubscribe: (() => void) | null = null;
  
  // Redirect if not authenticated
  createEffect(() => {
    if (!app.isLoading() && !app.user()) {
      navigate("/");
    } else if (!app.isLoading() && app.user() && !app.isAuthenticated()) {
      navigate("/login");
    }
  });
  
  onMount(() => {
    // Subscribe to sync queue changes
    unsubscribe = syncQueue.onQueueChange(() => {
      setPendingSync(syncQueue.getPendingCount());
      setFailedSync(syncQueue.getFailedCount());
    });
    
    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial sync status
    setPendingSync(syncQueue.getPendingCount());
    setFailedSync(syncQueue.getFailedCount());
    
    onCleanup(() => {
      unsubscribe?.();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    });
  });

  const handleExportJSON = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      await exportService.exportAndDownloadJSON();
      setExportSuccess("Data exported successfully as JSON!");
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);

    try {
      await exportService.exportAndDownloadMarkdown();
      setExportSuccess("Data exported successfully as Markdown!");
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    const confirmed = window.confirm(
      "⚠️ WARNING: This will permanently delete all your data including journal entries. This action cannot be undone. Are you sure?"
    );

    if (!confirmed) return;

    const doubleConfirmed = window.confirm(
      "Are you absolutely certain? All your journal entries and progress will be lost forever."
    );

    if (!doubleConfirmed) return;

    try {
      await appService.clearAllData();
      navigate("/");
    } catch (error) {
      console.error("Failed to clear data:", error);
      setExportError("Failed to clear data");
    }
  };

  const handleLogout = async () => {
    await app.logout();
    navigate("/");
  };

  return (
    <main class="container">
      <Show when={!app.isLoading()} fallback={<div class="loading">Loading settings...</div>}>
        <div class="settings-container">
          <header class="view-header">
            <A href="/" class="back-link">← Back</A>
            <h1>Settings</h1>
          </header>

          <Show when={app.user()}>
            <section class="settings-section">
              <h2>Account Information</h2>
              <div class="info-item">
                <strong>Birth Date:</strong> {new Date(app.user()!.birthDate).toLocaleDateString()}
              </div>
              <div class="info-item">
                <strong>Account Created:</strong> {new Date(app.user()!.createdAt).toLocaleDateString()}
              </div>
            </section>
          </Show>

          <section class="settings-section">
            <h2>Export Your Data</h2>
            <p class="section-description">
              Download all your data in an open format. Your data belongs to you.
            </p>
            
            <div class="export-buttons">
              <button
                class="btn-primary"
                onClick={handleExportJSON}
                disabled={isExporting()}
              >
                {isExporting() ? "Exporting..." : "Export as JSON"}
              </button>
              
              <button
                class="btn-secondary"
                onClick={handleExportMarkdown}
                disabled={isExporting()}
              >
                {isExporting() ? "Exporting..." : "Export as Markdown"}
              </button>
            </div>

            <Show when={exportSuccess()}>
              <p class="success-message">{exportSuccess()}</p>
            </Show>

            <Show when={exportError()}>
              <p class="error-message">{exportError()}</p>
            </Show>

            <div class="export-info">
              <h3>What's included in the export?</h3>
              <ul>
                <li>All journal entries (decrypted)</li>
                <li>Your goals and milestones</li>
                <li>Your habits and completion history</li>
                <li>Your periods and progress</li>
                <li>Account information (except passwords)</li>
              </ul>
              <p class="privacy-note">
                🔒 Your passphrase and encryption keys are never exported for security.
              </p>
            </div>
          </section>

          <section class="settings-section">
            <h2>Sync Status</h2>
            <p class="section-description">
              Track your offline changes and sync status. Changes are automatically synced when online.
            </p>
            
            <div class="info-item">
              <strong>Network Status:</strong>{' '}
              <span class={isOnline() ? 'online' : 'offline'}>
                {isOnline() ? '🟢 Online' : '🔴 Offline'}
              </span>
            </div>
            
            <Show when={pendingSync() > 0}>
              <div class="info-item">
                <strong>Pending Sync:</strong> {pendingSync()} operations
              </div>
            </Show>
            
            <Show when={failedSync() > 0}>
              <div class="info-item error">
                <strong>Failed Sync:</strong> {failedSync()} operations
                <div style={{ "margin-top": "0.5rem" }}>
                  <button
                    class="btn-secondary"
                    onClick={() => syncQueue.retryFailedOperations()}
                    disabled={!isOnline()}
                  >
                    Retry Failed
                  </button>
                  <button
                    class="btn-danger"
                    onClick={() => {
                      if (confirm('Clear all failed sync operations? This data will not be synced.')) {
                        syncQueue.clearFailedOperations();
                      }
                    }}
                    style={{ "margin-left": "0.5rem" }}
                  >
                    Clear Failed
                  </button>
                </div>
              </div>
            </Show>
            
            <Show when={pendingSync() === 0 && failedSync() === 0}>
              <p class="success-message">✅ All changes are synced</p>
            </Show>
            
            <div class="sync-info">
              <h3>How sync works:</h3>
              <ul>
                <li>Changes are saved locally first</li>
                <li>When online, changes sync automatically</li>
                <li>Your data is encrypted before syncing</li>
                <li>Sync happens in the background</li>
              </ul>
            </div>
          </section>

          <section class="settings-section">
            <h2>Account Actions</h2>
            
            <button
              class="btn-secondary"
              onClick={handleLogout}
            >
              Log Out
            </button>

            <div class="danger-zone">
              <h3>Danger Zone</h3>
              <p class="warning-text">
                This action is permanent and cannot be undone.
              </p>
              <button
                class="btn-danger"
                onClick={handleClearData}
              >
                Delete All Data
              </button>
            </div>
          </section>
        </div>
      </Show>
    </main>
  );
}