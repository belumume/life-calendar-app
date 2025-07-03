import { createStore } from "solid-js/store";
import { createSignal } from "solid-js";
import type { User, JournalEntry, Goal, Habit, Period } from "../../types";
import { 
  initializeDatabaseService, 
  getDatabaseService,
  isDatabaseServiceInitialized,
  closeDatabaseService,
  type DatabaseService 
} from "../db";
import { initializeCrypto, clearCrypto, getCryptoService } from "../encryption/crypto";

interface AppState {
  user: User | null;
  currentPeriod: Period | null;
  journalEntries: JournalEntry[];
  goals: Goal[];
  habits: Habit[];
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AppState = {
  user: null,
  currentPeriod: null,
  journalEntries: [],
  goals: [],
  habits: [],
  isLoading: false,
  isInitialized: false,
  isAuthenticated: false,
  error: null,
};

export const [appState, setAppState] = createStore(initialState);

// Signal for passphrase (stored in memory only)
const [passphrase, setPassphrase] = createSignal<string | null>(null);

let dbService: DatabaseService | null = null;

/**
 * Initialize the app with database and encryption
 */
export async function initializeApp(userPassphrase?: string): Promise<boolean> {
  setAppState("isLoading", true);
  setAppState("error", null);

  try {
    // Initialize database service with encryption if passphrase provided
    dbService = await initializeDatabaseService(userPassphrase);
    
    // Check if we have an existing user
    const user = await dbService.users.findFirst();
    
    if (user) {
      setAppState("user", user);
      
      if (userPassphrase) {
        setPassphrase(userPassphrase);
        setAppState("isAuthenticated", true);
        
        // Load user data
        await loadUserData();
      }
    }
    
    setAppState("isInitialized", true);
    return true;
  } catch (error) {
    console.error("Failed to initialize app:", error);
    setAppState("error", error instanceof Error ? error.message : "Failed to initialize");
    return false;
  } finally {
    setAppState("isLoading", false);
  }
}

/**
 * Authenticate with passphrase (for existing users)
 */
export async function authenticate(userPassphrase: string): Promise<boolean> {
  if (!dbService || !appState.user) {
    setAppState("error", "No user found");
    return false;
  }

  try {
    // Initialize encryption with passphrase
    await initializeCrypto(userPassphrase);
    
    // Try to load some data to verify passphrase is correct
    await loadUserData();
    
    setPassphrase(userPassphrase);
    setAppState("isAuthenticated", true);
    setAppState("error", null);
    
    return true;
  } catch (error) {
    console.error("Authentication failed:", error);
    setAppState("error", "Invalid passphrase");
    clearCrypto();
    return false;
  }
}

/**
 * Load user data from database
 */
async function loadUserData(): Promise<void> {
  if (!dbService || !appState.user) return;

  try {
    // Load journal entries
    const entries = await dbService.journal.findByUserId(appState.user.id);
    setAppState("journalEntries", entries);
    
    // TODO: Load periods, goals, habits when repositories are ready
    // const periods = await dbService.periods.findByUserId(appState.user.id);
    // const goals = await dbService.goals.findByUserId(appState.user.id);
    // const habits = await dbService.habits.findByUserId(appState.user.id);
    
  } catch (error) {
    console.error("Failed to load user data:", error);
    throw error; // Re-throw to handle in authenticate
  }
}

/**
 * Initialize a new user
 */
export async function initializeUser(birthDate: string, userPassphrase: string): Promise<boolean> {
  if (!dbService) {
    await initializeApp();
    dbService = getDatabaseService();
  }

  try {
    // Initialize encryption
    await initializeCrypto(userPassphrase);
    setPassphrase(userPassphrase);
    
    // Create user
    const user = await dbService.users.create({ birthDate });
    setAppState("user", user);
    
    // Create initial 88-day period
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 87); // 88 days total
    
    // TODO: Create period when repository is ready
    const period: Period = {
      id: crypto.randomUUID(),
      name: "88 Days of Summer",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalDays: 88,
      description: "Transform your summer with focused progress tracking",
    };
    
    setAppState("currentPeriod", period);
    setAppState("isInitialized", true);
    setAppState("isAuthenticated", true);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize user:", error);
    setAppState("error", error instanceof Error ? error.message : "Failed to create user");
    return false;
  }
}

/**
 * Add a journal entry
 */
export async function addJournalEntry(
  entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt" | "userId">
): Promise<JournalEntry | null> {
  if (!dbService || !appState.user || !appState.isAuthenticated) {
    setAppState("error", "Not authenticated");
    return null;
  }

  try {
    const newEntry = await dbService.journal.create({
      ...entry,
      userId: appState.user.id,
    });
    
    setAppState("journalEntries", [...appState.journalEntries, newEntry]);
    return newEntry;
  } catch (error) {
    console.error("Failed to add journal entry:", error);
    setAppState("error", "Failed to save entry");
    return null;
  }
}

/**
 * Update a journal entry
 */
export async function updateJournalEntry(
  id: string, 
  updates: Partial<JournalEntry>
): Promise<boolean> {
  if (!dbService || !appState.isAuthenticated) {
    setAppState("error", "Not authenticated");
    return false;
  }

  try {
    const updated = await dbService.journal.update(id, updates);
    if (updated) {
      setAppState("journalEntries", 
        entry => entry.id === id, 
        updated
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to update journal entry:", error);
    setAppState("error", "Failed to update entry");
    return false;
  }
}

/**
 * Delete a journal entry
 */
export async function deleteJournalEntry(id: string): Promise<boolean> {
  if (!dbService || !appState.isAuthenticated) {
    setAppState("error", "Not authenticated");
    return false;
  }

  try {
    const deleted = await dbService.journal.delete(id);
    if (deleted) {
      setAppState("journalEntries", 
        appState.journalEntries.filter(e => e.id !== id)
      );
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to delete journal entry:", error);
    setAppState("error", "Failed to delete entry");
    return false;
  }
}

/**
 * Toggle goal completion
 */
export function toggleGoal(goalId: string) {
  const goal = appState.goals.find(g => g.id === goalId);
  if (goal) {
    setAppState("goals", 
      g => g.id === goalId, 
      "completed", 
      !goal.completed
    );
    
    setAppState("goals", 
      g => g.id === goalId, 
      "completedAt", 
      goal.completed ? undefined : new Date()
    );
    
    // TODO: Update in database when goal repository is ready
  }
}

/**
 * Lock the app (clear passphrase from memory)
 */
export function lockApp() {
  setPassphrase(null);
  setAppState("isAuthenticated", false);
  clearCrypto();
}

/**
 * Reset the app (for logout or clearing data)
 */
export async function resetApp() {
  lockApp();
  closeDatabaseService();
  dbService = null;
  setAppState(initialState);
}

/**
 * Check if user exists
 */
export async function checkUserExists(): Promise<boolean> {
  if (!dbService) {
    await initializeApp();
    dbService = getDatabaseService();
  }
  
  return dbService.users.exists();
}