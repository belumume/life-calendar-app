import { createSignal, onMount, createEffect, Show, For, createMemo } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useApp } from "../../lib/context/AppContext";
import { appService } from "../../lib/services/app-service";
import HabitForm from "../../components/HabitForm";
import HabitCard from "../../components/HabitCard";
import SyncStatus from "../../components/SyncStatus";
import type { Habit } from "../../lib/validation/schemas";

type FilterType = 'all' | 'daily' | 'weekly' | 'monthly';

export default function HabitsPage() {
  const navigate = useNavigate();
  const app = useApp();
  
  const [habits, setHabits] = createSignal<Habit[]>([]);
  const [filter, setFilter] = createSignal<FilterType>('all');
  const [showForm, setShowForm] = createSignal(false);
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
  
  // Load habits
  const loadHabits = async () => {
    try {
      const allHabits = await appService.getHabits();
      setHabits(allHabits);
    } catch (err) {
      console.error("Failed to load habits:", err);
      setError(err instanceof Error ? err.message : "Failed to load habits");
    } finally {
      setIsLoading(false);
    }
  };
  
  onMount(() => {
    if (app.isAuthenticated()) {
      loadHabits();
    }
  });
  
  const handleCreateHabit = async (formData: Parameters<typeof appService.createHabit>[0]) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await appService.createHabit(formData);
      await loadHabits();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create habit:", err);
      setError(err instanceof Error ? err.message : "Failed to create habit");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredHabits = createMemo(() => {
    if (filter() === 'all') {
      return habits();
    }
    return habits().filter(h => h.frequency === filter());
  });
  
  const stats = createMemo(() => {
    const all = habits();
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: all.length,
      daily: all.filter(h => h.frequency === 'daily').length,
      weekly: all.filter(h => h.frequency === 'weekly').length,
      monthly: all.filter(h => h.frequency === 'monthly').length,
      completedToday: all.filter(h => 
        h.frequency === 'daily' && 
        h.completions.some(c => c.date.split('T')[0] === today)
      ).length,
      activeStreaks: all.filter(h => h.currentStreak > 0).length,
    };
  });
  
  const todayProgress = createMemo(() => {
    const daily = habits().filter(h => h.frequency === 'daily');
    if (daily.length === 0) return 100;
    return (stats().completedToday / daily.length) * 100;
  });
  
  return (
    <main class="habits-page">
      <Title>Habits - MyLife Calendar</Title>
      
      <header class="habits-header">
        <div>
          <A href="/period" class="back-link">← Back</A>
          <h1>My Habits</h1>
        </div>
        <div class="header-actions">
          <SyncStatus />
          <A href="/goals" class="icon-link" title="Goals">🎯</A>
          <A href="/settings" class="icon-link" title="Settings">⚙️</A>
        </div>
      </header>
      
      <Show when={!isLoading()} fallback={<div class="loading">Loading habits...</div>}>
        <div class="habits-stats">
          <div class="stat-card habits">
            <h3>Today's Progress</h3>
            <div class="progress-circle">
              <svg viewBox="0 0 36 36" class="circular-chart">
                <path class="circle-bg"
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path class="circle"
                  stroke-dasharray={`${todayProgress()}, 100`}
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <text x="18" y="20.35" class="percentage">{todayProgress().toFixed(0)}%</text>
              </svg>
            </div>
          </div>
          <div class="stat-card">
            <h3>Active Streaks</h3>
            <div class="stat-value">🔥 {stats().activeStreaks}</div>
          </div>
          <div class="stat-card">
            <h3>Daily Habits</h3>
            <div class="stat-value">{stats().daily}</div>
          </div>
          <div class="stat-card">
            <h3>Total Habits</h3>
            <div class="stat-value">{stats().total}</div>
          </div>
        </div>
        
        <Show when={!showForm()}>
          <button
            class="btn-primary"
            onClick={() => setShowForm(true)}
            style={{ "margin-bottom": "1.5rem" }}
          >
            + Create New Habit
          </button>
        </Show>
        
        <Show when={showForm()}>
          <div style={{ "margin-bottom": "2rem" }}>
            <HabitForm
              onSubmit={handleCreateHabit}
              isSubmitting={isSubmitting()}
              error={error()}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </Show>
        
        <div class="habit-filters">
          <button
            class={`filter-button ${filter() === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats().total})
          </button>
          <button
            class={`filter-button ${filter() === 'daily' ? 'active' : ''}`}
            onClick={() => setFilter('daily')}
          >
            Daily ({stats().daily})
          </button>
          <button
            class={`filter-button ${filter() === 'weekly' ? 'active' : ''}`}
            onClick={() => setFilter('weekly')}
          >
            Weekly ({stats().weekly})
          </button>
          <button
            class={`filter-button ${filter() === 'monthly' ? 'active' : ''}`}
            onClick={() => setFilter('monthly')}
          >
            Monthly ({stats().monthly})
          </button>
        </div>
        
        <div class="habits-list">
          <Show
            when={filteredHabits().length > 0}
            fallback={
              <div class="empty-state">
                <h3>No habits yet</h3>
                <p>Create your first habit to start building positive routines!</p>
              </div>
            }
          >
            <For each={filteredHabits()}>
              {(habit) => (
                <HabitCard
                  habit={habit}
                  onUpdate={loadHabits}
                  onDelete={loadHabits}
                />
              )}
            </For>
          </Show>
        </div>
      </Show>
      
      <Show when={error()}>
        <div class="error-message" role="alert">
          {error()}
        </div>
      </Show>
    </main>
  );
}