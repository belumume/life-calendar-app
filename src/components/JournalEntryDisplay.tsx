import { Show, For } from "solid-js";
import type { JournalEntry } from "../lib/validation/schemas";
import { sanitizeForDisplay } from "../lib/validation/input-schemas";

interface JournalEntryDisplayProps {
  entry: JournalEntry;
  showDate?: boolean;
}

const MOOD_DISPLAY = {
  great: { emoji: "😄", label: "Great" },
  good: { emoji: "😊", label: "Good" },
  neutral: { emoji: "😐", label: "Neutral" },
  bad: { emoji: "😟", label: "Bad" },
  terrible: { emoji: "😢", label: "Terrible" },
} as const;

export default function JournalEntryDisplay(props: JournalEntryDisplayProps) {
  const entry = () => props.entry;
  const mood = () => entry().mood as keyof typeof MOOD_DISPLAY | undefined;
  
  return (
    <div class="journal-entry-display">
      <Show when={props.showDate}>
        <div class="entry-header">
          <span class="entry-date">
            {new Date(entry().date).toLocaleDateString()}
          </span>
          <Show when={entry().dayNumber}>
            <span class="entry-day">Day {entry().dayNumber}</span>
          </Show>
        </div>
      </Show>
      
      <div class="entry-content">
        {sanitizeForDisplay(entry().content)}
      </div>
      
      <Show when={mood()}>
        <div class="entry-mood">
          <span class="mood-indicator">
            {MOOD_DISPLAY[mood()!].emoji} {MOOD_DISPLAY[mood()!].label}
          </span>
        </div>
      </Show>
      
      <Show when={entry().tags && entry().tags!.length > 0}>
        <div class="entry-tags">
          <For each={entry().tags}>
            {(tag) => <span class="tag-display">{tag}</span>}
          </For>
        </div>
      </Show>
      
      <Show when={entry().achievements && entry().achievements!.length > 0}>
        <div class="entry-section">
          <h5>Achievements</h5>
          <ul class="entry-list">
            <For each={entry().achievements}>
              {(achievement) => <li>{achievement}</li>}
            </For>
          </ul>
        </div>
      </Show>
      
      <Show when={entry().gratitude && entry().gratitude!.length > 0}>
        <div class="entry-section">
          <h5>Gratitude</h5>
          <ul class="entry-list">
            <For each={entry().gratitude}>
              {(item) => <li>{item}</li>}
            </For>
          </ul>
        </div>
      </Show>
    </div>
  );
}