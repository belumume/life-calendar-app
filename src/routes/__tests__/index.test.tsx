import { render, waitFor } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { Router } from "@solidjs/router";
import Home from "../index";

// Mock window and localStorage for tests
vi.stubGlobal('window', {
  ...window,
  localStorage: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }
});

describe("Home Page", () => {
  it("renders the main heading", async () => {
    const { getByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));
    
    await waitFor(() => {
      expect(getByText("MyLife Calendar")).toBeInTheDocument();
    });
  });

  it("shows the tagline", async () => {
    const { getByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));
    
    await waitFor(() => {
      expect(getByText("Track your life journey, one week at a time")).toBeInTheDocument();
    });
  });

  it("displays welcome message for new users", async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue(null);
    
    const { getByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));
    
    await waitFor(() => {
      expect(getByText("Welcome to Your Life Calendar")).toBeInTheDocument();
    });
  });

  it("shows dashboard for existing users", async () => {
    vi.mocked(window.localStorage.getItem).mockReturnValue("1990-01-01");
    
    const { getByText } = render(() => (
      <Router>
        <Home />
      </Router>
    ));
    
    await waitFor(() => {
      expect(getByText("Your Life Journey")).toBeInTheDocument();
    });
  });
});