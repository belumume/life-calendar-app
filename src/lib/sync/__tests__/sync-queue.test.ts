import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { syncQueue } from '../sync-queue';

describe('SyncQueueService', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    
    // Reset queue state
    (syncQueue as any).queue = [];
    (syncQueue as any).isSyncing = false;
    (syncQueue as any).isOnline = true;
    
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  describe('addOperation', () => {
    it('should add operation to queue', async () => {
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
      // Add some operations
      await syncQueue.addOperation('create', 'journal', 'entry-1', { content: 'Entry 1' });
      await syncQueue.addOperation('create', 'journal', 'entry-2', { content: 'Entry 2' });
      
      // Mock the syncOperation method to succeed
      const syncSpy = vi.spyOn(syncQueue as any, 'syncOperation')
        .mockResolvedValue(undefined);
      
      await syncQueue.processSyncQueue();
      
      expect(syncSpy).toHaveBeenCalledTimes(2);
      expect(syncQueue.getQueue()).toHaveLength(0); // Should be cleared after success
    });
    
    it('should retry failed operations', async () => {
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
      await syncQueue.addOperation('create', 'journal', 'entry-fail', {
        content: 'Will fail permanently'
      });
      
      // Mock syncOperation to always fail
      vi.spyOn(syncQueue as any, 'syncOperation')
        .mockRejectedValue(new Error('Permanent failure'));
      
      // Set maxRetries to 3
      (syncQueue as any).maxRetries = 3;
      
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
      
      localStorage.setItem('sync-queue', JSON.stringify(mockData));
      
      await syncQueue.loadQueue();
      
      const queue = syncQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].entityId).toBe('entry-123');
    });
    
    it('should handle corrupted localStorage data', async () => {
      localStorage.setItem('sync-queue', 'invalid-json');
      
      // Should not throw
      await expect(syncQueue.loadQueue()).resolves.not.toThrow();
      expect(syncQueue.getQueue()).toHaveLength(0);
    });
  });
  
  describe('queue management', () => {
    it('should get pending count correctly', async () => {
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      // Mark one as failed
      const queue = syncQueue.getQueue();
      queue[0].status = 'failed';
      
      expect(syncQueue.getPendingCount()).toBe(1);
    });
    
    it('should get failed count correctly', async () => {
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      // Mark both as failed
      const queue = syncQueue.getQueue();
      queue[0].status = 'failed';
      queue[1].status = 'failed';
      
      expect(syncQueue.getFailedCount()).toBe(2);
    });
    
    it('should clear failed operations', async () => {
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      await syncQueue.addOperation('create', 'journal', 'entry-2', {});
      
      const queue = syncQueue.getQueue();
      queue[0].status = 'failed';
      queue[1].status = 'pending';
      
      syncQueue.clearFailedOperations();
      
      expect(syncQueue.getQueue()).toHaveLength(1);
      expect(syncQueue.getQueue()[0].status).toBe('pending');
    });
    
    it('should retry failed operations', async () => {
      await syncQueue.addOperation('create', 'journal', 'entry-1', {});
      
      const queue = syncQueue.getQueue();
      queue[0].status = 'failed';
      queue[0].retryCount = 2;
      queue[0].error = 'Previous error';
      
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
      (navigator as any).onLine = false;
      (syncQueue as any).isOnline = false;
      
      const processSpy = vi.spyOn(syncQueue as any, 'processSyncQueue');
      
      // Simulate online event
      window.dispatchEvent(new Event('online'));
      
      expect((syncQueue as any).isOnline).toBe(true);
      expect(processSpy).toHaveBeenCalled();
    });
    
    it('should handle offline event', () => {
      (navigator as any).onLine = true;
      (syncQueue as any).isOnline = true;
      
      // Simulate offline event
      window.dispatchEvent(new Event('offline'));
      
      expect((syncQueue as any).isOnline).toBe(false);
    });
  });
});