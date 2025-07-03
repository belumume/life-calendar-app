import { createSignal, Show } from "solid-js";
import type { Habit } from "../lib/validation/schemas";

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

const DEFAULT_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#6366f1', // indigo
];

const DEFAULT_ICONS = [
  '💪', '🏃', '🧘', '📚', '✍️', '💊', '🥗', '💧',
  '🎯', '🌱', '🎨', '🎵', '💻', '🏋️', '🚴', '🧠'
];

interface HabitFormProps {
  onSubmit: (data: {
    name: string;
    description?: string;
    frequency: 'daily' | 'weekly' | 'monthly';
    targetCount?: number;
    color?: string;
    icon?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  habit?: Habit;
  onCancel?: () => void;
}

export default function HabitForm(props: HabitFormProps) {
  const [name, setName] = createSignal(props.habit?.name || '');
  const [description, setDescription] = createSignal(props.habit?.description || '');
  const [frequency, setFrequency] = createSignal<'daily' | 'weekly' | 'monthly'>(props.habit?.frequency || 'daily');
  const [targetCount, setTargetCount] = createSignal(props.habit?.targetCount?.toString() || '1');
  const [color, setColor] = createSignal(props.habit?.color || DEFAULT_COLORS[0]);
  const [icon, setIcon] = createSignal(props.habit?.icon || DEFAULT_ICONS[0]);
  const [showIconPicker, setShowIconPicker] = createSignal(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!name().trim()) return;

    try {
      await props.onSubmit({
        name: name().trim(),
        description: description().trim() || undefined,
        frequency: frequency(),
        targetCount: parseInt(targetCount()) || undefined,
        color: color(),
        icon: icon(),
      });
      
      // Reset form if not editing
      if (!props.habit) {
        setName('');
        setDescription('');
        setFrequency('daily');
        setTargetCount('1');
        setColor(DEFAULT_COLORS[0]);
        setIcon(DEFAULT_ICONS[0]);
      }
    } catch (error) {
      // Error handling is done by parent
    }
  };

  const getFrequencyLabel = () => {
    const freq = frequency();
    const count = parseInt(targetCount()) || 1;
    if (count === 1) {
      return `Once ${freq}`;
    }
    return `${count} times ${freq}`;
  };

  return (
    <form onSubmit={handleSubmit} class="habit-form">
      <h3>{props.habit ? 'Edit Habit' : 'Create New Habit'}</h3>
      
      <div class="form-group">
        <label for="habit-name">Habit Name</label>
        <input
          id="habit-name"
          type="text"
          value={name()}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="e.g., Morning Meditation"
          required
          maxLength={100}
        />
      </div>

      <div class="form-group">
        <label for="habit-description">Description (optional)</label>
        <textarea
          id="habit-description"
          value={description()}
          onInput={(e) => setDescription(e.currentTarget.value)}
          placeholder="Why is this habit important to you?"
          rows={3}
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="habit-frequency">Frequency</label>
          <select
            id="habit-frequency"
            value={frequency()}
            onChange={(e) => setFrequency(e.currentTarget.value as 'daily' | 'weekly' | 'monthly')}
          >
            {FREQUENCY_OPTIONS.map(opt => (
              <option value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div class="form-group">
          <label for="habit-target">Target Count</label>
          <input
            id="habit-target"
            type="number"
            value={targetCount()}
            onInput={(e) => setTargetCount(e.currentTarget.value)}
            min="1"
            max="100"
            placeholder="1"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Color</label>
          <div class="color-picker">
            {DEFAULT_COLORS.map(c => (
              <button
                type="button"
                class={`color-option ${color() === c ? 'selected' : ''}`}
                style={{ "background-color": c }}
                onClick={() => setColor(c)}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </div>

        <div class="form-group">
          <label>Icon</label>
          <button
            type="button"
            class="icon-selector"
            onClick={() => setShowIconPicker(!showIconPicker())}
            style={{ "background-color": color() }}
          >
            <span class="icon-display">{icon()}</span>
          </button>
          
          <Show when={showIconPicker()}>
            <div class="icon-picker">
              {DEFAULT_ICONS.map(i => (
                <button
                  type="button"
                  class={`icon-option ${icon() === i ? 'selected' : ''}`}
                  onClick={() => {
                    setIcon(i);
                    setShowIconPicker(false);
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </Show>
        </div>
      </div>

      <div class="habit-preview">
        <div class="preview-label">Preview:</div>
        <div 
          class="habit-preview-card"
          style={{ "border-left": `4px solid ${color()}` }}
        >
          <span class="habit-icon">{icon()}</span>
          <div class="habit-info">
            <div class="habit-name">{name() || 'Habit Name'}</div>
            <div class="habit-frequency">{getFrequencyLabel()}</div>
          </div>
        </div>
      </div>

      <Show when={props.error}>
        <div class="error-message" role="alert">
          {props.error}
        </div>
      </Show>

      <div class="form-actions">
        <button
          type="submit"
          class="btn-primary"
          disabled={props.isSubmitting || !name().trim()}
        >
          {props.isSubmitting ? 'Saving...' : (props.habit ? 'Update Habit' : 'Create Habit')}
        </button>
        
        <Show when={props.onCancel}>
          <button
            type="button"
            class="btn-secondary"
            onClick={props.onCancel}
            disabled={props.isSubmitting}
          >
            Cancel
          </button>
        </Show>
      </div>
    </form>
  );
}