export type SyncOperationType = 'create' | 'update' | 'delete';
export type SyncEntityType = 'journal' | 'period' | 'user' | 'goal' | 'habit';
export type SyncStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface SyncOperationData {
  encryptedData?: string;
  iv?: string;
  [key: string]: unknown;
}

export interface SyncOperation {
  id: string;
  type: SyncOperationType;
  entity: SyncEntityType;
  entityId: string;
  data: SyncOperationData;
  timestamp: string;
  retryCount: number;
  status: SyncStatus;
  error?: string;
}

export interface SyncQueueStore {
  operations: SyncOperation[];
  lastSyncTimestamp: string | null;
  isSyncing: boolean;
}

class SyncQueueService {
  private queue: SyncOperation[] = [];
  private isOnline = true; // Default to true, will be updated on client
  private isSyncing = false;
  private maxRetries = 3;
  private syncListeners: Set<(queue: SyncOperation[]) => void> = new Set();
  private boundHandleOnline: (() => void) | null = null;
  private boundHandleOffline: (() => void) | null = null;
  
  constructor() {
    // Only add event listeners on client side
    if (typeof window !== 'undefined' && !process.env.VITEST) {
      this.isOnline = navigator.onLine;
      // Create bound handlers to ensure we can remove them later
      this.boundHandleOnline = this.handleOnline.bind(this);
      this.boundHandleOffline = this.handleOffline.bind(this);
      // Listen for online/offline events
      window.addEventListener('online', this.boundHandleOnline);
      window.addEventListener('offline', this.boundHandleOffline);
    }
  }
  
  private handleOnline() {
    this.isOnline = true;
    console.log('Network connection restored. Processing sync queue...');
    // Process sync queue in the background, handling any errors
    this.processSyncQueue().catch(error => {
      console.error('Error processing sync queue after coming online:', error);
    });
  }
  
  private handleOffline() {
    this.isOnline = false;
    console.log('Network connection lost. Operations will be queued.');
  }
  
  async addOperation(
    type: SyncOperationType,
    entity: SyncEntityType,
    entityId: string,
    data: SyncOperationData
  ): Promise<void> {
    const operation: SyncOperation = {
      id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      type,
      entity,
      entityId,
      data,
      timestamp: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };
    
    this.queue.push(operation);
    await this.persistQueue();
    this.notifyListeners();
    
    // Try to sync immediately if online
    if (this.isOnline && !this.isSyncing) {
      this.processSyncQueue();
    }
  }
  
  async processSyncQueue(): Promise<void> {
    // Use atomic check-and-set to prevent race condition
    if (this.isSyncing) {
      return;
    }
    
    this.isSyncing = true;
    
    // Re-check conditions after acquiring the lock
    if (!this.isOnline || this.queue.length === 0) {
      this.isSyncing = false;
      return;
    }
    
    try {
      const pendingOps = this.queue.filter(op => op.status === 'pending');
      
      for (const operation of pendingOps) {
        try {
          operation.status = 'syncing';
          await this.syncOperation(operation);
          operation.status = 'completed';
        } catch (error) {
          operation.retryCount++;
          operation.error = error instanceof Error ? error.message : 'Unknown error';
          
          if (operation.retryCount >= this.maxRetries) {
            operation.status = 'failed';
            console.error(`Operation ${operation.id} failed permanently:`, error);
          } else {
            operation.status = 'pending';
            console.warn(`Operation ${operation.id} failed, will retry:`, error);
          }
        }
      }
      
      // Remove completed operations
      this.queue = this.queue.filter(op => op.status !== 'completed');
      await this.persistQueue();
      this.notifyListeners();
      
    } finally {
      this.isSyncing = false;
    }
  }
  
  private async syncOperation(operation: SyncOperation): Promise<void> {
    // This is where actual sync logic would go
    // For now, we'll simulate it
    console.log('Syncing operation:', operation);
    
    // In a real implementation, this would:
    // 1. Encrypt the data if needed
    // 2. Send to the sync server (e.g., Appwrite)
    // 3. Handle conflict resolution
    // 4. Update local state with server response
    
    // Skip simulation in tests
    if (!process.env.VITEST) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Simulate occasional failures for testing
      if (Math.random() < 0.1 && operation.retryCount === 0) {
        throw new Error('Simulated network error');
      }
    }
  }
  
  async loadQueue(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('sync-queue');
      if (stored) {
        const data: SyncQueueStore = JSON.parse(stored);
        this.queue = data.operations || [];
      }
    } catch (error) {
      console.error('Failed to load sync queue:', error);
    }
  }
  
  private async persistQueue(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data: SyncQueueStore = {
        operations: this.queue,
        lastSyncTimestamp: new Date().toISOString(),
        isSyncing: this.isSyncing,
      };
      localStorage.setItem('sync-queue', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }
  
  getQueue(): SyncOperation[] {
    return [...this.queue];
  }
  
  getPendingCount(): number {
    return this.queue.filter(op => op.status === 'pending').length;
  }
  
  getFailedCount(): number {
    return this.queue.filter(op => op.status === 'failed').length;
  }
  
  clearFailedOperations(): void {
    this.queue = this.queue.filter(op => op.status !== 'failed');
    this.persistQueue();
    this.notifyListeners();
  }
  
  retryFailedOperations(): void {
    this.queue.forEach(op => {
      if (op.status === 'failed') {
        op.status = 'pending';
        op.retryCount = 0;
        op.error = undefined;
      }
    });
    this.persistQueue();
    this.notifyListeners();
    this.processSyncQueue();
  }
  
  onQueueChange(listener: (queue: SyncOperation[]) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.syncListeners.forEach(listener => listener(this.getQueue()));
  }
  
  isNetworkOnline(): boolean {
    return this.isOnline;
  }
  
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
  
  destroy(): void {
    if (typeof window !== 'undefined') {
      if (this.boundHandleOnline) {
        window.removeEventListener('online', this.boundHandleOnline);
        this.boundHandleOnline = null;
      }
      if (this.boundHandleOffline) {
        window.removeEventListener('offline', this.boundHandleOffline);
        this.boundHandleOffline = null;
      }
    }
    this.syncListeners.clear();
    this.queue = [];
  }
}

// Create a lazy-initialized singleton that only creates the instance on client
let syncQueueInstance: SyncQueueService | null = null;

function getSyncQueueInstance(): SyncQueueService {
  if (!syncQueueInstance && typeof window !== 'undefined') {
    syncQueueInstance = new SyncQueueService();
  }
  return syncQueueInstance || ({} as SyncQueueService);
}

// Export the actual class for testing
export { SyncQueueService };

// Create a proxy that delegates to the singleton instance
export const syncQueue = new Proxy({} as SyncQueueService, {
  get(target, prop) {
    const instance = getSyncQueueInstance();
    const value = instance[prop as keyof SyncQueueService];
    
    // If it's a function, bind it to the instance
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    
    return value;
  },
  set(target, prop, value) {
    const instance = getSyncQueueInstance();
    (instance as any)[prop] = value;
    return true;
  }
});