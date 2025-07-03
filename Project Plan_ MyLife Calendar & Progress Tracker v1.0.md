# **Project Plan & Roadmap: MyLife Calendar & Progress Tracker**

Version: 1.0  
Date: June 18, 2025

## **1\. Introduction**

### **1.1. Vision & Mission**

**Vision:** To create a personalized, private, and enduring digital companion that visually represents the entirety of a user's life, enabling them to track progress, cultivate self-awareness, and live more intentionally. The application is designed to evolve and adapt alongside its user across the span of decades, serving as a deeply personal and trustworthy digital artifact.

**Mission:** The mission is to deliver a state-of-the-art, local-first web application that empowers users with true ownership and privacy over their lifelong data. Starting with an intensive 88-day progress tracker, the app will expand to a full "Life in Weeks" calendar. It will seamlessly integrate goal setting, journaling, and personal analytics, all within a beautiful, intuitive, and highly customizable interface that remains flawless and relevant throughout the user's journey.

### **1.2. Goals & Objectives**

* **Primary Goal:** Launch a functional Minimum Viable Product (MVP) focused on the 88-day summer progress-tracking period, built on a local-first, privacy-centric architecture that is ready for lifelong expansion. The development process itself is a key summer achievement, with the final project being open-source.  
* **Key Objectives:**  
  * Develop a Progressive Web App (PWA) that is accessible, performant, and works seamlessly offline.  
  * Implement a "Life in Weeks" calendar as the core visualization, allowing users to see their entire life at a glance.  
  * Create a dedicated view for tracking the "88 days of summer," allowing for daily check-ins and notes to monitor "massive/substantial/mind-blowing/proud progress and achievements".  
  * Integrate a rich journaling module that supports text and multimedia, with all sensitive data protected by end-to-end encryption (E2EE).  
  * Build a flexible goal-setting and habit-tracking system that supports various methodologies and provides clear, motivating progress visualization.  
  * Ensure true data ownership by architecting the application as local-first, where user data resides primarily on their device, and provide a robust data export feature in open, durable formats.  
  * Design and implement a highly themeable and adaptive user interface that the user can personalize, ensuring long-term engagement and preventing visual fatigue.  
  * Establish a foundation for privacy-preserving personal analytics and AI-driven insights in future phases.  
  * Achieve high standards of performance, security, and long-term maintainability through a carefully selected, cutting-edge technology stack and robust development practices.

### **1.3. Scope**

* **In Scope (Phase 1 \- Core Local-First MVP):**  
  * Progressive Web App (PWA) shell with offline capabilities.  
  * Local database setup using SQLite.  
  * Core "Life in Weeks" and "88-Day Summer" grid visualizations.  
  * Basic journaling with text entry and an ability to mark days/weeks.  
  * Basic goal and habit tracking with manual entry.  
  * Implementation of end-to-end encryption for the local database (e.g., using SQLCipher).  
  * Secure multi-device data synchronization using a local-first sync engine (e.g., CRSQLite) and an open-source BaaS for auth/backup orchestration.  
  * A robust data export feature for all user data in an open format (e.g., JSON, Markdown).  
  * A simple, clean, and responsive user interface with basic theming (light/dark mode).  
  * Comprehensive testing (unit, integration, E2E).  
* **Out of Scope (Phase 1):**  
  * Advanced AI-powered insights and correlations.  
  * Social sharing or collaboration features.  
  * Complex integrations with third-party apps (e.g., external calendars, fitness trackers).  
  * An admin interface (as the app is single-user).  
  * Advanced gamification mechanics like narrative quests.  
* **Future Phases (Planned):**  
  * **Phase 2: Enhanced Tracking & Personalization:** Integration with external health/calendar APIs, advanced data visualizations (e.g., Year in Pixels), rich multimedia journaling, full UI theming and customization.  
  * **Phase 3: Insight & Reflection:** Implementation of privacy-preserving AI for non-obvious correlation detection, adaptive journaling prompts, and "Year in Review" data storytelling features.  
  * **Phase 4: Advanced Engagement:** Introduction of meaningful, psychology-backed gamification, resilience-building modules, and other positive psychology interventions.

## **2\. Guiding Principles & Development Methodology**

This project will adhere to a specific set of principles and a collaborative development model designed for efficiency, quality, and adaptability.

### **2.1. Collaboration Model ("Vibecoding")**

