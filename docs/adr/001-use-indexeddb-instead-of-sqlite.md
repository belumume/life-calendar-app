# ADR-001: Use IndexedDB Instead of SQLite

## Status
Accepted

## Context
The original project plan specified using SQLite with SQLCipher for local storage and CRSQLite for sync. However, the current implementation uses IndexedDB for all local storage needs.

## Decision
We will continue using IndexedDB as the primary local storage solution instead of migrating to SQLite.

## Consequences

### Positive
- **Browser Native**: IndexedDB is natively supported in all modern browsers without additional dependencies
- **No WASM Required**: Avoids the complexity and size overhead of SQLite WASM builds
- **Simpler Deployment**: No need for special server configurations or WASM support
- **Good Performance**: IndexedDB provides adequate performance for the application's needs
- **Existing Implementation**: Significant work already done with IndexedDB

### Negative
- **No SQL Queries**: Limited to key-value operations, making complex queries more difficult
- **Sync Complexity**: CRSQLite's CRDT-based sync would have provided better conflict resolution
- **Less Mature Tooling**: SQLite has better debugging and analysis tools
- **Size Limitations**: IndexedDB has browser-specific storage limits (though generous)

### Mitigation
- Implement robust sync queue with conflict resolution strategies
- Use compound indexes for common query patterns
- Monitor storage usage and implement cleanup strategies
- Consider migration path if requirements change

## Notes
This decision represents a significant deviation from the original plan but is pragmatic given the current implementation's maturity and the complexity of implementing SQLite in a browser environment.