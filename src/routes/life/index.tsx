import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

export default function LifeView() {
  const [birthDate] = createSignal(typeof window !== "undefined" ? localStorage.getItem("birthDate") || "" : "");
  const weeksInYear = 52;
  const yearsToShow = 90; // Show 90 years

  const calculateAge = () => {
    if (!birthDate()) return 0;
    const birth = new Date(birthDate());
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  const calculateWeeksLived = () => {
    if (!birthDate()) return 0;
    const birth = new Date(birthDate());
    const now = new Date();
    return Math.floor((now.getTime() - birth.getTime()) / (7 * 24 * 60 * 60 * 1000));
  };

  const weeksLived = calculateWeeksLived();
  const currentWeek = weeksLived % weeksInYear;
  const currentYear = Math.floor(weeksLived / weeksInYear);

  return (
    <main class="life-view">
      <Title>Life in Weeks - MyLife Calendar</Title>
      
      <header class="view-header">
        <A href="/" class="back-link">←</A>
        <h1>Your Life in Weeks</h1>
        <div class="header-actions">
          <button class="icon-btn">⚙️</button>
        </div>
      </header>

      <Show when={birthDate()}>
        <div class="life-info">
          <p>Birth: {new Date(birthDate()).toLocaleDateString()} ({calculateAge()} years old)</p>
          <p class="weeks-count">{weeksLived.toLocaleString()} weeks lived</p>
        </div>
      </Show>

      <div class="life-grid">
        <div class="year-labels">
          <div class="week-numbers">
            <span>Weeks →</span>
          </div>
          <For each={Array(yearsToShow)}>
            {(_, year) => (
              <div class="year-label">{year() * 10}</div>
            )}
          </For>
        </div>

        <div class="weeks-container">
          <div class="week-numbers">
            <For each={Array(weeksInYear)}>
              {(_, week) => (
                <div class="week-number">{week() + 1}</div>
              )}
            </For>
          </div>

          <div class="weeks-grid">
            <For each={Array(yearsToShow)}>
              {(_, year) => (
                <div class="year-row">
                  <For each={Array(weeksInYear)}>
                    {(_, week) => {
                      const weekNumber = year() * weeksInYear + week();
                      const isLived = weekNumber < weeksLived;
                      const isCurrent = year() === currentYear && week() === currentWeek;
                      
                      return (
                        <div 
                          class="week-cell"
                          classList={{
                            lived: isLived,
                            current: isCurrent,
                            future: !isLived && !isCurrent
                          }}
                          title={`Year ${year()}, Week ${week() + 1}`}
                        />
                      );
                    }}
                  </For>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      <div class="life-legend">
        <span><span class="legend-box lived"></span> Lived</span>
        <span><span class="legend-box future"></span> Future</span>
        <span><span class="legend-box current"></span> Current Week</span>
      </div>

      <nav class="view-actions">
        <A href="/period" class="btn-secondary">View 88-Day Summer</A>
        <button class="btn-secondary">Journal</button>
        <button class="btn-secondary">Export Data</button>
      </nav>
    </main>
  );
}