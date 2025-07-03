import { createStore } from "solid-js/store";
import type { User, JournalEntry, Goal, Habit, Period } from "../../types";

interface AppState {
  user: User | null;
  currentPeriod: Period | null;
  journalEntries: JournalEntry[];
  goals: Goal[];
  habits: Habit[];
  isLoading: boolean;
  isInitialized: boolean;
}

const initialState: AppState = {
  user: null,
  currentPeriod: null,
  journalEntries: [],
  goals: [],
  habits: [],
  isLoading: false,
  isInitialized: false,
};

export const [appState, setAppState] = createStore(initialState);

// Helper functions for state management
export const initializeUser = (birthDate: string) => {
  const user: User = {
    id: crypto.randomUUID(),
    birthDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  setAppState("user", user);
  
  // Initialize 88-day period
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 87); // 88 days total
  
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
  
  // Save to localStorage for now (will be replaced with SQLite)
  if (typeof window !== "undefined") {
    localStorage.setItem("birthDate", birthDate);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("currentPeriod", JSON.stringify(period));
  }
};

export const addJournalEntry = (entry: Omit<JournalEntry, "id" | "createdAt" | "updatedAt">) => {
  const newEntry: JournalEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  setAppState("journalEntries", [...appState.journalEntries, newEntry]);
  
  // Save to localStorage (temporary)
  if (typeof window !== "undefined") {
    localStorage.setItem("journalEntries", JSON.stringify(appState.journalEntries));
  }
};

export const toggleGoal = (goalId: string) => {
  setAppState("goals", (goal) => goal.id === goalId, "completed", (c) => !c);
  setAppState("goals", (goal) => goal.id === goalId, "completedAt", new Date());
};