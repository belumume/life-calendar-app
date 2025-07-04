import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { appService } from '../app-service';
import { browserDB } from '../../db/browser-db';
import { goalRepository } from '../../db/repositories/goal-repository';
import { habitRepository } from '../../db/repositories/habit-repository';
import type { EncryptedGoal } from '../../db/repositories/goal-repository';
import type { EncryptedHabit } from '../../db/repositories/habit-repository';

describe('AppService Goals and Habits Encryption', () => {
  const testBirthDate = '1990-01-01';
  const testPassphrase = 'TestSecurePass123!';

  beforeEach(async () => {
    await browserDB.clear();
  });

  afterEach(async () => {
    await browserDB.clear();
  });

  describe('Goal Encryption', () => {
    it('should encrypt goal data before saving', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create a goal
      const goalData = {
        title: 'Learn Spanish',
        description: 'Become fluent in Spanish by end of year',
        category: 'learning' as const,
        priority: 'high' as const,
        targetDate: '2025-12-31',
        milestones: [
          { title: 'Complete basic course' },
          { title: 'Have first conversation' },
        ],
      };

      const goal = await appService.createGoal(goalData);

      // Verify goal is returned decrypted
      expect(goal.title).toBe('Learn Spanish');
      expect(goal.description).toBe('Become fluent in Spanish by end of year');

      // Check that data is encrypted in storage
      const storedGoals = await goalRepository.getEncryptedGoalsByUser(goal.userId);
      expect(storedGoals.length).toBe(1);
      
      const storedGoal = storedGoals[0] as EncryptedGoal;
      expect(storedGoal.encryptedData).toBeDefined();
      expect(storedGoal.iv).toBeDefined();
      expect(storedGoal.encryptedData).not.toBe('Learn Spanish');
      expect(storedGoal.encryptedData).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });

    it('should decrypt goals when retrieving', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create multiple goals
      await appService.createGoal({
        title: 'Get fit',
        description: 'Exercise daily',
        category: 'health' as const,
        priority: 'high' as const,
      });

      await appService.createGoal({
        title: 'Read more books',
        description: 'Read 50 books this year',
        category: 'personal' as const,
        priority: 'medium' as const,
      });

      // Retrieve goals
      const goals = await appService.getGoals();
      expect(goals.length).toBe(2);
      
      // Sort by title to ensure consistent order
      const sortedGoals = goals.sort((a, b) => a.title.localeCompare(b.title));
      
      expect(sortedGoals[0].title).toBe('Get fit');
      expect(sortedGoals[0].description).toBe('Exercise daily');
      expect(sortedGoals[1].title).toBe('Read more books');
      expect(sortedGoals[1].description).toBe('Read 50 books this year');
    });

    it('should show placeholder text when not authenticated', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create a goal
      await appService.createGoal({
        title: 'Secret goal',
        category: 'personal' as const,
        priority: 'high' as const,
      });

      // Logout
      await appService.logout();

      // Try to get goals without being authenticated
      const goals = await appService.getGoals();
      expect(goals.length).toBe(1);
      expect(goals[0].title).toBe('[Please log in to view]');
    });
  });

  describe('Habit Encryption', () => {
    it('should encrypt habit data before saving', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create a habit
      const habitData = {
        name: 'Daily meditation',
        description: 'Meditate for 10 minutes every morning',
        frequency: 'daily' as const,
        targetCount: 10,
        color: '#8B5CF6',
      };

      const habit = await appService.createHabit(habitData);

      // Verify habit is returned decrypted
      expect(habit.name).toBe('Daily meditation');
      expect(habit.description).toBe('Meditate for 10 minutes every morning');

      // Check that data is encrypted in storage
      const storedHabits = await habitRepository.findAllEncryptedByUserId(habit.userId as any);
      expect(storedHabits.length).toBe(1);
      
      const storedHabit = storedHabits[0] as EncryptedHabit;
      expect(storedHabit.encryptedData).toBeDefined();
      expect(storedHabit.iv).toBeDefined();
      expect(storedHabit.encryptedData).not.toBe('Daily meditation');
      expect(storedHabit.encryptedData).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });

    it('should decrypt habits when retrieving', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create multiple habits
      await appService.createHabit({
        name: 'Exercise',
        description: 'Work out 3 times a week',
        frequency: 'weekly' as const,
      });

      await appService.createHabit({
        name: 'Journal',
        description: 'Write daily reflections',
        frequency: 'daily' as const,
      });

      // Retrieve habits
      const habits = await appService.getHabits();
      expect(habits.length).toBe(2);
      
      // Sort by name to ensure consistent order
      const sortedHabits = habits.sort((a, b) => a.name.localeCompare(b.name));
      
      expect(sortedHabits[0].name).toBe('Exercise');
      expect(sortedHabits[0].description).toBe('Work out 3 times a week');
      expect(sortedHabits[1].name).toBe('Journal');
      expect(sortedHabits[1].description).toBe('Write daily reflections');
    });

    it('should encrypt habit completions', async () => {
      // Create account
      await appService.createAccount(testBirthDate, testPassphrase);

      // Create a habit
      const habit = await appService.createHabit({
        name: 'Read',
        frequency: 'daily' as const,
      });

      // Record completions
      await appService.recordHabitCompletion(habit.id, '2025-07-01', 'Read 20 pages');
      await appService.recordHabitCompletion(habit.id, '2025-07-02', 'Read 30 pages');

      // Get updated habit
      const habits = await appService.getHabits();
      const updatedHabit = habits.find(h => h.id === habit.id)!;
      
      expect(updatedHabit.completions.length).toBe(2);
      expect(updatedHabit.completions[0].notes).toBe('Read 20 pages');
      expect(updatedHabit.completions[1].notes).toBe('Read 30 pages');

      // Check encrypted storage
      const storedHabits = await habitRepository.findAllEncryptedByUserId(habit.userId as any);
      const storedHabit = storedHabits[0] as EncryptedHabit;
      expect(storedHabit.encryptedData).toBeDefined();
      expect(storedHabit.encryptedData).not.toContain('Read 20 pages');
    });
  });
});