* **Human Role (User):** Acts as the project lead and visionary. Provides direction, makes final decisions on features and design, performs external setup (e.g., cloud services, API keys), and confirms/validates each incremental step.  
* **AI Role (Agent):** Acts as the expert senior engineer and architect. Takes decisive technical leadership, synthesizes context, creates detailed plans, executes plans incrementally, writes high-quality code, performs rigorous self-verification, and manages the end-to-end technical development flow.  
* **Interaction:** The process is collaborative but technically led by the AI. The user defines the "what" and "why," and the AI determines and executes the "how" through a transparent, step-by-step process, seeking confirmation at each stage.

### **2.2. Development Methodology**

* **Privacy by Design:** Security and privacy are not afterthoughts. The system will be built from the ground up with local-first and end-to-end encryption as core architectural tenets.  
* **Local-First Priority:** The application must be fully functional offline. Data resides on the user's device first, with synchronization being a secondary background process. This ensures performance, privacy, and true data ownership.  
* **Start Simple, Iterate Often:** Begin with a focused MVP for the 88-day goal and add features incrementally in well-defined phases. This iterative process allows for adaptation and refinement over the app's long life.  
* **Debugging-First Approach:** Prioritize testability, modularity, and clear data flow. Implement comprehensive testing at all levels (unit, integration, E2E) and run tests frequently.  
* **Incremental & Iterative Development:** Build the application modularly. Adhere to a strict plan-execute-verify-confirm cycle for every code change to ensure clarity and correctness.  
* **Context Synthesis:** Before any task, the AI agent must synthesize all available context from conversation history, project files, and this document to ensure alignment. Ambiguities must be resolved before proceeding.  
* **Structured Planning:** Detailed execution plans are mandatory before any non-trivial code change, outlining goals, files to be modified, step-by-step actions, and verification procedures.  
* **Rigorous Self-Verification:** The AI agent must self-review all code changes against the plan and quality standards before presenting them for confirmation, checking for correctness, maintainability, and potential errors.  
* **Code Quality & Standards:** Adhere to modern best practices for the chosen technology stack, including comprehensive type hinting, clear comments, robust error handling, and a focus on long-term maintainability.  
* **Documentation-Driven:** Maintain thorough and up-to-date documentation, including this project plan, detailed code comments, and a Project\_Summary.md file to track progress and decisions.

## **3\. Core Requirements**

### **3.1. Functional Requirements (FR)**

* **FR1:** The user shall be able to initialize their Life Calendar by providing their birth date.  
* **FR2:** The system shall display the user's life visualized as a grid of weeks ("Life in Weeks") and years. The user shall be able to filter and view this data by different time intervals (days, weeks, months, years, decades, custom ranges).  
* **FR3:** The system shall provide a dedicated view for the 88-day summer period or other user-defined periods, allowing daily interaction.  
* **FR4:** The user shall be able to add, edit, and view journal entries for any given day or week.  
* **FR5:** The user shall be able to define and track goals and habits, marking them as complete or logging progress.  
* **FR6:** The entire application must be functional offline, with all data interactions occurring with the local database.  
* **FR7:** All sensitive user data, especially journal entries, must be end-to-end encrypted on the user's device.  
* **FR8:** The system shall securely and automatically synchronize the encrypted local data across the user's other devices when a network connection is available.  
* **FR9:** The user shall be able to export their complete data set in an open, non-proprietary format (e.g., SQLite file, JSON, Markdown).  
* **FR10:** The user shall be able to customize the application's appearance through themes (e.g., colors, fonts, layout density).

### **3.2. Non-Functional Requirements (NFR)**

* **NFR1: Performance:** The UI must be highly responsive and fluid. Data interactions (reading/writing to the local DB) must feel instantaneous.  
* **NFR2: Security:** The application must implement state-of-the-art security practices, with E2EE and user key ownership as non-negotiable foundations.  
* **NFR3: Data Integrity & Durability:** There must be zero data loss. The synchronization mechanism must be robust and handle conflicts gracefully, and the data model must support evolution over decades.  
* **NFR4: Privacy:** The application will operate on a zero-knowledge basis for any cloud components. No unencrypted user data will ever be sent to a server.  
* **NFR5: Usability:** The interface must be intuitive, aesthetically pleasing, and require minimal onboarding to use effectively.  
* **NFR6: Maintainability:** The codebase must be clean, modular, well-documented, and use a technology stack that supports long-term maintenance by a solo developer.  
* **NFR7: Portability:** As a PWA, the app must run consistently across all modern desktop and mobile browsers.

