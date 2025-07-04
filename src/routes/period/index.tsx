import { createSignal, For, Show, onMount, createMemo, createEffect } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { appService } from "../../lib/services/app-service";
import type { JournalEntry } from "../../lib/validation/schemas";
import { sanitizeForDisplay } from "../../lib/validation/input-schemas";
import { useApp } from "../../lib/context/AppContext";
import JournalEntryForm from "../../components/JournalEntryForm";
import JournalEntryDisplay from "../../components/JournalEntryDisplay";
import SyncStatus from "../../components/SyncStatus";
import ThemeToggle from "../../components/ThemeToggle";
import type { z } from "zod";
import type { JournalEntryFormSchema } from "../../lib/validation/input-schemas";

export default function PeriodView() {
  const navigate = useNavigate();
  const app = useApp();
  
  const [entries, setEntries] = createSignal<JournalEntry[]>([]);
  const [currentPeriod, setCurrentPeriod] = createSignal<any>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showJournalForm, setShowJournalForm] = createSignal(false);
  
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

  const handleJournalSubmit = async (formData: z.infer<typeof JournalEntryFormSchema>) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const entry = await appService.addJournalEntry(
        formData.content,
        currentDay(),
        formData.mood,
        formData.tags,
        formData.achievements,
        formData.gratitude
      );
      
      setEntries([...entries(), entry]);
      setShowJournalForm(false);
    } catch (err) {
      console.error("Failed to add journal entry:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save entry");
      }
      throw err; // Re-throw so the form knows submission failed
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
            <SyncStatus />
            <ThemeToggle />
            <A href="/habits" class="icon-link" title="Habits">💪</A>
            <A href="/goals" class="icon-link" title="Goals">🎯</A>
            <A href="/journal" class="icon-link" title="All Entries">📖</A>
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
        <Show
          when={showJournalForm()}
          fallback={
            <button
              class="btn-primary"
              onClick={() => setShowJournalForm(true)}
            >
              Add Today's Entry
            </button>
          }
        >
          <JournalEntryForm
            onSubmit={handleJournalSubmit}
            isSubmitting={isSubmitting()}
            error={error()}
          />
        </Show>
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
          <div style={{ display: "flex", "justify-content": "space-between", "align-items": "center", "margin-bottom": "1rem" }}>
            <h3>Recent Entries</h3>
            <A href="/journal" class="btn-secondary" style={{ "font-size": "0.875rem", padding: "0.5rem 1rem" }}>
              View All ({entries().length})
            </A>
          </div>
          <For each={entries().slice(-5).reverse()}>
            {(entry) => (
              <JournalEntryDisplay 
                entry={entry}
                showDate={true}
              />
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