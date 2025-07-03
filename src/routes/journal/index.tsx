import { createSignal, onMount, createEffect, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useApp } from "../../lib/context/AppContext";
import { appService } from "../../lib/services/app-service";
import JournalList from "../../components/JournalList";

export default function JournalPage() {
  const navigate = useNavigate();
  const app = useApp();
  
  const [totalEntries, setTotalEntries] = createSignal(0);
  const [currentStreak, setCurrentStreak] = createSignal(0);
  const [longestStreak, setLongestStreak] = createSignal(0);
  const [isLoading, setIsLoading] = createSignal(true);
  
  // Redirect if not authenticated
  createEffect(() => {
    if (!app.isLoading() && !app.user()) {
      navigate("/");
    } else if (!app.isLoading() && app.user() && !app.isAuthenticated()) {
      navigate("/login");
    }
  });
  
  // Calculate journal statistics
  onMount(async () => {
    if (!app.isAuthenticated()) return;
    
    try {
      const entries = await appService.getJournalEntries();
      setTotalEntries(entries.length);
      
      // Calculate streaks
      if (entries.length > 0) {
        // Sort entries by day number
        const sortedEntries = [...entries].sort((a, b) => a.dayNumber - b.dayNumber);
        
        // Calculate current streak
        let current = 0;
        const today = new Date();
        for (let i = sortedEntries.length - 1; i >= 0; i--) {
          const entryDate = new Date(sortedEntries[i].date);
          const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === current) {
            current++;
          } else {
            break;
          }
        }
        setCurrentStreak(current);
        
        // Calculate longest streak
        let longest = 0;
        let tempStreak = 1;
        for (let i = 1; i < sortedEntries.length; i++) {
          if (sortedEntries[i].dayNumber - sortedEntries[i - 1].dayNumber === 1) {
            tempStreak++;
          } else {
            longest = Math.max(longest, tempStreak);
            tempStreak = 1;
          }
        }
        longest = Math.max(longest, tempStreak);
        setLongestStreak(longest);
      }
    } catch (err) {
      console.error("Failed to load journal statistics:", err);
    } finally {
      setIsLoading(false);
    }
  });
  
  return (
    <main class="journal-page">
      <Title>Journal - MyLife Calendar</Title>
      
      <header class="journal-header">
        <div>
          <A href="/period" class="back-link">← Back</A>
          <h1>My Journal</h1>
        </div>
        <div class="header-actions">
          <A href="/settings" class="icon-link" title="Settings">⚙️</A>
        </div>
      </header>
      
      <Show when={!isLoading()} fallback={<div class="loading">Loading journal...</div>}>
        <div class="journal-stats">
          <div class="stat-card">
            <h3>Total Entries</h3>
            <div class="stat-value">{totalEntries()}</div>
          </div>
          <div class="stat-card">
            <h3>Current Streak</h3>
            <div class="stat-value">{currentStreak()} days</div>
          </div>
          <div class="stat-card">
            <h3>Longest Streak</h3>
            <div class="stat-value">{longestStreak()} days</div>
          </div>
        </div>
        
        <section>
          <h2>All Entries</h2>
          <JournalList pageSize={10} />
        </section>
      </Show>
    </main>
  );
}