import { createSignal, Show, onMount, createEffect, For } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useParams, useNavigate } from "@solidjs/router";
import { appService } from "../../lib/services/app-service";
import { useApp } from "../../lib/context/AppContext";
import JournalEntryForm from "../../components/JournalEntryForm";
import JournalEntryDisplay from "../../components/JournalEntryDisplay";
import type { JournalEntry } from "../../lib/validation/schemas";
import type { z } from "zod";
import type { JournalEntryFormSchema } from "../../lib/validation/input-schemas";

interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

export default function DayView() {
  const params = useParams();
  const navigate = useNavigate();
  const app = useApp();
  const dayNumber = parseInt(params.id);
  
  const [existingEntry, setExistingEntry] = createSignal<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = createSignal(true);
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [showForm, setShowForm] = createSignal(false);
  
  const [goals, setGoals] = createSignal<Goal[]>([
    { id: "1", text: "Morning Routine", completed: false },
    { id: "2", text: "Deep Work (3+ hours)", completed: true },
    { id: "3", text: "Exercise", completed: true },
    { id: "4", text: "Evening Reflection", completed: false },
  ]);
  
  // Redirect if not authenticated
  createEffect(() => {
    if (!app.isLoading() && !app.user()) {
      navigate("/");
    } else if (!app.isLoading() && app.user() && !app.isAuthenticated()) {
      navigate("/login");
    }
  });
  
  // Load existing entry for this day
  onMount(async () => {
    if (!app.isAuthenticated()) return;
    
    try {
      const entries = await appService.getJournalEntries();
      const dayEntry = entries.find(e => e.dayNumber === dayNumber);
      if (dayEntry) {
        setExistingEntry(dayEntry);
      } else {
        setShowForm(true);
      }
    } catch (err) {
      console.error("Failed to load journal entry:", err);
      setError(err instanceof Error ? err.message : "Failed to load entry");
    } finally {
      setIsLoading(false);
    }
  });

  const toggleGoal = (id: string) => {
    setGoals(goals().map(goal => 
      goal.id === id ? { ...goal, completed: !goal.completed } : goal
    ));
  };
  
  const handleJournalSubmit = async (formData: z.infer<typeof JournalEntryFormSchema>) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const entry = await appService.addJournalEntry(
        formData.content,
        dayNumber,
        formData.mood,
        formData.tags,
        formData.achievements,
        formData.gratitude
      );
      
      setExistingEntry(entry);
      setShowForm(false);
    } catch (err) {
      console.error("Failed to add journal entry:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to save entry");
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <main class="day-view">
      <Title>Day {dayNumber} - MyLife Calendar</Title>
      
      <header class="view-header">
        <A href="/period" class="back-link">←</A>
        <h1>{dateString}</h1>
      </header>

      <div class="day-info">
        <p>📅 Day {dayNumber} of 88 | Week {Math.ceil(dayNumber / 7)}</p>
      </div>

      <Show when={!isLoading()} fallback={<div class="loading">Loading...</div>}>
        <section class="journal-section">
          <h2>Journal Entry</h2>
          <Show
            when={existingEntry()}
            fallback={
              <Show
                when={showForm()}
                fallback={
                  <div style={{ "text-align": "center" }}>
                    <p>No entry yet for this day.</p>
                    <button class="btn-primary" onClick={() => setShowForm(true)}>
                      Create Entry
                    </button>
                  </div>
                }
              >
                <JournalEntryForm
                  onSubmit={handleJournalSubmit}
                  isSubmitting={isSubmitting()}
                  error={error()}
                />
              </Show>
            }
          >
            <JournalEntryDisplay entry={existingEntry()!} showDate={false} />
            <div style={{ "margin-top": "1rem", "text-align": "center" }}>
              <button class="btn-secondary" onClick={() => setShowForm(true)}>
                Edit Entry
              </button>
            </div>
          </Show>
        </section>
      </Show>

      <section class="goals-section">
        <h2>Goals & Habits</h2>
        <div class="goals-list">
          {goals().map((goal) => (
            <div class="goal-item">
              <input
                type="checkbox"
                id={goal.id}
                checked={goal.completed}
                onChange={() => toggleGoal(goal.id)}
              />
              <label 
                for={goal.id}
                classList={{ completed: goal.completed }}
              >
                {goal.text}
              </label>
            </div>
          ))}
        </div>
      </section>

      <nav class="day-navigation">
        <div class="nav-links">
          <Show when={dayNumber > 1}>
            <A href={`/day/${dayNumber - 1}`} class="btn-secondary">← Previous Day</A>
          </Show>
          <A href="/period" class="btn-secondary">Back to Overview</A>
          <Show when={dayNumber < 88}>
            <A href={`/day/${dayNumber + 1}`} class="btn-secondary">Next Day →</A>
          </Show>
        </div>
      </nav>
      
      <Show when={error()}>
        <div class="error-message" role="alert">
          {error()}
        </div>
      </Show>
    </main>
  );
}