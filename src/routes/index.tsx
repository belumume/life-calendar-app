import { createSignal, onMount } from "solid-js";
import { Title } from "@solidjs/meta";

export default function Home() {
  const [hasStarted, setHasStarted] = createSignal(false);

  onMount(() => {
    // Check if user has already set up their calendar
    if (typeof window !== "undefined") {
      const birthDate = localStorage.getItem("birthDate");
      if (birthDate) {
        setHasStarted(true);
      }
    }
  });

  return (
    <main class="container">
      <Title>MyLife Calendar - Track Your Life Journey</Title>
      
      <div class="hero">
        <h1>MyLife Calendar</h1>
        <p class="tagline">Track your life journey, one week at a time</p>
        
        {!hasStarted() ? (
          <div class="setup-prompt">
            <h2>Welcome to Your Life Calendar</h2>
            <p>A private, local-first app to visualize your entire life and track what matters most.</p>
            <a href="/setup" class="btn-primary">Get Started</a>
          </div>
        ) : (
          <div class="dashboard-preview">
            <p>Welcome back! Your 88-day summer tracker awaits.</p>
            <a href="/period" class="btn-primary">Open Calendar</a>
          </div>
        )}
      </div>
      
      <section class="features">
        <h3>Your Data, Your Privacy</h3>
        <ul>
          <li>✓ All data stored locally on your device</li>
          <li>✓ End-to-end encryption for complete privacy</li>
          <li>✓ Works offline - no internet required</li>
          <li>✓ Export your data anytime</li>
        </ul>
      </section>
    </main>
  );
}