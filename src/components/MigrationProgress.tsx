import { createSignal, onMount, Show, For } from "solid-js";
import { migrationService } from "../lib/migration/migration-service";
import type { MigrationStatus, MigrationResult } from "../lib/migration/migration-types";

export default function MigrationProgress() {
  const [status, setStatus] = createSignal<MigrationStatus | null>(null);
  const [result, setResult] = createSignal<MigrationResult | null>(null);
  const [error, setError] = createSignal<string | null>(null);
  const [showDetails, setShowDetails] = createSignal(false);

  onMount(async () => {
    // Check if migration is needed
    const migrationStatus = await migrationService.checkMigrationStatus();
    setStatus(migrationStatus);

    if (migrationStatus.isRequired && !migrationStatus.isComplete) {
      // Subscribe to progress updates
      const unsubscribe = migrationService.onProgress((newStatus) => {
        setStatus({ ...newStatus });
      });

      // Start migration automatically
      try {
        const migrationResult = await migrationService.performMigration();
        setResult(migrationResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Migration failed');
      }

      unsubscribe();
    }
  });

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div class="migration-container">
      <Show when={status()?.isRequired && !status()?.isComplete && !error()}>
        <div class="migration-progress">
          <h2>🚀 Upgrading Your Database</h2>
          <p class="migration-description">
            We're upgrading your database to improve performance and enable new features. 
            This is a one-time process that ensures your data remains secure and accessible.
          </p>
          
          <div class="progress-info">
            <p class="current-step">{status()?.currentStep}</p>
            <div class="progress-bar">
              <div 
                class="progress-fill"
                style={{ width: `${status()?.progress || 0}%` }}
              />
            </div>
            <p class="progress-text">
              {status()?.progress?.toFixed(0)}% Complete
            </p>
          </div>

          <div class="migration-features">
            <h3>What's being upgraded:</h3>
            <ul>
              <li>✨ Faster data access and search</li>
              <li>🔒 Enhanced encryption for better security</li>
              <li>📱 Preparation for multi-device sync</li>
              <li>🚀 Improved performance for large datasets</li>
            </ul>
          </div>

          <p class="migration-note">
            ⚠️ Please don't close this window during the upgrade.
          </p>
        </div>
      </Show>

      <Show when={result()}>
        <div class="migration-complete">
          <h2>✅ Upgrade Complete!</h2>
          <p class="success-message">
            Your database has been successfully upgraded in {formatDuration(result()!.duration)}.
          </p>

          <div class="migration-stats">
            <h3>Migration Summary:</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">Journal Entries</span>
                <span class="stat-value">{result()!.migratedCount.entries}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Goals</span>
                <span class="stat-value">{result()!.migratedCount.goals}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Habits</span>
                <span class="stat-value">{result()!.migratedCount.habits}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Periods</span>
                <span class="stat-value">{result()!.migratedCount.periods}</span>
              </div>
            </div>
          </div>

          <Show when={result()!.errors.length > 0}>
            <div class="migration-warnings">
              <h3>⚠️ Some items couldn't be migrated:</h3>
              <button 
                class="btn-secondary"
                onClick={() => setShowDetails(!showDetails())}
              >
                {showDetails() ? 'Hide' : 'Show'} Details
              </button>
              
              <Show when={showDetails()}>
                <div class="error-details">
                  <For each={result()!.errors}>
                    {(error) => (
                      <div class="error-item">
                        <span class="error-type">{error.type}</span>
                        <span class="error-message">{error.error}</span>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </div>
          </Show>

          <div class="migration-actions">
            <button 
              class="btn-primary"
              onClick={() => window.location.reload()}
            >
              Continue to App
            </button>
            <button 
              class="btn-secondary"
              onClick={() => migrationService.exportBackupFile()}
            >
              Download Backup
            </button>
          </div>
        </div>
      </Show>

      <Show when={error()}>
        <div class="migration-error">
          <h2>❌ Upgrade Failed</h2>
          <p class="error-message">
            We encountered an error during the upgrade process:
          </p>
          <div class="error-details">
            <code>{error()}</code>
          </div>
          <p class="error-note">
            Don't worry - your data is safe and unchanged. You can try again or continue using the app normally.
          </p>
          
          <div class="error-actions">
            <button 
              class="btn-primary"
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
            <button 
              class="btn-secondary"
              onClick={() => migrationService.exportBackupFile()}
            >
              Export Data Backup
            </button>
            <a 
              href="/settings"
              class="btn-secondary"
            >
              Continue Without Upgrade
            </a>
          </div>
        </div>
      </Show>

      <Show when={!status()?.isRequired}>
        <div class="migration-not-required">
          <p>Database migration is not required at this time.</p>
        </div>
      </Show>
    </div>
  );
}