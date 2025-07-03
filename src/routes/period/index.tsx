import { createSignal, For, Show, onMount, createMemo } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useNavigate } from "@solidjs/router";
import { appState, addJournalEntry } from "../../lib/state/store";

export default function PeriodView() {
  const navigate = useNavigate();
  const [dailyNote, setDailyNote] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  
  // Redirect if not authenticated
  onMount(() => {
    if (!appState.isAuthenticated || !appState.user) {
      navigate("/");
    }
  });

  // Calculate current day based on period start date
  const currentDay = createMemo(() => {
    if (!appState.currentPeriod) return 0;
    const start = new Date(appState.currentPeriod.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.min(diffDays, appState.currentPeriod.totalDays || 88);
  });

  const totalDays = () => appState.currentPeriod?.totalDays || 88;
  const progress = () => (currentDay() / totalDays()) * 100;
  const weeksCount = Math.ceil(totalDays() / 7);

  const getDayStatus = (day: number) => {
    if (day < currentDay()) return "completed";
    if (day === currentDay()) return "current";
    return "future";
  };

  // Get recent journal entries
  const recentEntries = createMemo(() => {
    return appState.journalEntries
      .filter(entry => entry.periodId === appState.currentPeriod?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  });

  const handleAddNote = async () => {
    if (!dailyNote().trim() || isSubmitting()) return;
    
    setIsSubmitting(true);
    try {
      await addJournalEntry({
        date: new Date().toISOString(),
        dayNumber: currentDay(),
        periodId: appState.currentPeriod?.id,
        content: dailyNote(),
        mood: undefined,
        tags: [],
        achievements: [],
        gratitude: [],
      });
      
      setDailyNote("");
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main class="period-view">
      <Title>88 Days of Summer - MyLife Calendar</Title>
      
      <Show when={appState.isAuthenticated} fallback={<div class="loading">Loading...</div>}>
        <header class="view-header">
          <A href="/" class="back-link">← Back</A>
          <h1>{appState.currentPeriod?.name || "88 Days of Summer"}</h1>
          <A href="/life" class="icon-link">📅</A>
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
            disabled={isSubmitting() || !dailyNote().trim()}
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

        <Show when={recentEntries().length > 0}>
          <div class="recent-entries">
            <h3>Recent Entries</h3>
            <For each={recentEntries()}>
              {(entry) => (
                <div class="entry">
                  <strong>Day {entry.dayNumber}:</strong> {entry.content}
                  <Show when={entry.mood}>
                    <span class="mood-badge">{entry.mood}</span>
                  </Show>
                </div>
              )}
            </For>
          </div>
        </Show>

        <Show when={appState.error}>
          <p class="error-message">{appState.error}</p>
        </Show>
      </Show>
    </main>
  );
}