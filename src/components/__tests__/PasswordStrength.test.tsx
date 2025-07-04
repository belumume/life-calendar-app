import { describe, it, expect } from 'vitest';
import { render, screen } from '@solidjs/testing-library';
import PasswordStrength from '../PasswordStrength';

describe('PasswordStrength', () => {
  it('shows weak strength for short passwords', () => {
    render(() => <PasswordStrength password="abc" />);
    
    expect(screen.getByText('Weak')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  it('shows medium strength for moderate passwords', () => {
    render(() => <PasswordStrength password="password123" />);
    
    expect(screen.getByText('Medium')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
  });

  it('shows strong strength for complex passwords', () => {
    render(() => <PasswordStrength password="P@ssw0rd!123" />);
    
    expect(screen.getByText('Strong')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('shows very strong strength for very complex passwords', () => {
    render(() => <PasswordStrength password="MyV3ry$tr0ng!P@ssw0rd#2024" />);
    
    expect(screen.getByText('Very Strong')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('handles empty password', () => {
    render(() => <PasswordStrength password="" />);
    
    // Should show weak or no strength indicator
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('updates strength when password changes', () => {
    let password = 'weak';
    const { rerender } = render(() => <PasswordStrength password={password} />);
    
    expect(screen.getByText('Weak')).toBeInTheDocument();
    
    // Update password
    password = 'MyStr0ng!P@ssw0rd';
    rerender(() => <PasswordStrength password={password} />);
    
    expect(screen.queryByText('Weak')).not.toBeInTheDocument();
    expect(screen.getByText(/Strong/)).toBeInTheDocument();
  });

  it('has appropriate ARIA attributes', () => {
    render(() => <PasswordStrength password="test123" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    expect(progressBar).toHaveAttribute('aria-label', 'Password strength');
  });

  it('applies correct CSS classes based on strength', () => {
    const { container, rerender } = render(() => <PasswordStrength password="weak" />);
    
    let strengthBar = container.querySelector('.strength-bar');
    expect(strengthBar).toHaveClass('strength-weak');
    
    rerender(() => <PasswordStrength password="Medium123!" />);
    strengthBar = container.querySelector('.strength-bar');
    expect(strengthBar).toHaveClass('strength-medium');
    
    rerender(() => <PasswordStrength password="V3ry$tr0ng!" />);
    strengthBar = container.querySelector('.strength-bar');
    expect(strengthBar).toHaveClass('strength-strong');
  });
});