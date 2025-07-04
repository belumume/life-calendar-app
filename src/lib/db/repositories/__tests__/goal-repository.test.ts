import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { goalRepository } from '../goal-repository';
import { browserDB } from '../../browser-db';
import type { Goal, GoalStatus } from '../../../validation/schemas';
import type { EncryptedGoal } from '../goal-repository';

// Mock the browserDB
vi.mock('../../browser-db', () => ({
  browserDB: {
    getGoals: vi.fn(),
    getGoalsByUser: vi.fn(),
    getGoalsByStatus: vi.fn(),
    saveGoal: vi.fn(),
    deleteGoal: vi.fn(),
    transaction: vi.fn(),
  }
}));

describe('GoalRepository', () => {
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockGoalId = '550e8400-e29b-41d4-a716-446655440001';
  const mockPeriodId = '550e8400-e29b-41d4-a716-446655440002';
  const mockMilestoneId = '550e8400-e29b-41d4-a716-446655440003';
  
  const mockGoal: Goal = {
    id: mockGoalId,
    userId: mockUserId,
    periodId: mockPeriodId,
    title: 'Test Goal',
    description: 'Test Description',
    category: 'personal',
    priority: 'high',
    status: 'active',
    targetDate: '2025-12-31',
    progress: 0,
    milestones: [
      { id: mockMilestoneId, title: 'Milestone 1', completed: false }
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  const mockEncryptedGoal: EncryptedGoal = {
    id: mockGoalId,
    userId: mockUserId,
    periodId: mockPeriodId,
    encryptedData: 'encrypted-data-string',
    iv: 'initialization-vector',
    status: 'active',
    progress: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGoal', () => {
    it('should create a new goal', async () => {
      vi.mocked(browserDB.saveGoal).mockResolvedValue(undefined);

      const result = await goalRepository.createGoal(mockGoal);

      expect(browserDB.saveGoal).toHaveBeenCalled();
      const savedGoal = vi.mocked(browserDB.saveGoal).mock.calls[0][0];
      expect(savedGoal).toMatchObject({
        userId: mockUserId,
        periodId: mockPeriodId,
        title: 'Test Goal',
        description: 'Test Description',
        category: 'personal',
        priority: 'high',
        status: 'active',
        progress: 0,
      });
      expect(result).toMatchObject({
        userId: mockUserId,
        periodId: mockPeriodId,
        title: 'Test Goal',
        description: 'Test Description',
        category: 'personal',
        priority: 'high',
        status: 'active',
        progress: 0,
      });
    });

    it('should validate goal data', async () => {
      const invalidGoal = { ...mockGoal, userId: 'invalid-id' };

      await expect(goalRepository.createGoal(invalidGoal)).rejects.toThrow();
    });

    it('should handle database errors when creating goal', async () => {
      const error = new Error('Database error');
      vi.mocked(browserDB.saveGoal).mockRejectedValue(error);

      await expect(goalRepository.createGoal(mockGoal)).rejects.toThrow('Database error');
    });
  });

  describe('createEncryptedGoal', () => {
    it('should create an encrypted goal', async () => {
      vi.mocked(browserDB.saveGoal).mockResolvedValue(undefined);

      await goalRepository.createEncryptedGoal(mockEncryptedGoal);

      expect(browserDB.saveGoal).toHaveBeenCalledWith(mockEncryptedGoal);
    });
  });

  describe('getGoalsByUser', () => {
    it('should retrieve goals by user ID', async () => {
      const mockGoals = [mockGoal];
      vi.mocked(browserDB.getGoals).mockResolvedValue(mockGoals);

      const result = await goalRepository.getGoalsByUser(mockUserId);

      expect(browserDB.getGoals).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockGoals);
    });

    it('should return empty array when no goals found', async () => {
      vi.mocked(browserDB.getGoals).mockResolvedValue([]);

      const result = await goalRepository.getGoalsByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getEncryptedGoalsByUser', () => {
    it('should retrieve encrypted goals by user ID', async () => {
      const mockGoals = [mockEncryptedGoal] as any;
      vi.mocked(browserDB.getGoals).mockResolvedValue(mockGoals);

      const result = await goalRepository.getEncryptedGoalsByUser(mockUserId);

      expect(browserDB.getGoals).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getGoalsByStatus', () => {
    it('should retrieve goals by user ID and status', async () => {
      const status: GoalStatus = 'active';
      const mockGoals = [mockGoal];
      vi.mocked(browserDB.getGoalsByStatus).mockResolvedValue(mockGoals);

      const result = await goalRepository.getGoalsByStatus(mockUserId, status);

      expect(browserDB.getGoalsByStatus).toHaveBeenCalledWith(mockUserId, status);
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getEncryptedGoalsByStatus', () => {
    it('should retrieve encrypted goals by status', async () => {
      const status: GoalStatus = 'active';
      const mockGoals = [mockEncryptedGoal] as any;
      vi.mocked(browserDB.getGoalsByStatus).mockResolvedValue(mockGoals);

      const result = await goalRepository.getEncryptedGoalsByStatus(mockUserId, status);

      expect(browserDB.getGoalsByStatus).toHaveBeenCalledWith(mockUserId, status);
      expect(result).toEqual(mockGoals);
    });
  });

  describe('getEncryptedGoalById', () => {
    it('should retrieve a specific encrypted goal', async () => {
      const mockGoals = [mockEncryptedGoal] as any;
      vi.mocked(browserDB.getGoals).mockResolvedValue(mockGoals);

      const result = await goalRepository.getEncryptedGoalById(mockGoalId, mockUserId);

      expect(browserDB.getGoals).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockEncryptedGoal);
    });

    it('should return undefined when goal not found', async () => {
      vi.mocked(browserDB.getGoals).mockResolvedValue([]);

      const result = await goalRepository.getEncryptedGoalById(mockGoalId, mockUserId);

      expect(result).toBeFalsy(); // Could be undefined or null
    });
  });

  describe('updateGoal', () => {
    it('should update an existing goal', async () => {
      vi.mocked(browserDB.getGoals).mockResolvedValue([mockGoal]);
      vi.mocked(browserDB.saveGoal).mockResolvedValue(undefined);

      const updates = { progress: 50, status: 'active' as GoalStatus, userId: mockUserId };
      const result = await goalRepository.updateGoal(mockGoalId, updates);

      expect(browserDB.getGoals).toHaveBeenCalledWith(mockUserId);
      expect(browserDB.saveGoal).toHaveBeenCalled();
      const savedGoal = vi.mocked(browserDB.saveGoal).mock.calls[0][0];
      expect(savedGoal.progress).toBe(50);
      expect(result.progress).toBe(50);
    });

    it('should throw error when goal not found', async () => {
      vi.mocked(browserDB.getGoals).mockResolvedValue([]);

      const updates = { progress: 50, userId: mockUserId };
      await expect(goalRepository.updateGoal('non-existent', updates)).rejects.toThrow('Goal not found');
    });
  });

  describe('updateEncryptedGoal', () => {
    it('should update an encrypted goal', async () => {
      const updates = { progress: 50 };
      const updatedGoal = { ...mockEncryptedGoal, ...updates };
      vi.mocked(browserDB.saveGoal).mockResolvedValue(undefined);

      await goalRepository.updateEncryptedGoal(mockGoalId, updatedGoal);

      expect(browserDB.saveGoal).toHaveBeenCalledWith(updatedGoal);
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal', async () => {
      vi.mocked(browserDB.deleteGoal).mockResolvedValue(undefined);

      await goalRepository.deleteGoal(mockGoalId);

      expect(browserDB.deleteGoal).toHaveBeenCalledWith(mockGoalId);
    });

    it('should handle errors when deleting goal', async () => {
      const error = new Error('Delete failed');
      vi.mocked(browserDB.deleteGoal).mockRejectedValue(error);

      await expect(goalRepository.deleteGoal(mockGoalId)).rejects.toThrow('Delete failed');
    });
  });
});