import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import GoalCard from '../GoalCard';
import type { Goal } from '../../lib/validation/schemas';

const mockGoal: Goal = {
  id: '1',
  userId: 'user1',
  periodId: 'period1',
  title: 'Test Goal',
  description: 'Test description',
  category: 'personal',
  priority: 'high',
  status: 'active',
  progress: 50,
  targetDate: '2024-12-31',
  milestones: [
    { id: 'm1', title: 'Milestone 1', completed: true, completedAt: '2024-01-01' },
    { id: 'm2', title: 'Milestone 2', completed: false },
  ],
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('GoalCard', () => {
  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnToggleMilestone = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders goal information correctly', () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    expect(screen.getByText('Test Goal')).toBeInTheDocument();
    expect(screen.getByText('Test description')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('displays correct category and priority', () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    expect(screen.getByText(/personal/i)).toBeInTheDocument();
    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
  });

  it('shows target date when available', () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    expect(screen.getByText(/Dec 31, 2024/i)).toBeInTheDocument();
  });

  it('toggles milestone details', async () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    // Milestones should be hidden initially
    expect(screen.queryByText('Milestone 1')).not.toBeInTheDocument();

    // Click to show milestones
    const toggleButton = screen.getByText(/Show Milestones/i);
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Milestone 1')).toBeInTheDocument();
      expect(screen.getByText('Milestone 2')).toBeInTheDocument();
    });
  });

  it('handles milestone toggle', async () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    // Show milestones
    const toggleButton = screen.getByText(/Show Milestones/i);
    fireEvent.click(toggleButton);

    await waitFor(() => {
      const milestone2Checkbox = screen.getByRole('checkbox', { name: /Milestone 2/i });
      fireEvent.click(milestone2Checkbox);
    });

    expect(mockOnToggleMilestone).toHaveBeenCalledWith('1', 'm2');
  });

  it('updates progress when slider changes', () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    const progressSlider = screen.getByRole('slider', { name: /progress/i });
    fireEvent.change(progressSlider, { target: { value: '75' } });

    expect(mockOnUpdate).toHaveBeenCalledWith('1', 75);
  });

  it('shows completed badge for completed goals', () => {
    const completedGoal = { ...mockGoal, status: 'completed' as const, progress: 100 };
    
    render(() => (
      <GoalCard
        goal={completedGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    expect(screen.getByText('✓ Completed')).toBeInTheDocument();
  });

  it('disables progress slider for completed goals', () => {
    const completedGoal = { ...mockGoal, status: 'completed' as const };
    
    render(() => (
      <GoalCard
        goal={completedGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    const progressSlider = screen.getByRole('slider', { name: /progress/i });
    expect(progressSlider).toBeDisabled();
  });

  it('shows delete confirmation dialog', async () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/Are you sure/i)).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('cancels delete when cancel is clicked', async () => {
    render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);
    });

    expect(mockOnDelete).not.toHaveBeenCalled();
    expect(screen.queryByText(/Are you sure/i)).not.toBeInTheDocument();
  });

  it('applies correct styling based on priority', () => {
    const { container } = render(() => (
      <GoalCard
        goal={mockGoal}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    const card = container.querySelector('.goal-card');
    expect(card).toHaveClass('priority-high');
  });

  it('handles goals without milestones', () => {
    const goalNoMilestones = { ...mockGoal, milestones: undefined };
    
    render(() => (
      <GoalCard
        goal={goalNoMilestones}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onToggleMilestone={mockOnToggleMilestone}
      />
    ));

    // Should not show milestones toggle
    expect(screen.queryByText(/Show Milestones/i)).not.toBeInTheDocument();
  });
});