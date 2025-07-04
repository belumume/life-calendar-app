# MyLife Calendar & Progress Tracker

A privacy-focused, local-first Progressive Web App for lifelong personal tracking, journaling, and self-reflection.

## 🎯 Vision

To create a personalized, private, and enduring digital companion that visually represents the entirety of a user's life, enabling them to track progress, cultivate self-awareness, and live more intentionally.

## 🔒 Privacy First

- **Local-First Architecture**: All data stored locally on your device
- **End-to-End Encryption**: Your data is encrypted with your passphrase
- **Zero-Knowledge Sync**: Optional multi-device sync without exposing data
- **Data Ownership**: Export all your data anytime in open formats

## 🚀 Key Features (Planned)

### Phase 1 - MVP
- 📅 88-day summer progress tracker
- 📝 Daily journaling and notes
- 🎯 Goal and habit tracking
- 📱 Works offline as a PWA

### Future Phases
- 📊 "Life in Weeks" visualization - see your entire life at a glance
- 🎨 Fully customizable themes and layouts
- 🔄 Secure multi-device synchronization
- 📈 Privacy-preserving personal analytics
- 🗓️ Flexible time period tracking (days, weeks, months, years)

## 🛠️ Technology Stack

- **Frontend**: SolidJS with SolidStart (TypeScript)
- **Database**: IndexedDB with Web Crypto API encryption
- **Sync**: Custom sync queue with conflict resolution
- **Backend**: Appwrite (planned for authentication & sync)
- **Platform**: Progressive Web App (PWA)

## 📋 Project Status

**Current Phase**: Active Development - Phase 2 Complete

The application has a working implementation with:
- ✅ User authentication with passphrase
- ✅ Encrypted journal entries
- ✅ Goal and habit tracking (with encryption)
- ✅ Theme customization
- ✅ PWA functionality
- ✅ Offline support
- ✅ Data export capabilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Development
```bash
# Clone the repository
git clone https://github.com/yourusername/life-calendar-app.git
cd life-calendar-app

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm run test:unit        # Unit tests
npm run test:e2e         # E2E tests (requires browsers)
npm run typecheck        # TypeScript checking

# Build for production
npm run build
```

### First Time Setup
1. Open http://localhost:3000
2. Create an account with your birth date and a secure passphrase
3. Start tracking your life!

## 🗺️ Development Roadmap

1. **Phase 0**: ✅ Foundation & Setup (Complete)
2. **Phase 1**: ✅ Core Local MVP - 88-day tracker (Complete)
3. **Phase 2**: ✅ Privacy & Sync implementation (Complete)
4. **Phase 3**: 🚧 Full Life Calendar features (In Progress)
5. **Phase 4**: 📅 Polish & Open Source release (Planned)

## 🤝 Contributing

This project will be open-sourced after the initial development phases. Stay tuned for contribution guidelines.

## 📄 License

This project will be released under an open-source license (TBD).

## 📚 Documentation

- [Project Plan](Project%20Plan_%20MyLife%20Calendar%20%26%20Progress%20Tracker%20v1.0.md) - Comprehensive project specification
- [CLAUDE.md](CLAUDE.md) - Development guidelines for AI assistance
- [Development Status](DEVELOPMENT_STATUS.md) - Current implementation status
- [Architecture Decision Records](docs/adr/) - Key architectural decisions
- [Performance Optimization](docs/PERFORMANCE_OPTIMIZATION.md) - Performance guidelines
- [Security Best Practices](docs/SECURITY_BEST_PRACTICES.md) - Security implementation guide
- [E2E Testing Guide](e2e/README.md) - End-to-end testing documentation

## 🔐 Security

Security and privacy are fundamental to this project. If you discover any security issues, please report them responsibly.

---

*Building a tool for lifelong use - designed to grow with you over decades.*