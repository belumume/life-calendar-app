import { createSignal, onMount } from "solid-js";
import { themeService } from "../lib/services/theme-service";

export default function ThemeToggle() {
  const [theme, setTheme] = createSignal(themeService.getTheme());

  onMount(() => {
    const unsubscribe = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
    });
    return unsubscribe;
  });

  const toggleTheme = async () => {
    const current = theme().mode;
    let next: 'light' | 'dark' | 'auto';
    
    if (current === 'light') next = 'dark';
    else if (current === 'dark') next = 'auto';
    else next = 'light';
    
    await themeService.updateTheme({ mode: next });
  };

  const getIcon = () => {
    const mode = theme().mode;
    if (mode === 'light') return '☀️';
    if (mode === 'dark') return '🌙';
    return '🌓';
  };

  const getLabel = () => {
    const mode = theme().mode;
    if (mode === 'light') return 'Light mode';
    if (mode === 'dark') return 'Dark mode';
    return 'Auto mode';
  };

  return (
    <button
      class="theme-toggle"
      onClick={toggleTheme}
      title={getLabel()}
      aria-label={`Switch theme (currently ${getLabel()})`}
    >
      <span class="theme-toggle-icon">{getIcon()}</span>
    </button>
  );
}