### **3.3. Technical Requirements (TR)**

* **TR1: Frontend Framework:** SolidJS with SolidStart (PWA).  
* **TR2: Architecture:** Local-First.  
* **TR3: Local Database:** SQLite.  
* **TR4: Data Synchronization:** CRSQLite.  
* **TR5: Authentication & Backup Orchestration:** Appwrite (Open-Source BaaS).  
* **TR6: Encryption:** SQLCipher for local database E2EE; standard crypto libraries for in-flight data.  
* **TR7: Language:** TypeScript/JavaScript (SolidJS).  
* **TR8: Deployment:** Static Web Host (e.g., Netlify, Vercel, Cloudflare Pages) for the PWA; Serverless functions for any minimal backend logic.  
* **TR9: Dependency Management:** pnpm / npm.  
* **TR10: Testing:** Vitest (unit/integration), Playwright (E2E).

## **4\. Detailed Architecture & Technology**

### **4.1. Overall Architecture Diagram**

graph TD  
    subgraph User Device  
        subgraph PWA in Browser  
            UI\[UI Components (SolidJS)\]  
            Logic\[App Logic / State Management\]  
            ServiceWorker\[Service Worker (Offline, Sync)\]  
            UI \--\> Logic  
            Logic \--\> DB\_Access  
            ServiceWorker \--\> SyncClient  
        end  
        subgraph Local Data  
            DB\_Access\[SQLite Access Layer\] \--\> EncryptedDB\[(Encrypted SQLite DB\<br\>w/ CRSQLite)\]  
        end  
    end

    subgraph Cloud Infrastructure (Low-Maintenance)  
        subgraph Static Host (e.g., Vercel, Netlify)  
            PWA\_Assets\[Static PWA Assets (HTML, JS, CSS)\]  
        end

        subgraph BaaS (Appwrite \- Self-Hosted or Cloud)  
            AuthService\[Authentication Service\]  
            SyncServer\[Sync & Backup Orchestrator\]  
            SyncServer \-- Manages \--\> EncryptedBackupStore\[(Encrypted Data Blobs)\]  
        end  
    end

    UserDevice \-- HTTPs \--\> PWA\_Assets  
    SyncClient \-- Secure WebSocket \--\> SyncServer  
    UserDevice \-- Secure Auth Flow \--\> AuthService

    style EncryptedDB fill:\#f9f,stroke:\#333,stroke-width:2px  
    style EncryptedBackupStore fill:\#f9f,stroke:\#333,stroke-width:2px

### **4.2. Workflow Breakdown**

1. **First Launch & Setup:** The user opens the PWA. The app checks for a local database. If none exists, it prompts the user for their birth date and a strong passphrase. A new SQLite database is created locally, and the user's master encryption key is derived from the passphrase. The database is immediately encrypted using this key (e.g., via SQLCipher).  
2. **Normal Operation (Offline/Online):** The user opens the PWA. The app prompts for the passphrase to unlock and decrypt the local database for the session. All interactions (viewing weeks, adding journal entries, tracking goals) are read from and written to the local SQLite database instantly. This ensures the app is fast and fully functional offline.  
3. **Data Synchronization:** The Service Worker runs in the background. When a network connection is available, it establishes a secure connection to the Appwrite sync server. Using CRSQLite's capabilities, it sends only the encrypted changes (diffs) from the local database to the server. The server stores these encrypted blobs and propagates them to the user's other authenticated devices. At no point can the server read the data content.  
4. **Data Export:** The user initiates an export. The application logic reads the entire (decrypted in-memory) database and converts it into open formats (JSON, Markdown), which are then provided to the user as a downloadable file directly from the browser.

### **4.3. Technology Stack Summary**

* **Platform:** Progressive Web App (PWA)  
* **Frontend:** SolidJS with SolidStart (TypeScript)  
* **Local Database:** SQLite with SQLCipher (for E2EE)  
* **Data Sync Engine:** CRSQLite  
* **Backend-as-a-Service (BaaS):** Appwrite (for Auth & Sync Orchestration)  
* **Deployment:** Netlify / Vercel / Cloudflare Pages  
* **Testing:** Vitest, Playwright

## **5\. UI/UX Design**

The UI/UX will be clean, minimalist, and focused, acting as a calm, reflective space for the user.

