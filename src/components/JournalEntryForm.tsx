import { createSignal, Show, For } from "solid-js";
import { JournalEntryFormSchema, MoodSchema, TagSchema, ListItemSchema } from "../lib/validation/input-schemas";
import { z } from "zod";

interface JournalEntryFormProps {
  onSubmit: (data: z.infer<typeof JournalEntryFormSchema>) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

const MOOD_OPTIONS = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "😊", label: "Good" },
  { value: "neutral", emoji: "😐", label: "Neutral" },
  { value: "bad", emoji: "😟", label: "Bad" },
  { value: "terrible", emoji: "😢", label: "Terrible" },
] as const;

export default function JournalEntryForm(props: JournalEntryFormProps) {
  const [content, setContent] = createSignal("");
  const [mood, setMood] = createSignal<z.infer<typeof MoodSchema> | undefined>();
  const [tagInput, setTagInput] = createSignal("");
  const [tags, setTags] = createSignal<string[]>([]);
  const [achievementInput, setAchievementInput] = createSignal("");
  const [achievements, setAchievements] = createSignal<string[]>([]);
  const [gratitudeInput, setGratitudeInput] = createSignal("");
  const [gratitude, setGratitude] = createSignal<string[]>([]);
  const [validationError, setValidationError] = createSignal<string | null>(null);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setValidationError(null);

    try {
      const formData = JournalEntryFormSchema.parse({
        content: content(),
        mood: mood(),
        tags: tags(),
        achievements: achievements(),
        gratitude: gratitude(),
      });

      await props.onSubmit(formData);

      // Reset form on success
      setContent("");
      setMood(undefined);
      setTags([]);
      setAchievements([]);
      setGratitude([]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  const addTag = () => {
    const input = tagInput().trim();
    if (!input) return;

    try {
      const validatedTag = TagSchema.parse(input);
      if (!tags().includes(validatedTag)) {
        setTags([...tags(), validatedTag]);
        setTagInput("");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags().filter(t => t !== tag));
  };

  const addAchievement = () => {
    const input = achievementInput().trim();
    if (!input) return;

    try {
      const validated = ListItemSchema.parse(input);
      setAchievements([...achievements(), validated]);
      setAchievementInput("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  const removeAchievement = (index: number) => {
    setAchievements(achievements().filter((_, i) => i !== index));
  };

  const addGratitude = () => {
    const input = gratitudeInput().trim();
    if (!input) return;

    try {
      const validated = ListItemSchema.parse(input);
      setGratitude([...gratitude(), validated]);
      setGratitudeInput("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        setValidationError(error.errors[0].message);
      }
    }
  };

  const removeGratitude = (index: number) => {
    setGratitude(gratitude().filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} class="journal-entry-form">
      <div class="form-section">
        <h3>How was today?</h3>
        <textarea
          placeholder="What did you accomplish? How are you feeling? What's on your mind?"
          value={content()}
          onInput={(e) => setContent(e.currentTarget.value)}
          rows={4}
          required
          class="journal-content"
        />
      </div>

      <div class="form-section">
        <h4>How are you feeling?</h4>
        <div class="mood-selector">
          <For each={MOOD_OPTIONS}>
            {(option) => (
              <button
                type="button"
                class={`mood-button ${mood() === option.value ? "selected" : ""}`}
                onClick={() => setMood(option.value)}
                title={option.label}
              >
                <span class="mood-emoji">{option.emoji}</span>
                <span class="mood-label">{option.label}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="form-section">
        <h4>Tags</h4>
        <div class="tag-input-group">
          <input
            type="text"
            placeholder="Add a tag (e.g., work, health, family)"
            value={tagInput()}
            onInput={(e) => setTagInput(e.currentTarget.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            class="tag-input"
          />
          <button type="button" onClick={addTag} class="btn-add">
            Add
          </button>
        </div>
        <Show when={tags().length > 0}>
          <div class="tags-list">
            <For each={tags()}>
              {(tag) => (
                <span class="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    class="tag-remove"
                  >
                    ×
                  </button>
                </span>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="form-section">
        <h4>Achievements</h4>
        <div class="list-input-group">
          <input
            type="text"
            placeholder="What did you achieve today?"
            value={achievementInput()}
            onInput={(e) => setAchievementInput(e.currentTarget.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addAchievement())}
            class="list-input"
          />
          <button type="button" onClick={addAchievement} class="btn-add">
            Add
          </button>
        </div>
        <Show when={achievements().length > 0}>
          <ul class="achievements-list">
            <For each={achievements()}>
              {(achievement, index) => (
                <li>
                  {achievement}
                  <button
                    type="button"
                    onClick={() => removeAchievement(index())}
                    class="list-remove"
                  >
                    ×
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <div class="form-section">
        <h4>Gratitude</h4>
        <div class="list-input-group">
          <input
            type="text"
            placeholder="What are you grateful for?"
            value={gratitudeInput()}
            onInput={(e) => setGratitudeInput(e.currentTarget.value)}
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addGratitude())}
            class="list-input"
          />
          <button type="button" onClick={addGratitude} class="btn-add">
            Add
          </button>
        </div>
        <Show when={gratitude().length > 0}>
          <ul class="gratitude-list">
            <For each={gratitude()}>
              {(item, index) => (
                <li>
                  {item}
                  <button
                    type="button"
                    onClick={() => removeGratitude(index())}
                    class="list-remove"
                  >
                    ×
                  </button>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>

      <Show when={validationError() || props.error}>
        <p class="error-message" role="alert">
          {validationError() || props.error}
        </p>
      </Show>

      <button
        type="submit"
        class="btn-primary submit-button"
        disabled={props.isSubmitting || !content().trim()}
      >
        {props.isSubmitting ? "Saving..." : "Save Entry"}
      </button>
    </form>
  );
}