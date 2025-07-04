import { createSignal, For, Show, onMount, createEffect } from "solid-js";
import { themeService } from "../lib/services/theme-service";
import type { Theme } from "../lib/validation/schemas";

export default function ThemeSettings() {
  const [theme, setTheme] = createSignal<Theme>(themeService.getTheme());
  const [isUpdating, setIsUpdating] = createSignal(false);

  onMount(() => {
    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((newTheme) => {
      setTheme(newTheme);
    });

    return unsubscribe;
  });

  const handleThemeUpdate = async (updates: Partial<Theme>) => {
    setIsUpdating(true);
    try {
      await themeService.updateTheme(updates);
    } catch (error) {
      console.error('Failed to update theme:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const presetThemes = themeService.getPresetThemes();

  return (
    <div class="theme-settings">
      <h3>Appearance & Theming</h3>
      
      <div class="theme-section">
        <h4>Color Mode</h4>
        <div class="theme-mode-selector">
          <button
            class={`mode-option ${theme().mode === 'light' ? 'active' : ''}`}
            onClick={() => handleThemeUpdate({ mode: 'light' })}
            disabled={isUpdating()}
          >
            <span class="mode-icon">☀️</span>
            <span>Light</span>
          </button>
          <button
            class={`mode-option ${theme().mode === 'dark' ? 'active' : ''}`}
            onClick={() => handleThemeUpdate({ mode: 'dark' })}
            disabled={isUpdating()}
          >
            <span class="mode-icon">🌙</span>
            <span>Dark</span>
          </button>
          <button
            class={`mode-option ${theme().mode === 'auto' ? 'active' : ''}`}
            onClick={() => handleThemeUpdate({ mode: 'auto' })}
            disabled={isUpdating()}
          >
            <span class="mode-icon">🌓</span>
            <span>Auto</span>
          </button>
        </div>
      </div>

      <div class="theme-section">
        <h4>Color Theme</h4>
        <div class="preset-themes">
          <For each={presetThemes}>
            {(preset) => (
              <button
                class={`preset-theme ${
                  theme().primaryColor === preset.primaryColor && 
                  theme().accentColor === preset.accentColor ? 'active' : ''
                }`}
                onClick={() => handleThemeUpdate({
                  primaryColor: preset.primaryColor,
                  accentColor: preset.accentColor
                })}
                disabled={isUpdating()}
                title={preset.name}
              >
                <div 
                  class="color-preview"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primaryColor} 50%, ${preset.accentColor} 50%)`
                  }}
                />
                <span class="preset-name">{preset.name}</span>
              </button>
            )}
          </For>
        </div>

        <div class="custom-colors">
          <div class="color-input-group">
            <label for="primary-color">Primary Color</label>
            <div class="color-input-wrapper">
              <input
                id="primary-color"
                type="color"
                value={theme().primaryColor}
                onInput={(e) => handleThemeUpdate({ primaryColor: e.currentTarget.value })}
                disabled={isUpdating()}
              />
              <input
                type="text"
                value={theme().primaryColor}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  if (/^#[0-9A-F]{6}$/i.test(value)) {
                    handleThemeUpdate({ primaryColor: value });
                  }
                }}
                disabled={isUpdating()}
                placeholder="#3b82f6"
                maxLength={7}
              />
            </div>
          </div>

          <div class="color-input-group">
            <label for="accent-color">Accent Color</label>
            <div class="color-input-wrapper">
              <input
                id="accent-color"
                type="color"
                value={theme().accentColor}
                onInput={(e) => handleThemeUpdate({ accentColor: e.currentTarget.value })}
                disabled={isUpdating()}
              />
              <input
                type="text"
                value={theme().accentColor}
                onInput={(e) => {
                  const value = e.currentTarget.value;
                  if (/^#[0-9A-F]{6}$/i.test(value)) {
                    handleThemeUpdate({ accentColor: value });
                  }
                }}
                disabled={isUpdating()}
                placeholder="#8b5cf6"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      <div class="theme-section">
        <h4>Typography</h4>
        
        <div class="form-group">
          <label for="font-size">Font Size</label>
          <select
            id="font-size"
            value={theme().fontSize}
            onChange={(e) => handleThemeUpdate({ fontSize: e.currentTarget.value as Theme['fontSize'] })}
            disabled={isUpdating()}
          >
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        <div class="form-group">
          <label for="font-family">Font Style</label>
          <select
            id="font-family"
            value={theme().fontFamily}
            onChange={(e) => handleThemeUpdate({ fontFamily: e.currentTarget.value as Theme['fontFamily'] })}
            disabled={isUpdating()}
          >
            <option value="system">System Default</option>
            <option value="serif">Serif</option>
            <option value="mono">Monospace</option>
          </select>
        </div>
      </div>

      <div class="theme-section">
        <h4>Accessibility</h4>
        
        <label class="checkbox-label">
          <input
            type="checkbox"
            checked={theme().reducedMotion}
            onChange={(e) => handleThemeUpdate({ reducedMotion: e.currentTarget.checked })}
            disabled={isUpdating()}
          />
          <span>Reduce motion and animations</span>
        </label>
        <p class="help-text">
          Disables animations and transitions for users who prefer reduced motion.
        </p>
      </div>

      <div class="theme-preview">
        <h4>Preview</h4>
        <div class="preview-card">
          <div class="preview-header">
            <h5>Sample Card</h5>
            <span class="preview-badge">New</span>
          </div>
          <p class="preview-text">
            This is how your content will look with the current theme settings.
          </p>
          <div class="preview-buttons">
            <button class="btn-primary">Primary Button</button>
            <button class="btn-secondary">Secondary</button>
          </div>
        </div>
      </div>
    </div>
  );
}