import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryHistory } from "@solidjs/router";
import Home from "../index";

// Mock the store module
vi.mock("../../lib/state/store", () => ({
  appState: {
    user: null,
    isAuthenticated: false,
    isInitialized: false,
    error: null,
    journalEntries: [],
    currentPeriod: null,
    goals: [],
    habits: [],
    isLoading: false,
  },
  checkUserExists: vi.fn().mockResolvedValue(false),
  initializeApp: vi.fn().mockResolvedValue(true),
}));

describe("Home Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the main heading", async () => {
    const { getByText } = render(() => <Home />);
    
    await waitFor(() => {
      expect(getByText("MyLife Calendar")).toBeInTheDocument();
    });
  });

  it("shows the tagline", async () => {
    const { getByText } = render(() => <Home />);
    
    await waitFor(() => {
      expect(getByText("Track your life journey, one week at a time")).toBeInTheDocument();
    });
  });

  it("displays privacy features", async () => {
    const { getByText } = render(() => <Home />);
    
    await waitFor(() => {
      expect(getByText("Your Data, Your Privacy")).toBeInTheDocument();
    });
  });

  it("shows setup prompt for new users", async () => {
    const { getByText } = render(() => <Home />);
    
    await waitFor(() => {
      expect(getByText("Welcome to Your Life Calendar")).toBeInTheDocument();
      expect(getByText("Get Started")).toBeInTheDocument();
    });
  });
});