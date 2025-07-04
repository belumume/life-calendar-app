import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import SyncStatus from '../SyncStatus';
import { syncQueue } from '../../lib/sync/sync-queue';

// Mock sync queue
vi.mock('../../lib/sync/sync-queue', () => ({
  syncQueue: {
    getQueue: vi.fn(() => []),
    getPendingCount: vi.fn(() => 0),
    getFailedCount: vi.fn(() => 0),
    isNetworkOnline: vi.fn(() => true),
    isSyncInProgress: vi.fn(() => false),
    onQueueChange: vi.fn((callback) => {
      // Return unsubscribe function
      return () => {};
    }),
    processSyncQueue: vi.fn(),
    retryFailedOperations: vi.fn(),
    clearFailedOperations: vi.fn(),
  }
}));

describe('SyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows sync complete when no pending operations', () => {
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(0);
    vi.mocked(syncQueue.getFailedCount).mockReturnValue(0);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows pending count when operations are queued', () => {
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(3);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
  });

  it('shows syncing status when sync is in progress', () => {
    vi.mocked(syncQueue.isSyncInProgress).mockReturnValue(true);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/syncing/i)).toBeInTheDocument();
  });

  it('shows offline status when network is offline', () => {
    vi.mocked(syncQueue.isNetworkOnline).mockReturnValue(false);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
    expect(screen.getByText('⚫')).toBeInTheDocument();
  });

  it('shows failed count when operations have failed', () => {
    vi.mocked(syncQueue.getFailedCount).mockReturnValue(2);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('toggles details panel when clicked', async () => {
    render(() => <SyncStatus />);
    
    const statusButton = screen.getByRole('button');
    
    // Details should be hidden initially
    expect(screen.queryByText(/Sync Queue Details/i)).not.toBeInTheDocument();
    
    // Click to show details
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Sync Queue Details/i)).toBeInTheDocument();
    });
    
    // Click again to hide
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Sync Queue Details/i)).not.toBeInTheDocument();
    });
  });

  it('allows manual sync when online', async () => {
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(2);
    
    render(() => <SyncStatus />);
    
    // Open details
    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      const syncButton = screen.getByText(/Sync Now/i);
      expect(syncButton).toBeInTheDocument();
      expect(syncButton).not.toBeDisabled();
    });
    
    // Click sync button
    const syncButton = screen.getByText(/Sync Now/i);
    fireEvent.click(syncButton);
    
    expect(syncQueue.processSyncQueue).toHaveBeenCalled();
  });

  it('disables sync button when offline', async () => {
    vi.mocked(syncQueue.isNetworkOnline).mockReturnValue(false);
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(2);
    
    render(() => <SyncStatus />);
    
    // Open details
    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      const syncButton = screen.getByText(/Sync Now/i);
      expect(syncButton).toBeDisabled();
    });
  });

  it('allows retrying failed operations', async () => {
    vi.mocked(syncQueue.getFailedCount).mockReturnValue(2);
    
    render(() => <SyncStatus />);
    
    // Open details
    const statusButton = screen.getByRole('button');
    fireEvent.click(statusButton);
    
    await waitFor(() => {
      const retryButton = screen.getByText(/Retry Failed/i);
      expect(retryButton).toBeInTheDocument();
    });
    
    const retryButton = screen.getByText(/Retry Failed/i);
    fireEvent.click(retryButton);
    
    expect(syncQueue.retryFailedOperations).toHaveBeenCalled();
  });

  it('updates when queue changes', async () => {
    let queueChangeCallback: Function;
    vi.mocked(syncQueue.onQueueChange).mockImplementation((callback) => {
      queueChangeCallback = callback;
      return () => {};
    });
    
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(0);
    
    render(() => <SyncStatus />);
    
    expect(screen.getByText(/synced/i)).toBeInTheDocument();
    
    // Simulate queue change
    vi.mocked(syncQueue.getPendingCount).mockReturnValue(5);
    queueChangeCallback!([]);
    
    await waitFor(() => {
      expect(screen.getByText(/5 pending/i)).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', () => {
    render(() => <SyncStatus />);
    
    const statusButton = screen.getByRole('button');
    expect(statusButton).toHaveAttribute('aria-label', 'Sync status');
    expect(statusButton).toHaveAttribute('aria-expanded', 'false');
  });
});