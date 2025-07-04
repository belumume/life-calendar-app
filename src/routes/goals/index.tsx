import { createSignal, onMount, createEffect, Show, For } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { Title } from "@solidjs/meta";
import { useApp } from "../../lib/context/AppContext";
import { appService } from "../../lib/services/app-service";
import GoalForm from "../../components/GoalForm";
import GoalCard from "../../components/GoalCard";
import SyncStatus from "../../components/SyncStatus";
import type { Goal, GoalStatus } from "../../lib/validation/schemas";
import type { GoalFormData } from "../../lib/validation/input-schemas";

type FilterType = 'all' | GoalStatus;

export default function GoalsPage() {
  const navigate = useNavigate();
  const app = useApp();
  
  const [goals, setGoals] = createSignal<Goal[]>([]);
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
  
  // Load goals
  const loadGoals = async () => {
    try {
      const allGoals = await appService.getGoals();
      setGoals(allGoals);
    } catch (err) {
      console.error("Failed to load goals:", err);
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setIsLoading(false);
    }
  };
  
  onMount(() => {
    if (app.isAuthenticated()) {
      loadGoals();
    }
  });
  
  const handleCreateGoal = async (formData: GoalFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      await appService.createGoal(formData);
      await loadGoals();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to create goal:", err);
      setError(err instanceof Error ? err.message : "Failed to create goal");
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const filteredGoals = () => {
    if (filter() === 'all') {
      return goals();
    }
    return goals().filter(g => g.status === filter());
  };
  
  const stats = () => {
    const all = goals();
    return {
      total: all.length,
      active: all.filter(g => g.status === 'active').length,
      completed: all.filter(g => g.status === 'completed').length,
      paused: all.filter(g => g.status === 'paused').length,
    };
  };
  
  return (
    <main class="goals-page">
      <Title>Goals - MyLife Calendar</Title>
      
      <header class="goals-header">
        <div>
          <A href="/period" class="back-link">← Back</A>
          <h1>My Goals</h1>
        </div>
        <div class="header-actions">
          <SyncStatus />
          <A href="/settings" class="icon-link" title="Settings">⚙️</A>
        </div>
      </header>
      
      <Show when={!isLoading()} fallback={<div class="loading">Loading goals...</div>}>
        <div class="goals-stats">
          <div class="stat-card goals">
            <h3>Total Goals</h3>
            <div class="stat-value">{stats().total}</div>
          </div>
          <div class="stat-card">
            <h3>Active</h3>
            <div class="stat-value">{stats().active}</div>
          </div>
          <div class="stat-card">
            <h3>Completed</h3>
            <div class="stat-value">{stats().completed}</div>
          </div>
          <div class="stat-card">
            <h3>Paused</h3>
            <div class="stat-value">{stats().paused}</div>
          </div>
        </div>
        
        <Show when={!showForm()}>
          <button
            class="btn-primary"
            onClick={() => setShowForm(true)}
            style={{ "margin-bottom": "1.5rem" }}
          >
            + Create New Goal
          </button>
        </Show>
        
        <Show when={showForm()}>
          <div style={{ "margin-bottom": "2rem" }}>
            <GoalForm
              onSubmit={handleCreateGoal}
              isSubmitting={isSubmitting()}
              error={error()}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </Show>
        
        <div class="goal-filters">
          <button
            class={`filter-button ${filter() === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats().total})
          </button>
          <button
            class={`filter-button ${filter() === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({stats().active})
          </button>
          <button
            class={`filter-button ${filter() === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({stats().completed})
          </button>
          <button
            class={`filter-button ${filter() === 'paused' ? 'active' : ''}`}
            onClick={() => setFilter('paused')}
          >
            Paused ({stats().paused})
          </button>
        </div>
        
        <div class="goals-list">
          <Show
            when={filteredGoals().length > 0}
            fallback={
              <div class="empty-state">
                <h3>No goals yet</h3>
                <p>Create your first goal to start tracking your progress!</p>
              </div>
            }
          >
            <For each={filteredGoals()}>
              {(goal) => (
                <GoalCard
                  goal={goal}
                  onUpdate={loadGoals}
                  onDelete={loadGoals}
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