import { goalRepository } from '../../db/repositories/goal-repository';
import { browserDB } from '../../db/browser-db';
import { encryptionService } from '../../encryption/browser-crypto';
import { syncQueue } from '../../sync/sync-queue';
import { authService } from '../auth/auth-service';
import type { Goal, GoalStatus } from '../../validation/schemas';
import type { GoalFormData } from '../../validation/input-schemas';

export class GoalServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'GoalServiceError';
  }
}

export class GoalService {
  /**
   * Create a new goal
   */
  async createGoal(formData: GoalFormData): Promise<Goal> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      const currentPeriod = await browserDB.getActivePeriod(userId);
      
      const goal: Goal = {
        id: crypto.randomUUID(),
        userId,
        periodId: currentPeriod?.id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        status: 'active',
        targetDate: formData.targetDate,
        progress: 0,
        milestones: formData.milestones?.map((m, index) => ({
          id: crypto.randomUUID(),
          title: m.title,
          completed: false,
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Encrypt sensitive goal data
      const goalData = {
        title: goal.title,
        description: goal.description,
        category: goal.category,
        priority: goal.priority,
        targetDate: goal.targetDate,
        milestones: goal.milestones,
        linkedHabitIds: goal.linkedHabitIds,
      };

      const encrypted = await encryptionService.encrypt(JSON.stringify(goalData));

      // Store encrypted goal
      await goalRepository.createEncryptedGoal({
        id: goal.id,
        userId: goal.userId,
        periodId: goal.periodId,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        status: goal.status,
        progress: goal.progress,
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt,
      });

      // Queue for sync
      await syncQueue.addOperation('create', 'goal', goal.id, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        status: goal.status,
        progress: goal.progress,
      });

      return goal;
    } catch (error) {
      console.error('Failed to create goal:', error);
      throw new GoalServiceError('Failed to create goal', 'CREATE_GOAL_ERROR');
    }
  }

  /**
   * Get goals for the current user
   */
  async getGoals(status?: GoalStatus): Promise<Goal[]> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      let encryptedGoals;
      if (status) {
        encryptedGoals = await goalRepository.getEncryptedGoalsByStatus(userId, status);
      } else {
        encryptedGoals = await goalRepository.getEncryptedGoalsByUser(userId);
      }

      if (!encryptionService.isInitialized()) {
        // Return goals without decryption if encryption is not initialized
        return encryptedGoals.map(g => ({
          id: g.id,
          userId: g.userId,
          periodId: g.periodId,
          title: '[Please log in to view]',
          description: '',
          category: 'personal' as const,
          priority: 'medium' as const,
          status: g.status,
          progress: g.progress,
          createdAt: g.createdAt,
          updatedAt: g.updatedAt,
          completedAt: g.completedAt,
        }));
      }

      // Decrypt goals
      const decryptedGoals = await Promise.all(
        encryptedGoals.map(async (encryptedGoal) => {
          try {
            const decryptedData = await encryptionService.decrypt({
              encrypted: encryptedGoal.encryptedData,
              iv: encryptedGoal.iv,
            });
            const goalData = JSON.parse(decryptedData);
            
            return {
              id: encryptedGoal.id,
              userId: encryptedGoal.userId,
              periodId: encryptedGoal.periodId,
              ...goalData,
              status: encryptedGoal.status,
              progress: encryptedGoal.progress,
              createdAt: encryptedGoal.createdAt,
              updatedAt: encryptedGoal.updatedAt,
              completedAt: encryptedGoal.completedAt,
            } as Goal;
          } catch (error) {
            console.error('Failed to decrypt goal:', error);
            return {
              id: encryptedGoal.id,
              userId: encryptedGoal.userId,
              periodId: encryptedGoal.periodId,
              title: '[Failed to decrypt]',
              description: '',
              category: 'personal' as const,
              priority: 'medium' as const,
              status: encryptedGoal.status,
              progress: encryptedGoal.progress,
              createdAt: encryptedGoal.createdAt,
              updatedAt: encryptedGoal.updatedAt,
              completedAt: encryptedGoal.completedAt,
            } as Goal;
          }
        })
      );

      return decryptedGoals;
    } catch (error) {
      console.error('Failed to get goals:', error);
      throw new GoalServiceError('Failed to load goals', 'LOAD_GOALS_ERROR');
    }
  }

  /**
   * Update goal progress
   */
  async updateProgress(goalId: string, progress: number): Promise<Goal> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      // Get the encrypted goal
      const encryptedGoal = await goalRepository.getEncryptedGoalById(goalId, userId);
      if (!encryptedGoal) {
        throw new Error('Goal not found');
      }

      // Update progress and status
      const updatedGoal = {
        ...encryptedGoal,
        progress,
        status: progress >= 100 ? 'completed' as GoalStatus : encryptedGoal.status,
        completedAt: progress >= 100 ? new Date().toISOString() : encryptedGoal.completedAt,
        updatedAt: new Date().toISOString(),
      };

      await goalRepository.updateEncryptedGoal(goalId, updatedGoal);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goalId, {
        progress: updatedGoal.progress,
        status: updatedGoal.status,
        completedAt: updatedGoal.completedAt,
      });

      // Decrypt and return the full goal
      const decryptedData = await encryptionService.decrypt({
        encrypted: encryptedGoal.encryptedData,
        iv: encryptedGoal.iv,
      });
      const goalData = JSON.parse(decryptedData);

      return {
        id: updatedGoal.id,
        userId: updatedGoal.userId,
        periodId: updatedGoal.periodId,
        ...goalData,
        status: updatedGoal.status,
        progress: updatedGoal.progress,
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt,
        completedAt: updatedGoal.completedAt,
      } as Goal;
    } catch (error) {
      console.error('Failed to update goal progress:', error);
      throw new GoalServiceError('Failed to update goal progress', 'UPDATE_GOAL_ERROR');
    }
  }

  /**
   * Toggle goal milestone completion
   */
  async toggleMilestone(goalId: string, milestoneId: string): Promise<Goal> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    try {
      // Get the encrypted goal
      const encryptedGoal = await goalRepository.getEncryptedGoalById(goalId, userId);
      if (!encryptedGoal) {
        throw new Error('Goal not found');
      }

      // Decrypt goal data
      const decryptedData = await encryptionService.decrypt({
        encrypted: encryptedGoal.encryptedData,
        iv: encryptedGoal.iv,
      });
      const goalData = JSON.parse(decryptedData);

      // Toggle milestone
      if (!goalData.milestones) {
        throw new Error('Goal has no milestones');
      }

      const milestone = goalData.milestones.find((m: any) => m.id === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      milestone.completed = !milestone.completed;
      milestone.completedDate = milestone.completed ? new Date().toISOString() : undefined;

      // Recalculate progress
      const completedCount = goalData.milestones.filter((m: any) => m.completed).length;
      const progress = Math.round((completedCount / goalData.milestones.length) * 100);

      // Re-encrypt with updated data
      const encrypted = await encryptionService.encrypt(JSON.stringify(goalData));

      // Update encrypted goal
      const updatedGoal = {
        ...encryptedGoal,
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        progress,
        status: progress >= 100 ? 'completed' as GoalStatus : encryptedGoal.status,
        completedAt: progress >= 100 ? new Date().toISOString() : encryptedGoal.completedAt,
        updatedAt: new Date().toISOString(),
      };

      await goalRepository.updateEncryptedGoal(goalId, updatedGoal);

      // Queue for sync
      await syncQueue.addOperation('update', 'goal', goalId, {
        encryptedData: encrypted.encrypted,
        iv: encrypted.iv,
        progress,
        status: updatedGoal.status,
      });

      return {
        id: updatedGoal.id,
        userId: updatedGoal.userId,
        periodId: updatedGoal.periodId,
        ...goalData,
        status: updatedGoal.status,
        progress: updatedGoal.progress,
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt,
        completedAt: updatedGoal.completedAt,
      } as Goal;
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
      throw new GoalServiceError('Failed to update milestone', 'UPDATE_MILESTONE_ERROR');
    }
  }

  /**
   * Delete a goal
   */
  async deleteGoal(goalId: string): Promise<void> {
    authService.requireAuth();

    try {
      await goalRepository.deleteGoal(goalId);

      // Queue for sync
      await syncQueue.addOperation('delete', 'goal', goalId, {});
    } catch (error) {
      console.error('Failed to delete goal:', error);
      throw new GoalServiceError('Failed to delete goal', 'DELETE_GOAL_ERROR');
    }
  }
}

export const goalService = new GoalService();