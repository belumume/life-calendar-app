# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) that document important architectural decisions made during the development of the MyLife Calendar application.

## What is an ADR?

An Architecture Decision Record captures an important architectural decision made along with its context and consequences. ADRs help future developers understand why certain decisions were made.

## ADR Index

| ADR | Title | Status | Date |
|-----|-------|--------|------|
| [001](001-use-indexeddb-instead-of-sqlite.md) | Use IndexedDB Instead of SQLite | Accepted | 2025-01-04 |
| [002](002-encrypt-all-user-data.md) | Encrypt All User Data Types | Accepted | 2025-01-04 |
| [003](003-authentication-rate-limiting.md) | Implement Authentication Rate Limiting | Accepted | 2025-01-04 |
| [004](004-service-layer-refactoring.md) | Refactor Monolithic AppService | Accepted | 2025-01-04 |

## ADR Template

When creating a new ADR, use this template:

```markdown
# ADR-XXX: [Title]

## Status
[Proposed | Accepted | Deprecated | Superseded by ADR-XXX]

## Context
[What is the issue that we're seeing that is motivating this decision?]

## Decision
[What is the change that we're proposing and/or doing?]

## Consequences

### Positive
- [Positive consequence 1]
- [Positive consequence 2]

### Negative
- [Negative consequence 1]
- [Negative consequence 2]

### Mitigation
- [How to mitigate negative consequences]

## Notes
[Additional information, links, etc.]
```

## Contributing

When making significant architectural decisions:
1. Create a new ADR using the template
2. Number it sequentially (e.g., 005, 006)
3. Add it to the index above
4. Link related ADRs if superseding or relating to existing decisions