* **Core Principles:** Intuitive Interaction, Clarity, Deep Personalization, Motivational Feedback, Narrative Cohesion.  
* **Key Views:**  
  * **Lifetime View:** The primary "Life in Weeks" grid. Users can zoom and pan. Past weeks are filled in, future weeks are empty. Significant life events can be annotated.  
  * **Period View:** A dedicated view for the "88-Day Summer" or other user-defined periods, showing a more detailed grid with daily status indicators.  
  * **Detail View:** A focused view for a single day or week, containing the journal editor, goal progress, and habit check-ins for that period.  
  * **Dashboard View:** A future-planned area for personal analytics, visualizations, and insights, filterable by various time intervals.  
* **Personalization:** The user will have full control over theming, including light/dark modes, custom color palettes, font choices, and information density. This allows the app to feel uniquely personal and avoid visual staleness over its long life.

## **6\. Deployment & Testing Strategy**

### **6.1. Deployment Strategy**

* **Frontend PWA:** The SolidJS application will be deployed to a static web hosting platform like Netlify or Vercel. Continuous Deployment will be set up via Git, where every push to the main branch triggers an automatic build and deployment.  
* **Backend BaaS:** Appwrite will be used for authentication and sync orchestration. This can be a managed cloud instance or self-hosted on a low-cost VPS for maximum control.  
* **Configuration:** All secrets (API keys, etc.) will be managed through the hosting provider's environment variables, never committed to the repository.

### **6.2. Testing Strategy**

* **Unit Testing (Vitest):** Individual UI components, utility functions, and state management logic will be tested in isolation.  
* **Integration Testing (Vitest):** The interaction between components and the local SQLite database access layer will be tested. The CRSQLite sync mechanism will have dedicated integration tests to verify data integrity.  
* **End-to-End Testing (Playwright):** Automated tests will simulate full user workflows in a real browser environment: creating a calendar, adding entries, checking offline functionality, and verifying data persistence. Encryption and decryption flows will be tested E2E.  
* **Manual Testing:** Rigorous self-testing will be performed for usability, visual polish, and exploratory bug hunting before each release.

## **7\. Development Roadmap**

This roadmap prioritizes establishing a secure, local-first foundation before expanding features.

* **Phase 0: Foundation & Setup (1 Week)**  
  * Initialize project repository, set up SolidJS (TypeScript) with Vitest.  
  * Design initial UI/UX wireframes for the core views (Life, Period, Detail).  
  * Set up deployment pipeline with Netlify/Vercel.  
  * Set up Appwrite project for auth/sync.  
* **Phase 1: Core Local MVP (3-4 Weeks)**  
  * **Goal:** Build a functional, offline-first 88-day tracker.  
  * Implement the PWA shell with a service worker for offline capability.  
  * Set up the local SQLite database (unencrypted for now).  
  * Build the UI for the 88-day grid view.  
  * Implement logic to add/edit/view simple text notes for each day.  
  * **Deliverable:** A usable local-only app for tracking the summer progress.  
* **Phase 2: Privacy & Sync (3-4 Weeks)**  
  * **Goal:** Secure the data and enable multi-device access.  
  * Integrate SQLCipher to add end-to-end encryption to the local SQLite database.  
  * Implement a robust passphrase-based key management system.  
  * Integrate CRSQLite and the Appwrite backend to enable secure, encrypted data synchronization.  
  * Thoroughly test the encryption and synchronization logic to ensure zero data corruption or loss.  
  * **Deliverable:** A secure, sync-enabled PWA.  
* **Phase 3: Feature Expansion & Lifelong View (3-4 Weeks)**  
  * **Goal:** Expand the app to its full "Life Calendar" vision.  
  * Implement the full "Life in Weeks" visualization.  
  * Build the comprehensive journaling module (rich text, tagging).  
  * Develop the foundational goal and habit-tracking system.  
  * Implement the UI theming and personalization engine.  
  * **Deliverable:** A feature-rich lifelong calendar application.  
* **Phase 4: Polish, Export & Open-Source (2 Weeks)**  
  * **Goal:** Refine the user experience and prepare for public release.  
  * Implement the "Export All Data" feature.  
  * Conduct extensive UX polishing and bug fixing.  
  * Write comprehensive documentation (README, user guide).  
  * Clean up the codebase and publish it as an open-source project.  
  * **Deliverable:** A production-ready, open-source v1.0 of the MyLife Calendar app.

## **8\. Documentation & Security**

### **8.1. Documentation Strategy**

