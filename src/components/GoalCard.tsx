import { createSignal, Show, For } from "solid-js";
import type { Goal } from "../lib/validation/schemas";
import { appService } from "../lib/services/app-service";

interface GoalCardProps {
  goal: Goal;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const CATEGORY_STYLES = {
  health: { emoji: '💪', color: '#22c55e' },
  career: { emoji: '💼', color: '#3b82f6' },
  personal: { emoji: '🌟', color: '#8b5cf6' },
  financial: { emoji: '💰', color: '#f59e0b' },
  learning: { emoji: '📚', color: '#06b6d4' },
  relationship: { emoji: '❤️', color: '#ec4899' },
  other: { emoji: '🎯', color: '#6b7280' },
};

const PRIORITY_BADGES = {
  high: { label: 'High', class: 'priority-high' },
  medium: { label: 'Medium', class: 'priority-medium' },
  low: { label: 'Low', class: 'priority-low' },
};

export default function GoalCard(props: GoalCardProps) {
  const [isExpanded, setIsExpanded] = createSignal(false);
  const [isUpdating, setIsUpdating] = createSignal(false);
  const [progress, setProgress] = createSignal(props.goal.progress);
  
  const categoryStyle = () => CATEGORY_STYLES[props.goal.category as keyof typeof CATEGORY_STYLES] || CATEGORY_STYLES.other;
  const priorityBadge = () => PRIORITY_BADGES[props.goal.priority as keyof typeof PRIORITY_BADGES];
  
  const daysUntilTarget = () => {
    if (!props.goal.targetDate) return null;
    const target = new Date(props.goal.targetDate);
    const today = new Date();
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };
  
  const handleProgressChange = async (newProgress: number) => {
    setIsUpdating(true);
    try {
      await appService.updateGoalProgress(props.goal.id, newProgress);
      setProgress(newProgress);
      props.onUpdate?.();
    } catch (error) {
      console.error('Failed to update progress:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleMilestoneToggle = async (milestoneId: string) => {
    setIsUpdating(true);
    try {
      await appService.toggleGoalMilestone(props.goal.id, milestoneId);
      props.onUpdate?.();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this goal?')) return;
    
    setIsUpdating(true);
    try {
      await appService.deleteGoal(props.goal.id);
      props.onDelete?.();
    } catch (error) {
      console.error('Failed to delete goal:', error);
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div class={`goal-card ${props.goal.status}`}>
      <div class="goal-header">
        <div class="goal-title-row">
          <span class="goal-category" style={{ color: categoryStyle().color }}>
            {categoryStyle().emoji}
          </span>
          <h4 class="goal-title">{props.goal.title}</h4>
          <span class={`priority-badge ${priorityBadge().class}`}>
            {priorityBadge().label}
          </span>
        </div>
        
        <button
          class="expand-button"
          onClick={() => setIsExpanded(!isExpanded())}
          title={isExpanded() ? "Collapse" : "Expand"}
        >
          {isExpanded() ? '−' : '+'}
        </button>
      </div>
      
      <div class="goal-progress">
        <div class="progress-info">
          <span>Progress: {progress()}%</span>
          <Show when={daysUntilTarget() !== null}>
            <span class="days-left">
              {daysUntilTarget()! > 0 
                ? `${daysUntilTarget()} days left`
                : daysUntilTarget() === 0 
                ? 'Due today!'
                : `${Math.abs(daysUntilTarget()!)} days overdue`
              }
            </span>
          </Show>
        </div>
        
        <div class="progress-bar-container">
          <div 
            class="progress-bar-fill"
            style={{ width: `${progress()}%` }}
          />
        </div>
        
        <Show when={props.goal.status === 'active'}>
          <input
            type="range"
            min="0"
            max="100"
            value={progress()}
            onInput={(e) => handleProgressChange(parseInt(e.currentTarget.value))}
            disabled={isUpdating()}
            class="progress-slider"
          />
        </Show>
      </div>
      
      <Show when={isExpanded()}>
        <div class="goal-details">
          <Show when={props.goal.description}>
            <p class="goal-description">{props.goal.description}</p>
          </Show>
          
          <Show when={props.goal.milestones && props.goal.milestones.length > 0}>
            <div class="milestones-section">
              <h5>Milestones</h5>
              <ul class="milestones-checklist">
                <For each={props.goal.milestones}>
                  {(milestone) => (
                    <li class={milestone.completed ? 'completed' : ''}>
                      <input
                        type="checkbox"
                        id={`milestone-${milestone.id}`}
                        checked={milestone.completed}
                        onChange={() => handleMilestoneToggle(milestone.id)}
                        disabled={isUpdating() || props.goal.status !== 'active'}
                      />
                      <label for={`milestone-${milestone.id}`}>
                        {milestone.title}
                      </label>
                    </li>
                  )}
                </For>
              </ul>
            </div>
          </Show>
          
          <Show when={props.goal.status === 'completed'}>
            <p class="completion-date">
              ✅ Completed on {new Date(props.goal.completedAt!).toLocaleDateString()}
            </p>
          </Show>
          
          <div class="goal-actions">
            <Show when={props.goal.status === 'active'}>
              <button
                class="btn-danger"
                onClick={handleDelete}
                disabled={isUpdating()}
              >
                Delete Goal
              </button>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}