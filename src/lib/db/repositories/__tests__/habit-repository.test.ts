import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { habitRepository } from '../habit-repository';
import { browserDB } from '../../browser-db';
import type { Habit } from '../../../validation/schemas';
import type { EncryptedHabit } from '../habit-repository';

// Mock the browserDB
vi.mock('../../browser-db', () => ({
  browserDB: {
    addHabit: vi.fn(),
    getHabitById: vi.fn(),
    getHabitsByUserId: vi.fn(),
    getHabitsByPeriodId: vi.fn(),
    updateHabit: vi.fn(),
    deleteHabit: vi.fn(),
    transaction: vi.fn(),
  }
}));

describe('HabitRepository', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockHabitId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPeriodId = '550e8400-e29b-41d4-a716-446655440002';
  
  const mockHabit: Habit = {
    id: mockHabitId,
    userId: mockUserId,
    periodId: mockPeriodId,
    name: 'Test Habit',
    description: 'Test Description',
    frequency: 'daily',
    targetCount: 1,
    color: '#1e40af',
    icon: '🎯',
    currentStreak: 0,
    longestStreak: 0,
    completions: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const mockEncryptedHabit: EncryptedHabit = {
    id: mockHabitId,
    userId: mockUserId,
    periodId: mockPeriodId,
    encryptedData: 'encrypted-data-string',
    iv: 'initialization-vector',
    frequency: 'daily',
    currentStreak: 0,
    longestStreak: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new habit', async () => {
      vi.mocked(browserDB.addHabit).mockResolvedValue(undefined);

      const habitData = {
        userId: mockUserId,
        periodId: mockPeriodId,
        name: 'Test Habit',
        description: 'Test Description',
        frequency: 'daily' as const,
        targetCount: 1,
        color: '#1e40af',
        icon: '🎯',
        currentStreak: 0,
        longestStreak: 0,
        completions: [],
      };

      const result = await habitRepository.create(habitData);

      expect(browserDB.addHabit).toHaveBeenCalled();
      expect(result).toMatchObject(habitData);
      expect(result.id).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
    });

    it('should handle errors when creating habit', async () => {
      const error = new Error('Database error');
      vi.mocked(browserDB.addHabit).mockRejectedValue(error);

      const habitData = {
        userId: mockUserId,
        periodId: mockPeriodId,
        name: 'Test Habit',
        description: 'Test Description',
        frequency: 'daily' as const,
        targetCount: 1,
        color: '#1e40af',
        icon: '🎯',
        currentStreak: 0,
        longestStreak: 0,
        completions: [],
      };

      await expect(habitRepository.create(habitData)).rejects.toThrow('Database error');
    });
  });

  describe('createEncryptedHabit', () => {
    it('should create an encrypted habit', async () => {
      vi.mocked(browserDB.addHabit).mockResolvedValue(undefined);

      await habitRepository.createEncryptedHabit(mockEncryptedHabit);

      expect(browserDB.addHabit).toHaveBeenCalledWith(mockEncryptedHabit);
    });
  });

  describe('findById', () => {
    it('should find habit by id', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(mockHabit);

      const result = await habitRepository.findById(mockHabitId as any, mockUserId as any);

      expect(browserDB.getHabitById).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(result).toEqual(mockHabit);
    });

    it('should return null when habit not found', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(null);

      const result = await habitRepository.findById('non-existent' as any, mockUserId as any);

      expect(result).toBeNull();
    });
  });

  describe('findEncryptedById', () => {
    it('should find encrypted habit by id', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(mockEncryptedHabit as any);

      const result = await habitRepository.findEncryptedById(mockHabitId as any, mockUserId as any);

      expect(browserDB.getHabitById).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(result).toEqual(mockEncryptedHabit);
    });

    it('should return null when encrypted habit not found', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(null);

      const result = await habitRepository.findEncryptedById('non-existent' as any, mockUserId as any);

      expect(result).toBeNull();
    });
  });

  describe('findAllByUserId', () => {
    it('should find all habits by user id', async () => {
      const mockHabits = [mockHabit, { ...mockHabit, id: 'habit-2' }];
      vi.mocked(browserDB.getHabitsByUserId).mockResolvedValue(mockHabits);

      const result = await habitRepository.findAllByUserId(mockUserId as any);

      expect(browserDB.getHabitsByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockHabits);
    });

    it('should return empty array when no habits found', async () => {
      vi.mocked(browserDB.getHabitsByUserId).mockResolvedValue([]);

      const result = await habitRepository.findAllByUserId(mockUserId as any);

      expect(result).toEqual([]);
    });
  });

  describe('findAllEncryptedByUserId', () => {
    it('should find all encrypted habits by user id', async () => {
      const mockHabits = [mockEncryptedHabit] as any;
      vi.mocked(browserDB.getHabitsByUserId).mockResolvedValue(mockHabits);

      const result = await habitRepository.findAllEncryptedByUserId(mockUserId as any);

      expect(browserDB.getHabitsByUserId).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockHabits);
    });
  });

  describe('update', () => {
    it('should update a habit', async () => {
      const updatedHabit = { ...mockHabit, name: 'Updated Habit', description: 'Updated Description' };
      vi.mocked(browserDB.updateHabit).mockResolvedValue(updatedHabit);

      const updates = { name: 'Updated Habit', description: 'Updated Description' };
      const result = await habitRepository.update(mockHabitId as any, mockUserId as any, updates);

      expect(browserDB.updateHabit).toHaveBeenCalledWith(mockHabitId, mockUserId, updates);
      expect(result?.name).toBe('Updated Habit');
      expect(result?.description).toBe('Updated Description');
    });

    it('should return null when habit to update not found', async () => {
      vi.mocked(browserDB.updateHabit).mockResolvedValue(null);

      const result = await habitRepository.update(mockHabitId as any, mockUserId as any, { name: 'New' });

      expect(result).toBeNull();
    });
  });

  describe('updateEncrypted', () => {
    it('should update an encrypted habit', async () => {
      vi.mocked(browserDB.updateHabit).mockResolvedValue({} as any);

      const updatedHabit = { ...mockEncryptedHabit, currentStreak: 5 };
      await habitRepository.updateEncrypted(updatedHabit);

      expect(browserDB.updateHabit).toHaveBeenCalledWith(updatedHabit.id, updatedHabit.userId, updatedHabit);
    });
  });

  describe('delete', () => {
    it('should delete a habit', async () => {
      vi.mocked(browserDB.deleteHabit).mockResolvedValue(true);

      const result = await habitRepository.delete(mockHabitId as any, mockUserId as any);

      expect(browserDB.deleteHabit).toHaveBeenCalledWith(mockHabitId, mockUserId);
      expect(result).toBe(true);
    });

    it('should return false when habit to delete not found', async () => {
      vi.mocked(browserDB.deleteHabit).mockResolvedValue(false);

      const result = await habitRepository.delete('non-existent' as any, mockUserId as any);

      expect(browserDB.deleteHabit).toHaveBeenCalledWith('non-existent', mockUserId);
      expect(result).toBe(false);
    });
  });

  describe('recordCompletion', () => {
    it('should record a habit completion', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(mockHabit);
      const updatedHabit = { 
        ...mockHabit, 
        completions: [{ date: '2025-01-02', notes: 'Completed successfully' }],
        currentStreak: 1,
        longestStreak: 1
      };
      vi.mocked(browserDB.updateHabit).mockResolvedValue(updatedHabit);

      const completionDate = '2025-01-02';
      const notes = 'Completed successfully';
      const result = await habitRepository.recordCompletion(
        mockHabitId as any,
        mockUserId as any,
        completionDate,
        notes
      );

      expect(browserDB.updateHabit).toHaveBeenCalled();
      const updateCall = vi.mocked(browserDB.updateHabit).mock.calls[0];
      expect(updateCall[0]).toBe(mockHabitId); // id
      expect(updateCall[1]).toBe(mockUserId); // userId
      expect(updateCall[2].completions).toHaveLength(1);
      expect(updateCall[2].completions?.[0]?.date).toBe(completionDate);
      expect(updateCall[2].completions?.[0]?.notes).toBe(notes);
      // Streak calculation might return 1 for single completion
      expect(updateCall[2].currentStreak).toBeDefined();
      expect(updateCall[2].longestStreak).toBeDefined();
      expect(result).toEqual(updatedHabit);
    });

    it('should not duplicate completions for same day', async () => {
      const existingCompletion = { date: '2025-01-02', notes: 'First completion' };
      const habitWithCompletion = { ...mockHabit, completions: [existingCompletion] };
      vi.mocked(browserDB.getHabitById).mockResolvedValue(habitWithCompletion);
      vi.mocked(browserDB.updateHabit).mockResolvedValue(habitWithCompletion);

      const result = await habitRepository.recordCompletion(
        mockHabitId as any,
        mockUserId as any,
        '2025-01-02',
        'Second attempt'
      );

      expect(browserDB.updateHabit).not.toHaveBeenCalled(); // Should not update if already completed
      expect(result).toEqual(habitWithCompletion);
    });
  });

  describe('removeCompletion', () => {
    it('should remove a habit completion', async () => {
      const completions = [
        { date: '2025-01-01', notes: 'Day 1' },
        { date: '2025-01-02', notes: 'Day 2' },
      ];
      const habitWithCompletions = { ...mockHabit, completions };
      vi.mocked(browserDB.getHabitById).mockResolvedValue(habitWithCompletions);
      const updatedHabit = { ...habitWithCompletions, completions: [completions[1]] };
      vi.mocked(browserDB.updateHabit).mockResolvedValue(updatedHabit);

      const result = await habitRepository.removeCompletion(
        mockHabitId as any,
        mockUserId as any,
        '2025-01-01'
      );

      const updateCall = vi.mocked(browserDB.updateHabit).mock.calls[0];
      expect(updateCall[2].completions).toHaveLength(1);
      expect(updateCall[2].completions?.[0]?.date).toBe('2025-01-02');
      expect(result).toEqual(updatedHabit);
    });

    it('should return null when habit not found', async () => {
      vi.mocked(browserDB.getHabitById).mockResolvedValue(null);

      const result = await habitRepository.removeCompletion(
        'non-existent' as any,
        mockUserId as any,
        '2025-01-01'
      );

      expect(browserDB.updateHabit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('findByPeriodId', () => {
    it('should find habits by period id', async () => {
      const habitsInPeriod = [mockHabit];
      vi.mocked(browserDB.getHabitsByPeriodId).mockResolvedValue(habitsInPeriod);

      const result = await habitRepository.findByPeriodId(mockPeriodId, mockUserId as any);

      expect(browserDB.getHabitsByPeriodId).toHaveBeenCalledWith(mockPeriodId, mockUserId);
      expect(result).toEqual(habitsInPeriod);
    });

    it('should return empty array when no habits found for period', async () => {
      vi.mocked(browserDB.getHabitsByPeriodId).mockResolvedValue([]);

      const result = await habitRepository.findByPeriodId('period-id', mockUserId as any);

      expect(result).toEqual([]);
    });
  });
});