import { createSignal, For, Show } from "solid-js";
import { GoalFormSchema } from "../lib/validation/input-schemas";
import { z } from "zod";

interface GoalFormProps {
  onSubmit: (data: z.infer<typeof GoalFormSchema>) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
  onCancel?: () => void;
}

const CATEGORIES = [
  { value: 'health', label: '💪 Health', color: '#22c55e' },
  { value: 'career', label: '💼 Career', color: '#3b82f6' },
  { value: 'personal', label: '🌟 Personal', color: '#8b5cf6' },
  { value: 'financial', label: '💰 Financial', color: '#f59e0b' },
  { value: 'learning', label: '📚 Learning', color: '#06b6d4' },
  { value: 'relationship', label: '❤️ Relationship', color: '#ec4899' },
  { value: 'other', label: '🎯 Other', color: '#6b7280' },
];

const PRIORITIES = [
  { value: 'high', label: 'High Priority', color: '#ef4444' },
  { value: 'medium', label: 'Medium Priority', color: '#f59e0b' },
  { value: 'low', label: 'Low Priority', color: '#22c55e' },
];

export default function GoalForm(props: GoalFormProps) {
  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [category, setCategory] = createSignal<typeof CATEGORIES[0]['value']>("personal");
  const [priority, setPriority] = createSignal<typeof PRIORITIES[0]['value']>("medium");
  const [targetDate, setTargetDate] = createSignal("");
  const [milestoneInput, setMilestoneInput] = createSignal("");
  const [milestones, setMilestones] = createSignal<string[]>([]);
  const [validationError, setValidationError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setValidationError(null);

    try {
      const formData = GoalFormSchema.parse({
        title: title(),
        description: description() || undefined,
        category: category(),
        priority: priority(),
        targetDate: targetDate() || undefined,
        milestones: milestones().map(title => ({ title })),
      });

      await props.onSubmit(formData);

      // Reset form on success
      setTitle("");
      setDescription("");
      setCategory("personal");
      setPriority("medium");
      setTargetDate("");
      setMilestones([]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  const addMilestone = () => {
    const input = milestoneInput().trim();
    if (!input) return;

    if (milestones().length >= 10) {
      setValidationError("Maximum 10 milestones allowed");
      return;
    }

    setMilestones([...milestones(), input]);
    setMilestoneInput("");
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones().filter((_, i) => i !== index));
  };

  // Calculate minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} class="goal-form">
      <div class="form-section">
        <h3>Create a New Goal</h3>
        
        <div class="form-group">
          <label for="goal-title">
            Goal Title <span class="required">*</span>
          </label>
          <input
            id="goal-title"
            type="text"
            placeholder="What do you want to achieve?"
            value={title()}
            onInput={(e) => setTitle(e.currentTarget.value)}
            required
            maxLength={200}
          />
        </div>

        <div class="form-group">
          <label for="goal-description">Description</label>
          <textarea
            id="goal-description"
            placeholder="Add more details about your goal..."
            value={description()}
            onInput={(e) => setDescription(e.currentTarget.value)}
            rows={3}
            maxLength={1000}
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="goal-category">Category</label>
            <select
              id="goal-category"
              value={category()}
              onChange={(e) => setCategory(e.currentTarget.value as any)}
            >
              <For each={CATEGORIES}>
                {(cat) => <option value={cat.value}>{cat.label}</option>}
              </For>
            </select>
          </div>

          <div class="form-group">
            <label for="goal-priority">Priority</label>
            <select
              id="goal-priority"
              value={priority()}
              onChange={(e) => setPriority(e.currentTarget.value as any)}
            >
              <For each={PRIORITIES}>
                {(pri) => <option value={pri.value}>{pri.label}</option>}
              </For>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label for="goal-target-date">Target Date</label>
          <input
            id="goal-target-date"
            type="date"
            value={targetDate()}
            onInput={(e) => setTargetDate(e.currentTarget.value)}
            min={minDate}
          />
        </div>

        <div class="form-group">
          <label>Milestones</label>
          <div class="milestone-input-group">
            <input
              type="text"
              placeholder="Add a milestone"
              value={milestoneInput()}
              onInput={(e) => setMilestoneInput(e.currentTarget.value)}
              onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addMilestone())}
              maxLength={100}
            />
            <button type="button" onClick={addMilestone} class="btn-add">
              Add
            </button>
          </div>
          
          <Show when={milestones().length > 0}>
            <ul class="milestones-list">
              <For each={milestones()}>
                {(milestone, index) => (
                  <li>
                    <span>{milestone}</span>
                    <button
                      type="button"
                      onClick={() => removeMilestone(index())}
                      class="milestone-remove"
                    >
                      ×
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </div>
      </div>

      <Show when={validationError() || props.error}>
        <p class="error-message" role="alert">
          {validationError() || props.error}
        </p>
      </Show>

      <div class="form-actions">
        <button
          type="submit"
          class="btn-primary"
          disabled={props.isSubmitting || !title().trim()}
        >
          {props.isSubmitting ? "Creating..." : "Create Goal"}
        </button>
        
        <Show when={props.onCancel}>
          <button
            type="button"
            class="btn-secondary"
            onClick={props.onCancel}
          >
            Cancel
          </button>
        </Show>
      </div>
    </form>
  );
}