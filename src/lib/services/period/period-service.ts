import { browserDB } from '../../db/browser-db';
import { authService } from '../auth/auth-service';

export class PeriodServiceError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'PeriodServiceError';
  }
}

export class PeriodService {
  /**
   * Get the current active period for the authenticated user
   */
  async getCurrentPeriod(): Promise<any | null> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) return null;
    
    return await browserDB.getActivePeriod(currentUser.id);
  }

  /**
   * Create a new period
   */
  async createPeriod(data: {
    name: string;
    startDate: string;
    endDate: string;
    totalDays: number;
    isActive: boolean;
  }): Promise<void> {
    authService.requireAuth();
    const userId = authService.getAuthenticatedUserId();

    await browserDB.savePeriod({
      id: crypto.randomUUID(),
      userId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      totalDays: data.totalDays,
      isActive: data.isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

export const periodService = new PeriodService();