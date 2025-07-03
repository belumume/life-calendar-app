import { createSignal, For, Show, onMount } from "solid-js";
import { appService } from "../lib/services/app-service";
import JournalEntryDisplay from "./JournalEntryDisplay";
import type { JournalEntry } from "../lib/validation/schemas";

interface JournalListProps {
  pageSize?: number;
}

export default function JournalList(props: JournalListProps) {
  const pageSize = () => props.pageSize || 5;
  
  const [entries, setEntries] = createSignal<JournalEntry[]>([]);
  const [currentPage, setCurrentPage] = createSignal(1);
  const [totalEntries, setTotalEntries] = createSignal(0);
  const [hasMore, setHasMore] = createSignal(false);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  
  const totalPages = () => Math.ceil(totalEntries() / pageSize());
  
  const loadEntries = async (page: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await appService.getJournalEntriesPaginated(page, pageSize());
      setEntries(result.entries);
      setTotalEntries(result.total);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (err) {
      console.error("Failed to load entries:", err);
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setIsLoading(false);
    }
  };
  
  onMount(() => {
    loadEntries(1);
  });
  
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages()) {
      loadEntries(page);
    }
  };
  
  return (
    <div class="journal-list">
      <Show when={!isLoading()} fallback={<div class="loading">Loading entries...</div>}>
        <Show when={entries().length > 0} fallback={<p>No journal entries yet.</p>}>
          <div class="entries-info">
            <p>Showing {entries().length} of {totalEntries()} entries</p>
          </div>
          
          <div class="entries-container">
            <For each={entries()}>
              {(entry) => <JournalEntryDisplay entry={entry} showDate={true} />}
            </For>
          </div>
          
          <Show when={totalPages() > 1}>
            <div class="pagination">
              <button
                class="btn-secondary"
                disabled={currentPage() === 1}
                onClick={() => goToPage(currentPage() - 1)}
              >
                ← Previous
              </button>
              
              <span class="page-info">
                Page {currentPage()} of {totalPages()}
              </span>
              
              <button
                class="btn-secondary"
                disabled={!hasMore()}
                onClick={() => goToPage(currentPage() + 1)}
              >
                Next →
              </button>
            </div>
          </Show>
        </Show>
      </Show>
      
      <Show when={error()}>
        <div class="error-message" role="alert">
          {error()}
        </div>
      </Show>
    </div>
  );
}