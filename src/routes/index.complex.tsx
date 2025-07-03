import { createSignal, onMount, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { useNavigate } from "@solidjs/router";
import { appState, checkUserExists, initializeApp } from "../lib/state/store";

export default function Home() {
  const [isLoading, setIsLoading] = createSignal(true);
  const [initError, setInitError] = createSignal<string | null>(null);
  const navigate = useNavigate();

  onMount(async () => {
    try {
      // Initialize app and check for existing user
      await initializeApp();
      setIsLoading(false);
      
      // If user exists but not authenticated, redirect to login
      if (appState.user && !appState.isAuthenticated) {
        // TODO: Create login page
      }
    } catch (error) {
      console.error("Failed to initialize app:", error);
      setInitError(error instanceof Error ? error.message : "Failed to initialize");
      setIsLoading(false);
    }
  });

  return (
    <main class="container">
      
      <Show when={!isLoading()} fallback={<div class="loading">Loading...</div>}>
        <Show when={initError()}>
          <div class="error-message">
            <h2>Initialization Error</h2>
            <p>{initError()}</p>
            <button onClick={() => window.location.reload()}>Reload</button>
          </div>
        </Show>
        <div class="hero">
          <h1>MyLife Calendar</h1>
          <p class="tagline">Track your life journey, one week at a time</p>
          
          <Show 
            when={!appState.user}
            fallback={
              <div class="dashboard-preview">
                <h2>Your Life Journey</h2>
                <Show 
                  when={appState.isAuthenticated}
                  fallback={
                    <div>
                      <p>Please enter your passphrase to unlock your calendar.</p>
                      <button class="btn-primary" onClick={() => navigate("/login")}>
                        Unlock Calendar
                      </button>
                    </div>
                  }
                >
                  <p>Welcome back! Your life calendar is ready.</p>
                  <div class="home-nav">
                    <a href="/period" class="btn-primary">88-Day Tracker</a>
                    <a href="/life" class="btn-secondary">Life Calendar</a>
                  </div>
                </Show>
              </div>
            }
          >
            <div class="setup-prompt">
              <h2>Welcome to Your Life Calendar</h2>
              <p>A private, local-first app to visualize your entire life and track what matters most.</p>
              <a href="/setup" class="btn-primary">Get Started</a>
            </div>
          </Show>
        </div>
        
        <section class="features">
          <h3>Your Data, Your Privacy</h3>
          <ul>
            <li>✓ All data encrypted locally on your device</li>
            <li>✓ Your passphrase never leaves your device</li>
            <li>✓ Works offline - no internet required</li>
            <li>✓ Export your data anytime</li>
          </ul>
        </section>
        
        <Show when={appState.error}>
          <p class="error-message">{appState.error}</p>
        </Show>
      </Show>
    </main>
  );
}