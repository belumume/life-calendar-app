import { createSignal, onMount, Show } from "solid-js";
import { A } from "@solidjs/router";
import { appService } from "../lib/services/app-service";

export default function Home() {
  const [isLoading, setIsLoading] = createSignal(true);
  const [hasUser, setHasUser] = createSignal(false);

  onMount(async () => {
    try {
      await appService.initialize();
      
      // Check both IndexedDB and localStorage for backward compatibility
      if (appService.hasUser() || localStorage.getItem("birthDate")) {
        setHasUser(true);
      }
    } catch (error) {
      console.error("Failed to initialize:", error);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <main class="container">
      <Show when={!isLoading()} fallback={<div class="loading">Loading...</div>}>
        <div class="hero">
          <h1>MyLife Calendar</h1>
          <p class="tagline">Track your life journey, one week at a time</p>
          
          <Show 
            when={!hasUser()}
            fallback={
              <div class="dashboard-preview">
                <h2>Your Life Journey</h2>
                <p>Welcome back! Please unlock your calendar to continue.</p>
                <div class="home-nav">
                  <A href="/login" class="btn-primary">Unlock Calendar</A>
                  <A href="/period" class="btn-secondary">88-Day Tracker</A>
                </div>
              </div>
            }
          >
            <div class="setup-prompt">
              <h2>Welcome to Your Life Calendar</h2>
              <p>A private, local-first app to visualize your entire life and track what matters most.</p>
              <A href="/setup" class="btn-primary">Get Started</A>
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
      </Show>
    </main>
  );
}