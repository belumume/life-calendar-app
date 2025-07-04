import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver } from '../conflict-resolver';
import { JournalEntry, Goal, Habit, User } from '../../types';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver('newest-wins');
  });

  describe('resolveJournalConflict', () => {
    const baseEntry: JournalEntry = {
      id: 'entry-1',
      userId: 'user-1',
      date: '2025-01-01',
      content: 'encrypted-content-1',
      iv: 'iv-1',
      mood: 'good',
      tags: ['work'],
      achievements: ['finished project'],
      gratitude: ['family'],
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
    };

    it('should use newest entry with newest-wins strategy', () => {
      const local = { ...baseEntry, updatedAt: '2025-01-01T11:00:00Z' };
      const remote = { ...baseEntry, updatedAt: '2025-01-01T12:00:00Z', content: 'encrypted-content-2' };

      const result = resolver.resolveJournalConflict(local, remote);

      expect(result.resolved.content).toBe('encrypted-content-2');
      expect(result.strategy).toBe('newest-wins');
    });

    it('should merge arrays with merge strategy', () => {
      resolver = new ConflictResolver('merge');
      
      const local = {
        ...baseEntry,
        tags: ['work', 'personal'],
        achievements: ['finished project'],
        gratitude: ['family'],
        updatedAt: '2025-01-01T11:00:00Z',
      };
      
      const remote = {
        ...baseEntry,
        tags: ['work', 'health'],
        achievements: ['went to gym'],
        gratitude: ['family', 'friends'],
        updatedAt: '2025-01-01T10:00:00Z',
      };

      const result = resolver.resolveJournalConflict(local, remote);

      expect(result.resolved.tags).toEqual(['work', 'personal', 'health']);
      expect(result.resolved.achievements).toEqual(['finished project', 'went to gym']);
      expect(result.resolved.gratitude).toEqual(['family', 'friends']);
      expect(result.resolved.content).toBe(local.content); // Local is newer
    });

    it('should track conflicts when content differs', () => {
      resolver = new ConflictResolver('merge');
      
      const local = { ...baseEntry, content: 'local-content', updatedAt: '2025-01-01T10:00:00Z' };
      const remote = { ...baseEntry, content: 'remote-content', updatedAt: '2025-01-01T11:00:00Z' };

      const result = resolver.resolveJournalConflict(local, remote);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toEqual({
        field: 'content',
        localValue: 'encrypted',
        remoteValue: 'encrypted',
        resolution: 'remote'
      });
    });
  });

  describe('resolveGoalConflict', () => {
    const baseGoal: Goal = {
      id: 'goal-1',
      userId: 'user-1',
      title: 'Test Goal',
      description: 'Test Description',
      targetValue: 100,
      currentValue: 50,
      progress: 50,
      status: 'active',
      encryptedData: 'encrypted',
      iv: 'iv',
      milestones: [
        { id: 'm1', title: 'Milestone 1', targetValue: 25, completed: false },
        { id: 'm2', title: 'Milestone 2', targetValue: 50, completed: false },
      ],
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
    };

    it('should use highest progress with merge strategy', () => {
      resolver = new ConflictResolver('merge');
      
      const local = { ...baseGoal, progress: 60, currentValue: 60 };
      const remote = { ...baseGoal, progress: 80, currentValue: 80 };

      const result = resolver.resolveGoalConflict(local, remote);

      expect(result.resolved.progress).toBe(80);
      expect(result.conflicts[0]).toEqual({
        field: 'progress',
        localValue: 60,
        remoteValue: 80,
        resolution: 'remote'
      });
    });

    it('should preserve completed status', () => {
      resolver = new ConflictResolver('merge');
      
      const local = { ...baseGoal, status: 'active' as const };
      const remote = { ...baseGoal, status: 'completed' as const, completedAt: '2025-01-02T10:00:00Z' };

      const result = resolver.resolveGoalConflict(local, remote);

      expect(result.resolved.status).toBe('completed');
      expect(result.resolved.completedAt).toBe('2025-01-02T10:00:00Z');
    });

    it('should merge milestone completions', () => {
      resolver = new ConflictResolver('merge');
      
      const local = {
        ...baseGoal,
        milestones: [
          { id: 'm1', title: 'Milestone 1', targetValue: 25, completed: true },
          { id: 'm2', title: 'Milestone 2', targetValue: 50, completed: false },
        ],
      };
      
      const remote = {
        ...baseGoal,
        milestones: [
          { id: 'm1', title: 'Milestone 1', targetValue: 25, completed: false },
          { id: 'm2', title: 'Milestone 2', targetValue: 50, completed: true },
        ],
      };

      const result = resolver.resolveGoalConflict(local, remote);

      expect(result.resolved.milestones?.[0].completed).toBe(true);
      expect(result.resolved.milestones?.[1].completed).toBe(true);
    });
  });

  describe('resolveHabitConflict', () => {
    const baseHabit: Habit = {
      id: 'habit-1',
      userId: 'user-1',
      name: 'Exercise',
      description: 'Daily exercise',
      frequency: 'daily',
      completions: [],
      currentStreak: 0,
      longestStreak: 0,
      encryptedData: 'encrypted',
      iv: 'iv',
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
    };

    it('should merge completions without duplicates', () => {
      resolver = new ConflictResolver('merge');
      
      const local = {
        ...baseHabit,
        completions: [
          { date: '2025-01-01', notes: 'Morning run' },
          { date: '2025-01-02', notes: 'Gym session' },
        ],
      };
      
      const remote = {
        ...baseHabit,
        completions: [
          { date: '2025-01-01', notes: 'Morning run' },
          { date: '2025-01-03', notes: 'Evening walk' },
        ],
      };

      const result = resolver.resolveHabitConflict(local, remote);

      expect(result.resolved.completions).toHaveLength(3);
      expect(result.resolved.completions?.map(c => c.date).sort()).toEqual([
        '2025-01-01',
        '2025-01-02',
        '2025-01-03',
      ]);
    });

    it('should preserve notes when merging completions', () => {
      resolver = new ConflictResolver('merge');
      
      const local = {
        ...baseHabit,
        completions: [
          { date: '2025-01-01' }, // No notes
        ],
      };
      
      const remote = {
        ...baseHabit,
        completions: [
          { date: '2025-01-01', notes: 'Great workout!' },
        ],
      };

      const result = resolver.resolveHabitConflict(local, remote);

      expect(result.resolved.completions?.[0].notes).toBe('Great workout!');
    });

    it('should recalculate streaks after merging', () => {
      resolver = new ConflictResolver('merge');
      
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      const local = {
        ...baseHabit,
        completions: [
          { date: yesterday.toISOString().split('T')[0] },
        ],
        currentStreak: 1,
        longestStreak: 1,
      };
      
      const remote = {
        ...baseHabit,
        completions: [
          { date: today.toISOString().split('T')[0] },
          { date: twoDaysAgo.toISOString().split('T')[0] },
        ],
        currentStreak: 1,
        longestStreak: 2,
      };

      const result = resolver.resolveHabitConflict(local, remote);

      expect(result.resolved.completions).toHaveLength(3);
      expect(result.resolved.currentStreak).toBeGreaterThan(0);
      expect(result.resolved.longestStreak).toBeGreaterThanOrEqual(3);
    });
  });

  describe('resolveUserConflict', () => {
    const baseUser: User = {
      id: 'user-1',
      birthDate: '1990-01-01',
      salt: 'salt',
      theme: {
        mode: 'light',
        primaryColor: '#000',
        accentColor: '#fff',
        fontSize: 'medium',
        fontFamily: 'system',
        reducedMotion: false,
      },
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
    };

    it('should always use newest user data', () => {
      const local = { ...baseUser, updatedAt: '2025-01-01T11:00:00Z' };
      const remote = { ...baseUser, updatedAt: '2025-01-01T12:00:00Z', salt: 'new-salt' };

      const result = resolver.resolveUserConflict(local, remote);

      expect(result.resolved.salt).toBe('new-salt');
      expect(result.strategy).toBe('newest-wins');
    });

    it('should preserve local theme if newer', () => {
      const local = {
        ...baseUser,
        theme: { ...baseUser.theme!, mode: 'dark' as const },
        updatedAt: '2025-01-01T12:00:00Z',
      };
      const remote = {
        ...baseUser,
        updatedAt: '2025-01-01T11:00:00Z',
      };

      const result = resolver.resolveUserConflict(local, remote);

      expect(result.resolved.theme?.mode).toBe('dark');
    });
  });

  describe('calculateStreaks', () => {
    it('should calculate daily streaks correctly', () => {
      resolver = new ConflictResolver('merge');
      
      const today = new Date();
      const dates = [];
      
      // Create 5 consecutive days
      for (let i = 0; i < 5; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push({ date: date.toISOString().split('T')[0] });
      }
      
      const habit: Habit = {
        id: 'habit-1',
        userId: 'user-1',
        name: 'Test Habit',
        description: 'Test',
        frequency: 'daily',
        completions: dates,
        currentStreak: 0,
        longestStreak: 0,
        encryptedData: 'encrypted',
        iv: 'iv',
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      };
      
      const result = resolver.resolveHabitConflict(habit, habit);
      
      expect(result.resolved.currentStreak).toBe(5);
      expect(result.resolved.longestStreak).toBe(5);
    });

    it('should break streak for missed days', () => {
      resolver = new ConflictResolver('merge');
      
      const today = new Date();
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      const habit: Habit = {
        id: 'habit-1',
        userId: 'user-1',
        name: 'Test Habit',
        description: 'Test',
        frequency: 'daily',
        completions: [
          { date: today.toISOString().split('T')[0] },
          { date: threeDaysAgo.toISOString().split('T')[0] },
        ],
        currentStreak: 0,
        longestStreak: 0,
        encryptedData: 'encrypted',
        iv: 'iv',
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z',
      };
      
      const result = resolver.resolveHabitConflict(habit, habit);
      
      expect(result.resolved.currentStreak).toBe(1);
    });
  });
});