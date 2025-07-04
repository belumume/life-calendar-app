import { Show } from "solid-js";
import { A } from "@solidjs/router";
import { useApp } from "../lib/context/AppContext";

export default function Home() {
  const app = useApp();

  return (
    <main class="container">
      <Show when={!app.isLoading()} fallback={<div class="loading">Loading...</div>}>
        <div class="hero">
          <h1>MyLife Calendar</h1>
          <p class="tagline">Track your life journey, one week at a time</p>
          
          <Show 
            when={!app.user()}
            fallback={
              <Show
                when={app.isAuthenticated()}
                fallback={
                  <div class="dashboard-preview">
                    <h2>Your Life Journey</h2>
                    <p>Welcome back! Please unlock your calendar to continue.</p>
                    <div class="home-nav">
                      <A href="/login" class="btn-primary">Unlock Calendar</A>
                    </div>
                  </div>
                }
              >
                <div class="dashboard-preview">
                  <h2>Your Life Journey</h2>
                  <p>Welcome back! Your life calendar is ready.</p>
                  <div class="home-nav">
                    <A href="/period" class="btn-primary">88-Day Tracker</A>
                    <A href="/life" class="btn-secondary">Life Calendar</A>
                  </div>
                </div>
              </Show>
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