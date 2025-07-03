import { createSignal, For, Show, onMount } from "solid-js";
import { A, useNavigate } from "@solidjs/router";

export default function PeriodView() {
  const navigate = useNavigate();
  const [dailyNote, setDailyNote] = createSignal("");
  const [entries, setEntries] = createSignal<Array<{day: number, note: string}>>([]);
  
  // Check if user exists
  onMount(() => {
    const userData = localStorage.getItem("user");
    if (!userData) {
      navigate("/");
      return;
    }
    
    // Load saved entries
    const savedEntries = localStorage.getItem("entries");
    if (savedEntries) {
      setEntries(JSON.parse(savedEntries));
    }
  });

  const totalDays = 88;
  const currentDay = 15; // Hardcoded for now
  const progress = () => (currentDay / totalDays) * 100;
  const weeksCount = Math.ceil(totalDays / 7);

  const getDayStatus = (day: number) => {
    if (day < currentDay) return "completed";
    if (day === currentDay) return "current";
    return "future";
  };

  const handleAddNote = () => {
    if (!dailyNote().trim()) return;
    
    const newEntry = { day: currentDay, note: dailyNote() };
    const updatedEntries = [...entries(), newEntry];
    setEntries(updatedEntries);
    
    // Save to localStorage
    localStorage.setItem("entries", JSON.stringify(updatedEntries));
    
    setDailyNote("");
  };

  return (
    <main class="period-view">
      <header class="view-header">
        <A href="/" class="back-link">← Back</A>
        <h1>88 Days of Summer</h1>
        <A href="/life" class="icon-link">📅</A>
      </header>

      <div class="progress-section">
        <p class="progress-text">
          Progress: Day {currentDay} of {totalDays} ({progress().toFixed(0)}%)
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
          disabled={!dailyNote().trim()}
        >
          Save Today's Entry
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
                    if (dayNumber <= totalDays) {
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
                <strong>Day {entry.day}:</strong> {entry.note}
              </div>
            )}
          </For>
        </div>
      </Show>
    </main>
  );
}