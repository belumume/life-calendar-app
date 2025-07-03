import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

export default function PeriodView() {
  const totalDays = 88;
  const [currentDay] = createSignal(15); // Example: Day 15
  const [dailyNote, setDailyNote] = createSignal("");

  const progress = () => (currentDay() / totalDays) * 100;
  const weeksCount = Math.ceil(totalDays / 7);

  const getDayStatus = (day: number) => {
    if (day < currentDay()) return "completed";
    if (day === currentDay()) return "current";
    return "future";
  };

  const recentEntries = [
    { day: 14, text: "Completed project milestone ✨" },
    { day: 13, text: "Deep work session - 4 hours" },
    { day: 12, text: "Started new learning track" },
  ];

  return (
    <main class="period-view">
      <Title>88 Days of Summer - MyLife Calendar</Title>
      
      <header class="view-header">
        <A href="/life" class="back-link">←</A>
        <h1>88 Days of Summer 2025</h1>
        <A href="/calendar" class="icon-link">📅</A>
      </header>

      <div class="progress-section">
        <p class="progress-text">Progress: Day {currentDay()} of {totalDays} ({progress().toFixed(0)}%)</p>
        <div class="progress-bar">
          <div class="progress-fill" style={{ width: `${progress()}%` }}></div>
        </div>
      </div>

      <div class="weeks-grid-container">
        <For each={Array(weeksCount)}>
          {(_, weekIndex) => (
            <div class="week-block">
              <h3>Week {weekIndex() + 1}</h3>
              <div class="days-grid">
                <For each={Array(7)}>
                  {(_, dayIndex) => {
                    const dayNumber = weekIndex() * 7 + dayIndex() + 1;
                    if (dayNumber > totalDays) return null;
                    
                    const status = getDayStatus(dayNumber);
                    return (
                      <A 
                        href={`/day/${dayNumber}`}
                        class="day-cell"
                        classList={{
                          completed: status === "completed",
                          current: status === "current",
                          future: status === "future"
                        }}
                      >
                        <Show when={status === "completed"}>✓</Show>
                        <Show when={status === "current"}>●</Show>
                        <Show when={status === "future"}>{dayNumber}</Show>
                      </A>
                    );
                  }}
                </For>
              </div>
            </div>
          )}
        </For>
      </div>

      <div class="daily-achievement">
        <h3>Daily Achievements</h3>
        <div class="note-input">
          <textarea
            placeholder="Today: Made substantial progress on..."
            value={dailyNote()}
            onInput={(e) => setDailyNote(e.currentTarget.value)}
          />
          <button class="btn-primary">Add Note</button>
        </div>
      </div>

      <div class="recent-entries">
        <h3>Recent Entries</h3>
        <ul>
          <For each={recentEntries}>
            {(entry) => (
              <li>
                <A href={`/day/${entry.day}`}>
                  Day {entry.day}: {entry.text}
                </A>
              </li>
            )}
          </For>
        </ul>
      </div>

      <nav class="view-actions">
        <button class="btn-secondary">View All Days</button>
        <button class="btn-secondary">Statistics</button>
        <button class="btn-secondary">Export</button>
      </nav>
    </main>
  );
}