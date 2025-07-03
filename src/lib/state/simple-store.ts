import { createStore } from "solid-js/store";
import type { User, JournalEntry, Goal, Habit, Period } from "../validation/schemas";

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

// Create store function that will be called inside components
export function createAppStore() {
  const [state, setState] = createStore(initialState);
  
  return {
    state,
    setState,
    // Simple initialization for now
    async initialize() {
      setState("isLoading", true);
      try {
        // For now, just check localStorage
        const userData = localStorage.getItem("user");
        if (userData) {
          setState("user", JSON.parse(userData));
        }
        setState("isInitialized", true);
      } catch (error) {
        console.error("Init error:", error);
        setState("error", "Failed to initialize");
      } finally {
        setState("isLoading", false);
      }
    }
  };
}