import type { Theme } from '../validation/schemas';
import { ThemeSchema } from '../validation/schemas';
import { appService } from './app-service';

export class ThemeService {
  private currentTheme: Theme = ThemeSchema.parse({});
  private mediaQuery: MediaQueryList | null = null;
  private listeners: Set<(theme: Theme) => void> = new Set();

  constructor() {
    // Set up media query for dark mode preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.mediaQuery.addEventListener('change', this.handleSystemThemeChange.bind(this));
    }
  }

  private handleSystemThemeChange() {
    if (this.currentTheme.mode === 'auto') {
      this.applyTheme();
      this.notifyListeners();
    }
  }

  async initialize(): Promise<void> {
    // Load theme from user preferences
    const user = appService.getCurrentUser();
    if (user?.theme) {
      this.currentTheme = user.theme;
    }
    this.applyTheme();
  }

  getTheme(): Theme {
    return { ...this.currentTheme };
  }

  async updateTheme(updates: Partial<Theme>): Promise<void> {
    // Validate and merge updates
    const newTheme = ThemeSchema.parse({ ...this.currentTheme, ...updates });
    this.currentTheme = newTheme;

    // Save to user preferences
    const user = appService.getCurrentUser();
    if (user) {
      await appService.updateUserTheme(newTheme);
    }

    // Apply theme
    this.applyTheme();
    this.notifyListeners();
  }

  private applyTheme(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const isDark = this.isDarkMode();

    // Apply color mode
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Apply custom colors
    root.style.setProperty('--color-primary', this.currentTheme.primaryColor);
    root.style.setProperty('--color-accent', this.currentTheme.accentColor);

    // Generate color variations
    root.style.setProperty('--color-primary-light', this.lightenColor(this.currentTheme.primaryColor, 20));
    root.style.setProperty('--color-primary-dark', this.darkenColor(this.currentTheme.primaryColor, 20));
    root.style.setProperty('--color-accent-light', this.lightenColor(this.currentTheme.accentColor, 20));
    root.style.setProperty('--color-accent-dark', this.darkenColor(this.currentTheme.accentColor, 20));

    // Apply font size
    const fontSizes = {
      small: '14px',
      medium: '16px',
      large: '18px'
    };
    root.style.setProperty('--font-size-base', fontSizes[this.currentTheme.fontSize]);

    // Apply font family
    const fontFamilies = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, "Times New Roman", Times, serif',
      mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace'
    };
    root.style.setProperty('--font-family', fontFamilies[this.currentTheme.fontFamily]);

    // Apply reduced motion
    if (this.currentTheme.reducedMotion) {
      root.classList.add('reduced-motion');
    } else {
      root.classList.remove('reduced-motion');
    }

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#1a1a1a' : '#ffffff');
    }
  }

  private isDarkMode(): boolean {
    if (this.currentTheme.mode === 'dark') return true;
    if (this.currentTheme.mode === 'light') return false;
    
    // Auto mode - check system preference
    return this.mediaQuery?.matches ?? false;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
      (G > 0 ? G : 0) * 0x100 +
      (B > 0 ? B : 0))
      .toString(16).slice(1);
  }

  // Subscribe to theme changes
  subscribe(listener: (theme: Theme) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentTheme));
  }

  // Get preset themes
  getPresetThemes() {
    return [
      {
        name: 'Ocean Blue',
        primaryColor: '#3b82f6',
        accentColor: '#06b6d4'
      },
      {
        name: 'Forest Green',
        primaryColor: '#22c55e',
        accentColor: '#84cc16'
      },
      {
        name: 'Sunset Orange',
        primaryColor: '#f97316',
        accentColor: '#f59e0b'
      },
      {
        name: 'Royal Purple',
        primaryColor: '#8b5cf6',
        accentColor: '#a855f7'
      },
      {
        name: 'Cherry Red',
        primaryColor: '#ef4444',
        accentColor: '#ec4899'
      },
      {
        name: 'Monochrome',
        primaryColor: '#6b7280',
        accentColor: '#374151'
      }
    ];
  }
}

export const themeService = new ThemeService();