* **Project Plan (This Document):** The living source of truth for the project's vision, architecture, and roadmap.  
* **Code Comments:** Code will be thoroughly commented, explaining the "why" behind complex logic, especially in areas like encryption and data synchronization.  
* **README.md:** A comprehensive guide covering the project's purpose, features, setup instructions for developers, and deployment process.  
* **Project\_Summary.md:** A critical file updated incrementally after each work session, summarizing progress, key decisions, and next steps.

### **8.2. Security Considerations**

* **End-to-End Encryption:** This is the cornerstone of the security model. All user-generated content will be encrypted at rest on the device and in transit using a key only the user possesses.  
* **Zero-Knowledge Backend:** The Appwrite sync server will only ever handle encrypted blobs of data, ensuring it has zero knowledge of the user's content.  
* **Key Management:** The user's master key will be derived from a strong passphrase and will not be stored anywhere. The responsibility of remembering this passphrase will be clearly communicated to the user as essential for data access.  
* **Input Validation:** All user inputs will be validated to prevent injection attacks or other vulnerabilities.  
* **Dependency Security:** Dependencies will be regularly scanned for known vulnerabilities using tools like npm audit.  
* **PWA Security:** The app will be served exclusively over HTTPS. The service worker will be configured securely.

## **9\. AI Agent Collaboration Rules (For IDE Integration)**

\# MyLife Calendar Project Rules (v1.0)

\#\# Core Directives

1. **Context Synthesis (CRITICAL):** Before **any** new task, synthesize context. Review the **entire** conversation history, this Project Plan, the Project\_Summary.md file, and relevant code files. Output a brief \<context\_summary\> listing the task goal, key files involved (e.g., UI Components, State Logic, DB Access, Sync Service), and critical constraints (e.g., Local-First, E2EE, Offline). **Ask specific clarifying questions** if context is insufficient. **Do not assume.**  
2. **Structured Planning & Incremental Execution:** **Always create a detailed execution plan** within \<plan\> tags. The plan must include a Goal, Files to be modified, numbered Steps, and Verification procedures. **Execute ONLY the FIRST step** of the plan. Present the code change (diff preferred). **Explicitly ask for user confirmation** before proceeding to the next step.  
3. **Focused, Explained Edits:** Make **minimal, targeted changes** per plan step. Use clear comments to explain the 'why' of the change.  
4. **Code Quality & Robustness:** Adhere to **SolidJS/TypeScript** best practices. Use type hinting extensively. Write clear comments, especially for encryption, sync logic, and state management. Implement robust error handling. Prioritize correctness, maintainability, and readability.  
5. **Rigorous Self-Verification:** **After coding EACH step and BEFORE presenting**, self-review the change. Check for correctness, quality, and adherence to the plan. Correct issues before presenting.  
6. **Decisive Recommendations:** When multiple valid approaches exist, **recommend the best one**, explaining the reasoning (considering performance, security, maintainability). Be decisive unless seeking user preference.  
7. **Testing After Each Step:** After implementing a significant feature, propose specific tests (unit, integration, or E2E) to verify functionality.  
8. **Clear Division of Responsibilities:** The AI agent is responsible for all code implementation and local testing. The user will handle external services (Appwrite setup, DNS, etc.) and validate the final user experience.

\#\# Project-Specific Rules

9. **Technology Stack:** Adhere strictly: **SolidJS (TypeScript), SQLite, CRSQLite, Appwrite, PWA, Vitest, Playwright**.  
10. **Architecture:** All features must adhere to the **Local-First** and **End-to-End Encrypted** architecture. The local database is the source of truth; the backend is only for auth and sync.  
11. **User Experience:** Prioritize a fast, fluid, and intuitive user experience. Performance is a key feature.  
12. **Documentation Maintenance:** **CRITICAL:** At the end of each significant work session, **incrementally update the Project\_Summary.md file** with progress, decisions, and next steps. Ask for confirmation after updating.

## **10\. Conclusion**

This project plan outlines a comprehensive and robust strategy for creating the "MyLife Calendar & Progress Tracker." By prioritizing a local-first, privacy-by-design architecture and leveraging a modern, high-performance technology stack, this plan sets the stage for building an application that is not only functional but also trustworthy and enduring. The iterative, phased roadmap ensures that initial value is delivered quickly for the 88-day summer goal, while building the solid foundation required for a truly lifelong digital companion. Success will be defined by rigorous adherence to these principles, continuous testing, and a disciplined collaborative development process.