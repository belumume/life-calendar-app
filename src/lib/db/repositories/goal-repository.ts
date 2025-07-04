import { browserDB } from '../browser-db';
import type { Goal, GoalStatus } from '../../validation/schemas';
import { GoalSchema } from '../../validation/schemas';
import { GoalFormData } from '../../validation/input-schemas';

// Encrypted goal type for storage
export interface EncryptedGoal {
  id: string;
  userId: string;
  periodId?: string;
  encryptedData: string;
  iv: string;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class GoalRepository {
  // Store encrypted goal data
  async createEncryptedGoal(data: EncryptedGoal): Promise<void> {
    await browserDB.saveGoal(data as any);
  }

  async createGoal(data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    const goal: Goal = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Validate before saving
    const validated = GoalSchema.parse(goal);
    await browserDB.saveGoal(validated);
    
    return validated;
  }

  // Get encrypted goals - returns raw encrypted data
  async getEncryptedGoalsByUser(userId: string): Promise<EncryptedGoal[]> {
    const goals = await browserDB.getGoals(userId);
    return goals as any as EncryptedGoal[];
  }

  async getEncryptedGoalsByStatus(userId: string, status: GoalStatus): Promise<EncryptedGoal[]> {
    const goals = await browserDB.getGoalsByStatus(userId, status);
    return goals as any as EncryptedGoal[];
  }

  async getEncryptedGoalsByPeriod(periodId: string): Promise<EncryptedGoal[]> {
    const goals = await browserDB.getGoalsByPeriod(periodId);
    return goals as any as EncryptedGoal[];
  }

  // Legacy methods for backward compatibility
  async getGoalsByUser(userId: string): Promise<Goal[]> {
    const goals = await browserDB.getGoals(userId);
    return goals.map(g => GoalSchema.parse(g));
  }

  async getGoalsByStatus(userId: string, status: GoalStatus): Promise<Goal[]> {
    const goals = await browserDB.getGoalsByStatus(userId, status);
    return goals.map(g => GoalSchema.parse(g));
  }

  async getGoalsByPeriod(periodId: string): Promise<Goal[]> {
    const goals = await browserDB.getGoalsByPeriod(periodId);
    return goals.map(g => GoalSchema.parse(g));
  }

  // Update encrypted goal
  async updateEncryptedGoal(id: string, data: EncryptedGoal): Promise<void> {
    await browserDB.saveGoal(data as any);
  }

  // Get single encrypted goal
  async getEncryptedGoalById(id: string, userId: string): Promise<EncryptedGoal | null> {
    const goals = await this.getEncryptedGoalsByUser(userId);
    return goals.find(g => g.id === id) || null;
  }

  // Legacy update method
  async updateGoal(id: string, updates: Partial<Goal>): Promise<Goal> {
    const goals = await browserDB.getGoals(updates.userId || '');
    const existing = goals.find(g => g.id === id);
    
    if (!existing) {
      throw new Error('Goal not found');
    }

    const updated: Goal = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await browserDB.saveGoal(updated);
    return GoalSchema.parse(updated);
  }

  async updateProgress(id: string, userId: string, progress: number): Promise<Goal> {
    const updates: Partial<Goal> = {
      progress,
      userId,
    };

    // If progress is 100%, mark as completed
    if (progress >= 100) {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }

    return this.updateGoal(id, updates);
  }

  async toggleMilestone(goalId: string, userId: string, milestoneId: string): Promise<Goal> {
    const goals = await this.getGoalsByUser(userId);
    const goal = goals.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    if (!goal.milestones) {
      throw new Error('Goal has no milestones');
    }

    const milestone = goal.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error('Milestone not found');
    }

    milestone.completed = !milestone.completed;
    milestone.completedDate = milestone.completed ? new Date().toISOString() : undefined;

    // Recalculate progress based on completed milestones
    const completedCount = goal.milestones.filter(m => m.completed).length;
    const progress = Math.round((completedCount / goal.milestones.length) * 100);

    return this.updateGoal(goalId, {
      milestones: goal.milestones,
      progress,
      userId,
    });
  }

  async deleteGoal(id: string): Promise<void> {
    await browserDB.deleteGoal(id);
  }
}

export const goalRepository = new GoalRepository();