import { createSignal, For, Show, onMount, createMemo, createEffect } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { appService } from "../../lib/services/app-service";
import type { JournalEntry } from "../../lib/validation/schemas";
import { JournalContentSchema, sanitizeForDisplay } from "../../lib/validation/input-schemas";
import { z } from "zod";
import { useApp } from "../../lib/context/AppContext";

export default function PeriodView() {
  const navigate = useNavigate();
  const app = useApp();
  
  const [dailyNote, setDailyNote] = createSignal("");
  const [entries, setEntries] = createSignal<JournalEntry[]>([]);
  const [currentPeriod, setCurrentPeriod] = createSignal<any>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  
  // Redirect if not authenticated
  createEffect(() => {
    if (!app.isLoading() && !app.user()) {
      navigate("/");
    } else if (!app.isLoading() && app.user() && !app.isAuthenticated()) {
      navigate("/login");
    }
  });
  
  // Load data when authenticated
  onMount(async () => {
    if (!app.isAuthenticated()) return;
    
    try {
      
      // Load current period and entries
      const period = await appService.getCurrentPeriod();
      setCurrentPeriod(period);
      
      const journalEntries = await appService.getJournalEntries();
      setEntries(journalEntries);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  });

  // Calculate current day based on period start date
  const currentDay = createMemo(() => {
    const period = currentPeriod();
    if (!period) return 1;
    
    const start = new Date(period.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays + 1, period.totalDays || 88);
  });
  
  const totalDays = () => currentPeriod()?.totalDays || 88;
  const progress = () => (currentDay() / totalDays()) * 100;
  const weeksCount = Math.ceil(totalDays() / 7);

  const getDayStatus = (day: number) => {
    if (day < currentDay()) return "completed";
    if (day === currentDay()) return "current";
    return "future";
  };

  const handleAddNote = async () => {
    if (!dailyNote().trim() || isSubmitting()) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      // Validate journal content
      const validatedContent = JournalContentSchema.parse(dailyNote());
      
      const entry = await appService.addJournalEntry(validatedContent, currentDay());
      setEntries([...entries(), entry]);
      setDailyNote("");
    } catch (err) {
      console.error("Failed to add note:", err);
      if (err instanceof z.ZodError) {
        setError(err.errors[0].message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save entry");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="period-view">
      <Show when={!isLoading()} fallback={<div class="loading">Loading your journey...</div>}>
        <header class="view-header">
          <A href="/" class="back-link">← Back</A>
          <h1>{currentPeriod()?.name || "88 Days of Summer"}</h1>
          <div class="header-actions">
            <A href="/life" class="icon-link" title="Life Calendar">📅</A>
            <A href="/settings" class="icon-link" title="Settings">⚙️</A>
          </div>
        </header>

      <div class="progress-section">
        <p class="progress-text">
          Progress: Day {currentDay()} of {totalDays()} ({progress().toFixed(0)}%)
        </p>
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${progress()}%` }}></div>
        </div>
      </div>

      <div class="daily-input">
        <h3>How was today?</h3>
        <textarea
          placeholder="What did you accomplish? What are you grateful for?"
          value={dailyNote()}
          onInput={(e) => setDailyNote(e.currentTarget.value)}
          rows={3}
        />
        <button 
          class="btn-primary"
          onClick={handleAddNote}
          disabled={!dailyNote().trim() || isSubmitting()}
        >
          {isSubmitting() ? "Saving..." : "Save Today's Entry"}
        </button>
      </div>

      <div class="weeks-grid-container">
        <For each={Array(weeksCount).fill(0)}>
          {(_, weekIndex) => (
            <div class="week-block">
              <h3>Week {weekIndex() + 1}</h3>
              <div class="days-grid">
                <For each={Array(7).fill(0)}>
                  {(_, dayIndex) => {
                    const dayNumber = weekIndex() * 7 + dayIndex() + 1;
                    if (dayNumber <= totalDays()) {
                      return (
                        <A
                          href={`/day/${dayNumber}`}
                          class={`day-cell ${getDayStatus(dayNumber)}`}
                        >
                          {dayNumber}
                        </A>
                      );
                    }
                    return <div class="day-cell empty"></div>;
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <Show when={entries().length > 0}>
        <div class="recent-entries">
          <h3>Recent Entries</h3>
          <For each={entries().slice(-5).reverse()}>
            {(entry) => (
              <div class="entry">
                <strong>Day {entry.dayNumber}:</strong> {sanitizeForDisplay(entry.content)}
              </div>
            )}
          </For>
        </div>
      </Show>
      
      <Show when={error()}>
        <div class="error-message" role="alert">
          {error()}
        </div>
      </Show>
      </Show>
    </main>
  );
}