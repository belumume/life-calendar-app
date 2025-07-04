import { describe, it, expect, beforeEach, vi } from 'vitest';
import { appServiceRefactored } from '../app-service-refactored';
import { authService } from '../auth/auth-service';
import { userService } from '../user/user-service';
import { journalService } from '../journal/journal-service';
import { goalService } from '../goal/goal-service';
import { habitService } from '../habit/habit-service';
import { browserDB } from '../../db/browser-db';
import { syncQueue } from '../../sync/sync-queue';

// Mock dependencies
vi.mock('../../db/browser-db', () => ({
  browserDB: {
    init: vi.fn(),
  }
}));

vi.mock('../../sync/sync-queue', () => ({
  syncQueue: {
    loadQueue: vi.fn(),
  }
}));

vi.mock('../auth/auth-service', () => ({
  authService: {
    initialize: vi.fn(),
    authenticate: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    hasUser: vi.fn(),
    isAuthenticated: vi.fn(),
  }
}));

vi.mock('../user/user-service', () => ({
  userService: {
    createAccount: vi.fn(),
    updateTheme: vi.fn(),
    clearAllData: vi.fn(),
  }
}));

vi.mock('../journal/journal-service', () => ({
  journalService: {
    addEntry: vi.fn(),
    getEntries: vi.fn(),
    getEntriesPaginated: vi.fn(),
  }
}));

vi.mock('../goal/goal-service', () => ({
  goalService: {
    createGoal: vi.fn(),
    getGoals: vi.fn(),
    updateProgress: vi.fn(),
    toggleMilestone: vi.fn(),
    deleteGoal: vi.fn(),
  }
}));

vi.mock('../habit/habit-service', () => ({
  habitService: {
    createHabit: vi.fn(),
    getHabits: vi.fn(),
    getHabitById: vi.fn(),
    updateHabit: vi.fn(),
    deleteHabit: vi.fn(),
    recordCompletion: vi.fn(),
    removeCompletion: vi.fn(),
    getHabitsByPeriod: vi.fn(),
  }
}));

describe('AppServiceRefactored', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize all services', async () => {
      await appServiceRefactored.initialize();

      expect(browserDB.init).toHaveBeenCalled();
      expect(authService.initialize).toHaveBeenCalled();
      expect(syncQueue.loadQueue).toHaveBeenCalled();
    });
  });

  describe('authentication delegation', () => {
    it('should delegate login to authService', async () => {
      const passphrase = 'test-passphrase';
      vi.mocked(authService.authenticate).mockResolvedValue(true);

      const result = await appServiceRefactored.login(passphrase);

      expect(authService.authenticate).toHaveBeenCalledWith(passphrase);
      expect(result).toBe(true);
    });

    it('should delegate logout to authService', async () => {
      await appServiceRefactored.logout();

      expect(authService.logout).toHaveBeenCalled();
    });

    it('should delegate user checks to authService', () => {
      const mockUser = { id: 'test-user', birthDate: '1990-01-01' } as any;
      vi.mocked(authService.getCurrentUser).mockReturnValue(mockUser);
      vi.mocked(authService.hasUser).mockReturnValue(true);
      vi.mocked(authService.isAuthenticated).mockReturnValue(true);

      expect(appServiceRefactored.getCurrentUser()).toBe(mockUser);
      expect(appServiceRefactored.hasUser()).toBe(true);
      expect(appServiceRefactored.isAuthenticated()).toBe(true);
    });
  });

  describe('user operations delegation', () => {
    it('should delegate account creation to userService', async () => {
      const mockUser = { id: 'test-user', birthDate: '1990-01-01' } as any;
      vi.mocked(userService.createAccount).mockResolvedValue(mockUser);

      const result = await appServiceRefactored.createAccount('1990-01-01', 'passphrase');

      expect(userService.createAccount).toHaveBeenCalledWith('1990-01-01', 'passphrase');
      expect(result).toBe(mockUser);
    });

    it('should delegate theme update to userService', async () => {
      const theme = { mode: 'dark' } as any;

      await appServiceRefactored.updateUserTheme(theme);

      expect(userService.updateTheme).toHaveBeenCalledWith(theme);
    });
  });

  describe('journal operations delegation', () => {
    it('should delegate journal entry creation to journalService', async () => {
      const mockEntry = { id: 'test-entry' } as any;
      vi.mocked(journalService.addEntry).mockResolvedValue(mockEntry);

      const result = await appServiceRefactored.addJournalEntry('content', 1, 'good', ['tag'], ['achievement'], ['gratitude']);

      expect(journalService.addEntry).toHaveBeenCalledWith('content', 1, 'good', ['tag'], ['achievement'], ['gratitude']);
      expect(result).toBe(mockEntry);
    });

    it('should delegate journal retrieval to journalService', async () => {
      const mockEntries = [{ id: 'entry1' }, { id: 'entry2' }] as any;
      vi.mocked(journalService.getEntries).mockResolvedValue(mockEntries);

      const result = await appServiceRefactored.getJournalEntries();

      expect(journalService.getEntries).toHaveBeenCalled();
      expect(result).toBe(mockEntries);
    });
  });

  describe('goal operations delegation', () => {
    it('should delegate goal creation to goalService', async () => {
      const mockGoal = { id: 'test-goal' } as any;
      const formData = { title: 'Test Goal' } as any;
      vi.mocked(goalService.createGoal).mockResolvedValue(mockGoal);

      const result = await appServiceRefactored.createGoal(formData);

      expect(goalService.createGoal).toHaveBeenCalledWith(formData);
      expect(result).toBe(mockGoal);
    });

    it('should delegate goal progress update to goalService', async () => {
      const mockGoal = { id: 'test-goal', progress: 50 } as any;
      vi.mocked(goalService.updateProgress).mockResolvedValue(mockGoal);

      const result = await appServiceRefactored.updateGoalProgress('test-goal', 50);

      expect(goalService.updateProgress).toHaveBeenCalledWith('test-goal', 50);
      expect(result).toBe(mockGoal);
    });
  });

  describe('habit operations delegation', () => {
    it('should delegate habit creation to habitService', async () => {
      const mockHabit = { id: 'test-habit' } as any;
      const habitData = { name: 'Test Habit', frequency: 'daily' as const };
      vi.mocked(habitService.createHabit).mockResolvedValue(mockHabit);

      const result = await appServiceRefactored.createHabit(habitData);

      expect(habitService.createHabit).toHaveBeenCalledWith(habitData);
      expect(result).toBe(mockHabit);
    });

    it('should delegate habit completion to habitService', async () => {
      const mockHabit = { id: 'test-habit' } as any;
      vi.mocked(habitService.recordCompletion).mockResolvedValue(mockHabit);

      const result = await appServiceRefactored.recordHabitCompletion('test-habit', '2025-01-01', 'notes');

      expect(habitService.recordCompletion).toHaveBeenCalledWith('test-habit', '2025-01-01', 'notes');
      expect(result).toBe(mockHabit);
    });
  });
});