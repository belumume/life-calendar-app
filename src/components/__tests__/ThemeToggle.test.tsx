import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@solidjs/testing-library';
import ThemeToggle from '../ThemeToggle';
import { themeService } from '../../lib/services/theme-service';

// Mock theme service
vi.mock('../../lib/services/theme-service', () => ({
  themeService: {
    getTheme: vi.fn(() => 'light'),
    setTheme: vi.fn(),
    initialize: vi.fn(),
  }
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with current theme', () => {
    render(() => <ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('displays correct icon for light theme', () => {
    vi.mocked(themeService.getTheme).mockReturnValue('light');
    
    render(() => <ThemeToggle />);
    
    // Should show moon icon when in light theme (to switch to dark)
    expect(screen.getByText('🌙')).toBeInTheDocument();
  });

  it('displays correct icon for dark theme', () => {
    vi.mocked(themeService.getTheme).mockReturnValue('dark');
    
    render(() => <ThemeToggle />);
    
    // Should show sun icon when in dark theme (to switch to light)
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    vi.mocked(themeService.getTheme).mockReturnValue('light');
    
    render(() => <ThemeToggle />);
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    expect(themeService.setTheme).toHaveBeenCalledWith('dark');
  });

  it('updates icon after theme change', async () => {
    let currentTheme = 'light';
    vi.mocked(themeService.getTheme).mockImplementation(() => currentTheme);
    vi.mocked(themeService.setTheme).mockImplementation((theme) => {
      currentTheme = theme;
    });
    
    const { rerender } = render(() => <ThemeToggle />);
    
    expect(screen.getByText('🌙')).toBeInTheDocument();
    
    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);
    
    // Simulate theme change
    currentTheme = 'dark';
    rerender(() => <ThemeToggle />);
    
    expect(screen.getByText('☀️')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(() => <ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label');
    expect(button).toHaveAttribute('title');
  });

  it('handles system theme preference', () => {
    vi.mocked(themeService.getTheme).mockReturnValue('system');
    
    render(() => <ThemeToggle />);
    
    // Should still render without errors
    const button = screen.getByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('applies correct CSS classes', () => {
    render(() => <ThemeToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-toggle');
  });
});