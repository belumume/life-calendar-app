# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **MyLife Calendar & Progress Tracker** - a privacy-focused, local-first Progressive Web App (PWA) for lifelong personal tracking and journaling. Currently in the planning phase with comprehensive documentation but no code implementation yet.

## Technology Stack (Planned)

- **Frontend**: SolidJS with SolidStart (TypeScript)
- **Local Database**: SQLite with SQLCipher (E2E encryption)
- **Data Sync**: CRSQLite
- **Backend**: Appwrite (auth & sync orchestration)
- **Testing**: Vitest (unit/integration), Playwright (E2E)
- **Package Manager**: pnpm or npm
- **Deployment**: Static hosting (Netlify/Vercel/Cloudflare Pages)

## Project Initialization Commands

When starting development, use these commands to set up the SolidJS project:

```bash
# Initialize SolidJS project with SolidStart
npm create solid@latest life-calendar-app
# Select: SolidStart, TypeScript, Vitest

# Install additional dependencies
npm install @solidjs/router solid-js
npm install -D vitest @vitest/ui @solidjs/testing-library
npm install -D @playwright/test
npm install -D typescript @types/node

# SQLite and encryption
npm install better-sqlite3 @types/better-sqlite3
npm install sqlcipher # For E2E encryption

# PWA dependencies
npm install -D vite-plugin-pwa workbox-window
```

## Development Commands (Once Initialized)

```bash
# Development server
npm run dev

# Run tests
npm run test        # Unit/integration tests with Vitest
npm run test:e2e    # E2E tests with Playwright

# Build for production
npm run build

# Type checking
npm run typecheck

# Linting (to be configured)
npm run lint
```

## Architecture Guidelines

### Local-First Principles
- All data operations must work offline
- Local SQLite database is the source of truth
- Sync is a background process, not required for functionality
- User data is E2E encrypted before leaving the device

### Directory Structure (to be created)
```
/src
  /components      # Reusable UI components
  /routes         # SolidStart route components
  /lib            # Core business logic
    /db           # Database access layer
    /sync         # CRSQLite sync logic
    /encryption   # E2E encryption utilities
  /state          # Global state management
  /styles         # Theming and styles
/public           # Static assets, PWA manifest
/tests
  /unit          # Vitest unit tests
  /e2e           # Playwright E2E tests
```

### Key Implementation Notes

1. **Database Setup**: Initialize SQLite with SQLCipher immediately. Never store unencrypted user data.

2. **PWA Configuration**: Service worker must cache all assets and enable full offline functionality.

3. **State Management**: Use SolidJS reactive primitives (createSignal, createStore) for local state. Global state should be minimal and derived from the database.

4. **Testing Strategy**: 
   - Test database operations with in-memory SQLite
   - Mock Appwrite sync during tests
   - E2E tests should verify offline functionality

5. **Security First**:
   - Derive encryption key from user passphrase using PBKDF2
   - Never send unencrypted data to any server
   - Validate all inputs to prevent injection attacks

## Development Phases

Currently preparing for **Phase 0: Foundation & Setup**. The project plan defines these phases:

1. **Phase 0**: Project setup, UI wireframes, deployment pipeline
2. **Phase 1**: Core local MVP - 88-day tracker (offline-only)
3. **Phase 2**: Add E2E encryption and multi-device sync
4. **Phase 3**: Full "Life in Weeks" view, journaling, goals
5. **Phase 4**: Polish, data export, open-source release

## Important Project Context

- Building an 88-day summer progress tracker as the initial MVP
- Expanding to full "Life in Weeks" calendar visualization
- Must support decades of use - prioritize maintainability
- User owns their data - implement robust export functionality
- Zero-knowledge architecture - server never sees unencrypted data

Refer to `Project Plan_ MyLife Calendar & Progress Tracker v1.0.md` for complete requirements and architectural details.