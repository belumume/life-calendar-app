import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SyncQueueService } from '../sync-queue';

describe('SyncQueueService', () => {
  let syncQueue: SyncQueueService;
  
  beforeEach(() => {
    // Clear localStorage mocks
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockImplementation(() => {});
    vi.mocked(localStorage.clear).mockImplementation(() => {});
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    
    // Create a fresh instance for each test
    syncQueue = new SyncQueueService();
  });
  
  afterEach(() => {
    vi.clearAllMocks();
    syncQueue.destroy();
  });
  
  describe('addOperation', () => {
    it('should add operation to queue', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-123', {
        content: 'Test entry',
        date: '2024-01-01'
      });
      
      const queue = syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0]).toMatchObject({
        type: 'create',
        entity: 'journal',
        entityId: 'entry-123',
        data: { content: 'Test entry', date: '2024-01-01' },
        status: 'pending',
        retryCount: 0
      });
    });
    
    it('should persist queue to localStorage', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      
      await syncQueue.addOperation('create', 'user', 'user-123', {
        birthDate: '1990-01-01'
      });
      
      expect(setItemSpy).toHaveBeenCalledWith(
        'sync-queue',
        expect.stringContaining('"operations":[{')
      );
    });
    
    it('should trigger sync when online', async () => {
      const processSpy = vi.spyOn(syncQueue as any, 'processSyncQueue');
      
      await syncQueue.addOperation('update', 'journal', 'entry-456', {
        content: 'Updated content'
      });
      
      expect(processSpy).toHaveBeenCalled();
    });
    
    it('should not trigger sync when offline', async () => {
      (navigator as any).onLine = false;
      (syncQueue as any).isOnline = false;
      
      const processSpy = vi.spyOn(syncQueue as any, 'processSyncQueue');
      
      await syncQueue.addOperation('create', 'journal', 'entry-789', {
        content: 'Offline entry'
      });
      
      expect(processSpy).not.toHaveBeenCalled();
    });
  });
  
  describe('processSyncQueue', () => {
    it('should process pending operations', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      // Add some operations
      await syncQueue.addOperation('create', 'journal', 'entry-1', { content: 'Entry 1' });
      await syncQueue.addOperation('create', 'journal', 'entry-2', { content: 'Entry 2' });
      
      // Mock the syncOperation method to succeed
      const syncSpy = vi.spyOn(syncQueue as any, 'syncOperation')
        .mockResolvedValue(undefined);
      
      // Set back online
      (syncQueue as any).isOnline = true;
      
      await syncQueue.processSyncQueue();
      
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(syncQueue.getQueue()).toHaveLength(0); // Should be cleared after success
    });
    
    it('should retry failed operations', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-fail', {
        content: 'Will fail'
      });
      
      // Mock syncOperation to fail first time, succeed second time
      let callCount = 0;
      vi.spyOn(syncQueue as any, 'syncOperation')
        .mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw new Error('Network error');
          }
          return Promise.resolve();
        });
      
      // Set back online
      (syncQueue as any).isOnline = true;
      
      // First attempt - should fail
      await syncQueue.processSyncQueue();
      let queue = syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].retryCount).toBe(1);
      expect(queue[0].status).toBe('pending');
      
      // Second attempt - should succeed
      await syncQueue.processSyncQueue();
      queue = syncQueue.getQueue();
      expect(queue).toHaveLength(0);
    });
    
    it('should mark operations as failed after max retries', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-fail', {
        content: 'Will fail permanently'
      });
      
      // Mock syncOperation to always fail
      vi.spyOn(syncQueue as any, 'syncOperation')
        .mockRejectedValue(new Error('Permanent failure'));
      
      // Set maxRetries to 3
      (syncQueue as any).maxRetries = 3;
      
      // Set back online
      (syncQueue as any).isOnline = true;
      
      // Process multiple times
      for (let i = 0; i < 4; i++) {
        await syncQueue.processSyncQueue();
      }
      
      const queue = syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].status).toBe('failed');
      expect(queue[0].retryCount).toBe(3);
    });
  });
  
  describe('loadQueue', () => {
    it('should load queue from localStorage', async () => {
      const mockData = {
        operations: [
          {
            id: 'op-123',
            type: 'create',
            entity: 'journal',
            entityId: 'entry-123',
            data: { content: 'Stored entry' },
            timestamp: '2024-01-01T00:00:00Z',
            retryCount: 0,
            status: 'pending'
          }
        ],
        lastSyncTimestamp: '2024-01-01T00:00:00Z',
        isSyncing: false
      };
      
      // Mock localStorage.getItem to return our test data
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(mockData));
      
      // Create a new instance to test loading
      const newSyncQueue = new SyncQueueService();
      await newSyncQueue.loadQueue();
      
      const queue = newSyncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityId).toBe('entry-123');
      
      newSyncQueue.destroy();
    });
    
    it('should handle corrupted localStorage data', async () => {
      // Mock localStorage.getItem to return invalid JSON
      vi.mocked(localStorage.getItem).mockReturnValue('invalid-json');
      
      // Create a new instance to test loading
      const newSyncQueue = new SyncQueueService();
      
      // Should not throw
      await expect(newSyncQueue.loadQueue()).resolves.not.toThrow();
      expect(newSyncQueue.getQueue()).toHaveLength(0);
      
      newSyncQueue.destroy();
    });
  });
  
  describe('queue management', () => {
    it('should get pending count correctly', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      // Directly modify the internal queue
      (syncQueue as any).queue[0].status = 'failed';
      
      expect(syncQueue.getPendingCount()).toBe(1);
    });
    
    it('should get failed count correctly', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      // Directly modify the internal queue
      (syncQueue as any).queue[0].status = 'failed';
      (syncQueue as any).queue[1].status = 'failed';
      
      expect(syncQueue.getFailedCount()).toBe(2);
    });
    
    it('should clear failed operations', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      // Directly modify the internal queue
      (syncQueue as any).queue[0].status = 'failed';
      (syncQueue as any).queue[1].status = 'pending';
      
      syncQueue.clearFailedOperations();
      
      expect(syncQueue.getQueue()).toHaveLength(1);
      expect(syncQueue.getQueue()[0].status).toBe('pending');
    });
    
    it('should retry failed operations', async () => {
      // Set offline to prevent auto-sync
      (syncQueue as any).isOnline = false;
      
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      
      // Directly modify the internal queue
      (syncQueue as any).queue[0].status = 'failed';
      (syncQueue as any).queue[0].retryCount = 2;
      (syncQueue as any).queue[0].error = 'Previous error';
      
      syncQueue.retryFailedOperations();
      
      const updatedQueue = syncQueue.getQueue();
      expect(updatedQueue[0].status).toBe('pending');
      expect(updatedQueue[0].retryCount).toBe(0);
      expect(updatedQueue[0].error).toBeUndefined();
    });
  });
  
  describe('listeners', () => {
    it('should notify listeners on queue change', async () => {
      const listener = vi.fn();
      const unsubscribe = syncQueue.onQueueChange(listener);
      
      await syncQueue.addOperation('create', 'journal', 'entry-123', {});
      
      expect(listener).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ entityId: 'entry-123' })
      ]));
      
      unsubscribe();
      
      // Should not be called after unsubscribe
      listener.mockClear();
      await syncQueue.addOperation('create', 'journal', 'entry-456', {});
      expect(listener).not.toHaveBeenCalled();
    });
  });
  
  describe('network status', () => {
    it('should handle online event', () => {
      // Create a new instance without VITEST check
      const originalEnv = process.env.VITEST;
      delete process.env.VITEST;
      
      const testSyncQueue = new SyncQueueService();
      (navigator as any).onLine = false;
      (testSyncQueue as any).isOnline = false;
      
      const processSpy = vi.spyOn(testSyncQueue as any, 'processSyncQueue');
      
      // Simulate online event
      (testSyncQueue as any).handleOnline();
      
      expect((testSyncQueue as any).isOnline).toBe(true);
      expect(processSpy).toHaveBeenCalled();
      
      testSyncQueue.destroy();
      process.env.VITEST = originalEnv;
    });
    
    it('should handle offline event', () => {
      // Create a new instance without VITEST check
      const originalEnv = process.env.VITEST;
      delete process.env.VITEST;
      
      const testSyncQueue = new SyncQueueService();
      (navigator as any).onLine = true;
      (testSyncQueue as any).isOnline = true;
      
      // Simulate offline event
      (testSyncQueue as any).handleOffline();
      
      expect((testSyncQueue as any).isOnline).toBe(false);
      
      testSyncQueue.destroy();
      process.env.VITEST = originalEnv;
    });
  });
});