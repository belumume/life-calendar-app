# Performance Optimization Guide

## Current Performance Considerations

### 1. Encryption/Decryption Overhead

**Issue**: Every data access requires decryption, which can be slow for large datasets.

**Current Mitigations**:
- Decrypt data only when needed (lazy loading)
- Cache decrypted data in memory during session

**Future Optimizations**:
```typescript
// Implement a decryption cache
class DecryptionCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private maxAge = 5 * 60 * 1000; // 5 minutes
  
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}
```

### 2. IndexedDB Query Performance

**Issue**: No SQL-like queries, must load and filter in memory.

**Current Approach**:
- Use indexes on commonly queried fields (userId, date, status)
- Implement pagination for large datasets

**Optimizations**:
```typescript
// Create compound indexes for common queries
const db = await openDB('mylife-calendar-db', version, {
  upgrade(db) {
    // Journal entries by user and date
    const journalStore = db.createObjectStore('entries', { keyPath: 'id' });
    journalStore.createIndex('userId-date', ['userId', 'date']);
    
    // Goals by user and status
    const goalStore = db.createObjectStore('goals', { keyPath: 'id' });
    goalStore.createIndex('userId-status', ['userId', 'status']);
  }
});
```

### 3. Bundle Size Optimization

**Current Status**:
- Main app bundle: ~126KB (gzipped: ~35KB)
- Reasonable for a PWA

**Further Optimizations**:
1. **Code Splitting by Route**:
   ```typescript
   // Lazy load heavy components
   const Settings = lazy(() => import('./routes/settings'));
   const Statistics = lazy(() => import('./routes/statistics'));
   ```

2. **Tree Shaking Unused Encryption Algorithms**:
   ```typescript
   // Only import what we use
   import { encrypt, decrypt } from './crypto/aes-gcm';
   // Don't import: import * as crypto from './crypto';
   ```

3. **Service Worker Caching Strategy**:
   ```javascript
   // Cache first for static assets
   self.addEventListener('fetch', event => {
     if (event.request.destination === 'script' || 
         event.request.destination === 'style') {
       event.respondWith(
         caches.match(event.request).then(response => 
           response || fetch(event.request)
         )
       );
     }
   });
   ```

### 4. Memory Management

**Issue**: Decrypted data can accumulate in memory.

**Solutions**:
1. **Implement LRU Cache**:
   ```typescript
   class LRUCache<T> {
     private maxSize: number;
     private cache: Map<string, T>;
     
     constructor(maxSize: number) {
       this.maxSize = maxSize;
       this.cache = new Map();
     }
     
     get(key: string): T | undefined {
       const value = this.cache.get(key);
       if (value) {
         // Move to end (most recently used)
         this.cache.delete(key);
         this.cache.set(key, value);
       }
       return value;
     }
     
     set(key: string, value: T): void {
       if (this.cache.size >= this.maxSize) {
         // Remove least recently used
         const firstKey = this.cache.keys().next().value;
         this.cache.delete(firstKey);
       }
       this.cache.set(key, value);
     }
   }
   ```

2. **Cleanup on Route Changes**:
   ```typescript
   onCleanup(() => {
     // Clear component-specific caches
     journalCache.clear();
   });
   ```

### 5. Rendering Performance

**Current**: SolidJS is already very efficient.

**Additional Optimizations**:
1. **Virtual Scrolling for Long Lists**:
   ```typescript
   import { VirtualList } from '@tanstack/solid-virtual';
   
   <VirtualList
     data={entries}
     rowHeight={100}
     overscan={5}
     renderItem={(item) => <JournalEntry {...item} />}
   />
   ```

2. **Debounce Search Inputs**:
   ```typescript
   const [searchTerm, setSearchTerm] = createSignal('');
   const debouncedSearch = debounce((term: string) => {
     performSearch(term);
   }, 300);
   ```

### 6. Sync Performance

**Current**: Queue-based sync with retry logic.

**Optimizations**:
1. **Batch Operations**:
   ```typescript
   // Instead of syncing one at a time
   async function batchSync(operations: SyncOperation[]) {
     const batches = chunk(operations, 10); // 10 operations per batch
     for (const batch of batches) {
       await syncBatch(batch);
     }
   }
   ```

2. **Delta Sync**:
   ```typescript
   // Only sync changes since last sync
   interface DeltaSync {
     lastSyncTimestamp: string;
     changes: Array<{
       entity: string;
       id: string;
       fields: string[]; // Only changed fields
       data: any;
     }>;
   }
   ```

## Monitoring Performance

### 1. Web Vitals
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Log or send to analytics service
  console.log(metric.name, metric.value);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 2. Custom Performance Marks
```typescript
// Measure encryption performance
performance.mark('encryption-start');
const encrypted = await encrypt(data);
performance.mark('encryption-end');
performance.measure('encryption', 'encryption-start', 'encryption-end');

const measure = performance.getEntriesByName('encryption')[0];
console.log(`Encryption took ${measure.duration}ms`);
```

### 3. Memory Monitoring
```typescript
if ('memory' in performance) {
  setInterval(() => {
    const memory = (performance as any).memory;
    console.log({
      totalJSHeapSize: memory.totalJSHeapSize,
      usedJSHeapSize: memory.usedJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit
    });
  }, 10000);
}
```

## Performance Budgets

Set and monitor performance budgets:

| Metric | Budget | Current |
|--------|---------|---------|
| First Load JS | < 150KB | ~126KB ✅ |
| FCP | < 1.5s | TBD |
| LCP | < 2.5s | TBD |
| TTI | < 3.5s | TBD |
| CLS | < 0.1 | TBD |

## Testing Performance

### 1. Lighthouse CI
```bash
npm install -g @lhci/cli
lhci autorun
```

### 2. Bundle Analysis
```bash
npm run build -- --analyze
```

### 3. Load Testing
```typescript
// Test with large datasets
async function loadTest() {
  console.time('Create 1000 entries');
  for (let i = 0; i < 1000; i++) {
    await createJournalEntry({
      content: `Test entry ${i}`,
      mood: 'good',
      tags: ['test', 'performance']
    });
  }
  console.timeEnd('Create 1000 entries');
  
  console.time('Load and decrypt all');
  const entries = await getJournalEntries();
  console.timeEnd('Load and decrypt all');
  console.log(`Loaded ${entries.length} entries`);
}
```

## Recommendations Priority

1. **High Priority**:
   - Implement decryption cache
   - Add virtual scrolling for journal entries
   - Optimize bundle with code splitting

2. **Medium Priority**:
   - Batch sync operations
   - Add compound indexes
   - Implement LRU cache for components

3. **Low Priority**:
   - Delta sync
   - Web Workers for encryption
   - WebAssembly for crypto operations

Remember: Profile first, optimize second. SolidJS is already very efficient, so many React-style optimizations are unnecessary.