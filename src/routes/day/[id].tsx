import { createSignal, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useParams } from "@solidjs/router";

interface Goal {
  id: string;
  text: string;
  completed: boolean;
}

export default function DayView() {
  const params = useParams();
  const dayNumber = parseInt(params.id);
  
  const [journalEntry, setJournalEntry] = createSignal("");
  const [achievements, setAchievements] = createSignal("");
  const [tomorrowFocus, setTomorrowFocus] = createSignal("");
  
  const [goals, setGoals] = createSignal<Goal[]>([
    { id: "1", text: "Morning Routine", completed: false },
    { id: "2", text: "Deep Work (3+ hours)", completed: true },
    { id: "3", text: "Exercise", completed: true },
    { id: "4", text: "Evening Reflection", completed: false },
  ]);

  const toggleGoal = (id: string) => {
    setGoals(goals().map(goal => 
      goal.id === id ? { ...goal, completed: !goal.completed } : goal
    ));
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

      <section class="journal-section">
        <h2>Journal Entry</h2>
        <div class="journal-form">
          <div class="form-group">
            <label>What made today remarkable?</label>
            <textarea
              value={journalEntry()}
              onInput={(e) => setJournalEntry(e.currentTarget.value)}
              placeholder="Reflect on your day..."
              rows="4"
            />
          </div>

          <div class="form-group">
            <label>Progress & Achievements:</label>
            <textarea
              value={achievements()}
              onInput={(e) => setAchievements(e.currentTarget.value)}
              placeholder="• What did you accomplish?
• What progress did you make?"
              rows="3"
            />
          </div>

          <div class="form-group">
            <label>Tomorrow's Focus:</label>
            <textarea
              value={tomorrowFocus()}
              onInput={(e) => setTomorrowFocus(e.currentTarget.value)}
              placeholder="What will you focus on tomorrow?"
              rows="2"
            />
          </div>
        </div>
      </section>

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
        <button class="btn-primary">Save Entry</button>
        <div class="nav-links">
          <Show when={dayNumber > 1}>
            <A href={`/day/${dayNumber - 1}`} class="btn-secondary">← Previous Day</A>
          </Show>
          <Show when={dayNumber < 88}>
            <A href={`/day/${dayNumber + 1}`} class="btn-secondary">Next Day →</A>
          </Show>
        </div>
      </nav>
    </main>
  );
}