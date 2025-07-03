import { createSignal, Show, For, createMemo } from "solid-js";
import { appService } from "../lib/services/app-service";
import type { Habit } from "../lib/validation/schemas";

interface HabitCardProps {
  habit: Habit;
  onUpdate: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function HabitCard(props: HabitCardProps) {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [isCompleting, setIsCompleting] = createSignal(false);
  const [completionNotes, setCompletionNotes] = createSignal('');
  const [showNotes, setShowNotes] = createSignal(false);

  const today = new Date().toISOString().split('T')[0];
  
  const isCompletedToday = createMemo(() => {
    return props.habit.completions.some(c => c.date.split('T')[0] === today);
  });

  const completionsThisWeek = createMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return props.habit.completions.filter(c => new Date(c.date) > weekAgo).length;
  });

  const completionsThisMonth = createMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return props.habit.completions.filter(c => new Date(c.date) >= monthStart).length;
  });

  const streakInfo = createMemo(() => {
    const current = props.habit.currentStreak;
    const longest = props.habit.longestStreak;
    const emoji = current > 0 ? '🔥' : '❄️';
    return { current, longest, emoji };
  });

  const progressPercentage = createMemo(() => {
    if (props.habit.frequency === 'daily') {
      return isCompletedToday() ? 100 : 0;
    } else if (props.habit.frequency === 'weekly') {
      const target = props.habit.targetCount || 1;
      return Math.min((completionsThisWeek() / target) * 100, 100);
    } else {
      const target = props.habit.targetCount || 1;
      return Math.min((completionsThisMonth() / target) * 100, 100);
    }
  });

  const handleToggleCompletion = async () => {
    setIsCompleting(true);
    try {
      if (isCompletedToday()) {
        await appService.removeHabitCompletion(props.habit.id, today);
      } else {
        const notes = showNotes() ? completionNotes() : undefined;
        await appService.recordHabitCompletion(props.habit.id, undefined, notes);
        setCompletionNotes('');
        setShowNotes(false);
      }
      await props.onUpdate();
    } catch (error) {
      console.error('Failed to toggle completion:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${props.habit.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await appService.deleteHabit(props.habit.id);
      await props.onDelete();
    } catch (error) {
      console.error('Failed to delete habit:', error);
    }
  };

  const getFrequencyDisplay = () => {
    const target = props.habit.targetCount || 1;
    const freq = props.habit.frequency;
    
    if (freq === 'daily') {
      return target === 1 ? 'Daily' : `${target}x Daily`;
    } else if (freq === 'weekly') {
      return target === 1 ? 'Weekly' : `${target}x Weekly`;
    } else {
      return target === 1 ? 'Monthly' : `${target}x Monthly`;
    }
  };

  const getCompletionStats = () => {
    if (props.habit.frequency === 'daily') {
      return `Today: ${isCompletedToday() ? 'Done ✓' : 'Pending'}`;
    } else if (props.habit.frequency === 'weekly') {
      return `This week: ${completionsThisWeek()}/${props.habit.targetCount || 1}`;
    } else {
      return `This month: ${completionsThisMonth()}/${props.habit.targetCount || 1}`;
    }
  };

  return (
    <div 
      class={`habit-card ${isExpanded() ? 'expanded' : ''}`}
      style={{ "border-left-color": props.habit.color || '#3b82f6' }}
    >
      <div class="habit-header" onClick={() => setIsExpanded(!isExpanded())}>
        <div class="habit-main">
          <span class="habit-icon">{props.habit.icon || '🎯'}</span>
          <div class="habit-info">
            <h4>{props.habit.name}</h4>
            <div class="habit-stats">
              <span class="frequency">{getFrequencyDisplay()}</span>
              <span class="streak">
                {streakInfo().emoji} {streakInfo().current} day streak
              </span>
            </div>
          </div>
        </div>
        
        <div class="habit-actions">
          <button
            class={`complete-btn ${isCompletedToday() ? 'completed' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleCompletion();
            }}
            disabled={isCompleting()}
            title={isCompletedToday() ? 'Mark as not done' : 'Mark as done'}
          >
            {isCompletedToday() ? '✓' : '○'}
          </button>
        </div>
      </div>

      <div class="habit-progress">
        <div class="progress-bar">
          <div 
            class="progress-fill"
            style={{ 
              width: `${progressPercentage()}%`,
              "background-color": props.habit.color || '#3b82f6'
            }}
          />
        </div>
        <div class="progress-text">{getCompletionStats()}</div>
      </div>

      <Show when={isExpanded()}>
        <div class="habit-details">
          <Show when={props.habit.description}>
            <p class="habit-description">{props.habit.description}</p>
          </Show>

          <div class="habit-metrics">
            <div class="metric">
              <span class="metric-label">Current Streak</span>
              <span class="metric-value">{props.habit.currentStreak} days</span>
            </div>
            <div class="metric">
              <span class="metric-label">Longest Streak</span>
              <span class="metric-value">{props.habit.longestStreak} days</span>
            </div>
            <div class="metric">
              <span class="metric-label">Total Completions</span>
              <span class="metric-value">{props.habit.completions.length}</span>
            </div>
          </div>

          <Show when={!isCompletedToday() && props.habit.frequency === 'daily'}>
            <div class="completion-section">
              <button
                class="btn-secondary"
                onClick={() => setShowNotes(!showNotes())}
              >
                {showNotes() ? 'Hide Notes' : 'Add Notes'}
              </button>
              
              <Show when={showNotes()}>
                <textarea
                  value={completionNotes()}
                  onInput={(e) => setCompletionNotes(e.currentTarget.value)}
                  placeholder="Add a note about today's completion..."
                  rows={2}
                  class="completion-notes"
                />
              </Show>
            </div>
          </Show>

          <Show when={props.habit.completions.length > 0}>
            <div class="recent-completions">
              <h5>Recent Completions</h5>
              <For each={props.habit.completions.slice(-5).reverse()}>
                {(completion) => (
                  <div class="completion-item">
                    <span class="completion-date">
                      {new Date(completion.date).toLocaleDateString()}
                    </span>
                    <Show when={completion.notes}>
                      <span class="completion-note">{completion.notes}</span>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Show>

          <div class="habit-card-actions">
            <button
              class="btn-danger"
              onClick={handleDelete}
            >
              Delete Habit
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}