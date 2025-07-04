import { createSignal, For, Show } from "solid-js";
import { GoalFormSchema } from "../lib/validation/input-schemas";
import { useFormValidation, createFieldProps } from "../hooks/useFormValidation";
import type { z } from "zod";

interface GoalFormProps {
  onSubmit: (data: z.infer<typeof GoalFormSchema>) => Promise<void>;
  isSubmitting?: boolean;
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

export default function GoalFormRefactored(props: GoalFormProps) {
  const [milestoneInput, setMilestoneInput] = createSignal("");
  const [milestones, setMilestones] = createSignal<string[]>([]);
  
  // Use the form validation hook
  const form = useFormValidation(
    {
      title: "",
      description: "",
      category: "personal" as z.infer<typeof GoalFormSchema>['category'],
      priority: "medium" as z.infer<typeof GoalFormSchema>['priority'],
      targetDate: "",
    },
    {
      schema: GoalFormSchema.omit({ milestones: true }), // Handle milestones separately
      onSubmit: async (data) => {
        const fullData = {
          ...data,
          description: data.description || undefined,
          targetDate: data.targetDate || undefined,
          milestones: milestones().map(title => ({ title })),
        };
        await props.onSubmit(fullData as z.infer<typeof GoalFormSchema>);
        setMilestones([]);
      },
    }
  );

  const addMilestone = () => {
    const input = milestoneInput().trim();
    if (input && milestones().length < 10) {
      setMilestones([...milestones(), input]);
      setMilestoneInput("");
    }
  };

  const removeMilestone = (index: number) => {
    setMilestones(milestones().filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addMilestone();
    }
  };

  return (
    <form class="goal-form" onSubmit={form.handleSubmit}>
      <h2>Create New Goal</h2>
      
      <Show when={form.validationError() || props.error}>
        <p class="error-message" role="alert">
          {form.validationError() || props.error}
        </p>
      </Show>

      <div class="form-group">
        <label for="title">Goal Title *</label>
        <input
          id="title"
          type="text"
          placeholder="What do you want to achieve?"
          {...createFieldProps(form.fields.title)}
          required
        />
        <Show when={form.fields.title.error()}>
          <span class="field-error" id="title-error">
            {form.fields.title.error()}
          </span>
        </Show>
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          placeholder="Add more details about your goal..."
          rows="3"
          {...createFieldProps(form.fields.description)}
        />
      </div>

      <div class="form-group">
        <label for="category">Category</label>
        <select
          id="category"
          value={form.fields.category.value()}
          onChange={(e) => form.fields.category.setValue(e.currentTarget.value as any)}
        >
          <For each={CATEGORIES}>
            {(cat) => (
              <option value={cat.value} style={{ color: cat.color }}>
                {cat.label}
              </option>
            )}
          </For>
        </select>
      </div>

      <div class="form-group">
        <label for="priority">Priority</label>
        <select
          id="priority"
          value={form.fields.priority.value()}
          onChange={(e) => form.fields.priority.setValue(e.currentTarget.value as any)}
        >
          <For each={PRIORITIES}>
            {(pri) => (
              <option value={pri.value} style={{ color: pri.color }}>
                {pri.label}
              </option>
            )}
          </For>
        </select>
      </div>

      <div class="form-group">
        <label for="targetDate">Target Date</label>
        <input
          id="targetDate"
          type="date"
          min={new Date().toISOString().split('T')[0]}
          {...createFieldProps(form.fields.targetDate)}
        />
      </div>

      <div class="form-group">
        <label for="milestones">Milestones</label>
        <div class="milestone-input-group">
          <input
            id="milestones"
            type="text"
            placeholder="Add a milestone..."
            value={milestoneInput()}
            onInput={(e) => setMilestoneInput(e.currentTarget.value)}
            onKeyPress={handleKeyPress}
            disabled={milestones().length >= 10}
          />
          <button
            type="button"
            onClick={addMilestone}
            disabled={!milestoneInput().trim() || milestones().length >= 10}
          >
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
                    class="remove-btn"
                    onClick={() => removeMilestone(index())}
                    aria-label="Remove milestone"
                  >
                    ×
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
        
        <Show when={milestones().length >= 10}>
          <p class="hint">Maximum 10 milestones allowed</p>
        </Show>
      </div>

      <div class="form-actions">
        <button
          type="submit"
          class="btn-primary"
          disabled={form.isSubmitting() || props.isSubmitting}
        >
          {form.isSubmitting() || props.isSubmitting ? "Creating..." : "Create Goal"}
        </button>
        
        <Show when={props.onCancel}>
          <button
            type="button"
            class="btn-secondary"
            onClick={props.onCancel}
            disabled={form.isSubmitting() || props.isSubmitting}
          >
            Cancel
          </button>
        </Show>
      </div>
    </form>
  );
}