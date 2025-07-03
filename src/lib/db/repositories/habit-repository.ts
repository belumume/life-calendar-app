import type { Habit, HabitId, UserId } from '../../validation/schemas';
import { createHabitId } from '../../validation/schemas';
import { browserDB } from '../browser-db';

export class HabitRepository {
  async create(habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>): Promise<Habit> {
    const now = new Date().toISOString();
    const newHabit: Habit = {
      ...habit,
      id: crypto.randomUUID(),
      currentStreak: 0,
      longestStreak: 0,
      completions: [],
      createdAt: now,
      updatedAt: now,
    };
    
    await browserDB.addHabit(newHabit);
    return newHabit;
  }

  async findById(id: HabitId, userId: UserId): Promise<Habit | null> {
    return browserDB.getHabitById(id as string, userId as string);
  }

  async findAllByUserId(userId: UserId): Promise<Habit[]> {
    return browserDB.getHabitsByUserId(userId as string);
  }

  async findByPeriodId(periodId: string, userId: UserId): Promise<Habit[]> {
    return browserDB.getHabitsByPeriodId(periodId, userId as string);
  }

  async update(id: HabitId, userId: UserId, updates: Partial<Omit<Habit, 'id' | 'userId' | 'createdAt'>>): Promise<Habit | null> {
    return browserDB.updateHabit(id as string, userId as string, updates);
  }

  async delete(id: HabitId, userId: UserId): Promise<boolean> {
    return browserDB.deleteHabit(id as string, userId as string);
  }

  async recordCompletion(id: HabitId, userId: UserId, date: string, notes?: string): Promise<Habit | null> {
    const habit = await this.findById(id, userId);
    if (!habit) return null;

    // Check if already completed on this date
    const dateOnly = date.split('T')[0];
    const alreadyCompleted = habit.completions.some(c => c.date.split('T')[0] === dateOnly);
    if (alreadyCompleted) return habit;

    // Add completion
    const completion = { date, notes };
    const completions = [...habit.completions, completion];

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(completions, habit.frequency);

    return browserDB.updateHabit(id, userId, {
      completions,
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      updatedAt: new Date().toISOString(),
    });
  }

  async removeCompletion(id: HabitId, userId: UserId, date: string): Promise<Habit | null> {
    const habit = await this.findById(id, userId);
    if (!habit) return null;

    const dateOnly = date.split('T')[0];
    const completions = habit.completions.filter(c => c.date.split('T')[0] !== dateOnly);

    // Recalculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(completions, habit.frequency);

    return browserDB.updateHabit(id, userId, {
      completions,
      currentStreak,
      longestStreak: Math.max(habit.longestStreak, longestStreak),
      updatedAt: new Date().toISOString(),
    });
  }

  private calculateStreaks(completions: Array<{ date: string }>, frequency: Habit['frequency']): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (completions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Sort completions by date
    const sorted = [...completions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Convert to date strings for easier comparison
    const dates = sorted.map(c => c.date.split('T')[0]);
    const uniqueDates = Array.from(new Set(dates));

    if (frequency === 'daily') {
      return this.calculateDailyStreaks(uniqueDates);
    } else if (frequency === 'weekly') {
      return this.calculateWeeklyStreaks(uniqueDates);
    } else {
      return this.calculateMonthlyStreaks(uniqueDates);
    }
  }

  private calculateDailyStreaks(dates: string[]): { currentStreak: number; longestStreak: number } {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      const daysDiff = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if current streak is still active
    const today = new Date().toISOString().split('T')[0];
    const lastDate = dates[dates.length - 1];
    const daysSinceLast = (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLast <= 1) {
      currentStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }

  private calculateWeeklyStreaks(dates: string[]): { currentStreak: number; longestStreak: number } {
    // Group by week
    const weeks = new Set<string>();
    dates.forEach(date => {
      const d = new Date(date);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      weeks.add(weekStart.toISOString().split('T')[0]);
    });

    const sortedWeeks = Array.from(weeks).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedWeeks.length; i++) {
      const prevWeek = new Date(sortedWeeks[i - 1]);
      const currWeek = new Date(sortedWeeks[i]);
      const weeksDiff = (currWeek.getTime() - prevWeek.getTime()) / (1000 * 60 * 60 * 24 * 7);

      if (Math.abs(weeksDiff - 1) < 0.1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if current streak is active
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - thisWeek.getDay());
    const lastWeek = new Date(sortedWeeks[sortedWeeks.length - 1]);
    const weeksSinceLast = (thisWeek.getTime() - lastWeek.getTime()) / (1000 * 60 * 60 * 24 * 7);

    if (weeksSinceLast <= 1) {
      currentStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }

  private calculateMonthlyStreaks(dates: string[]): { currentStreak: number; longestStreak: number } {
    // Group by month
    const months = new Set<string>();
    dates.forEach(date => {
      const d = new Date(date);
      months.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    });

    const sortedMonths = Array.from(months).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 1; i < sortedMonths.length; i++) {
      const [prevYear, prevMonth] = sortedMonths[i - 1].split('-').map(Number);
      const [currYear, currMonth] = sortedMonths[i].split('-').map(Number);
      
      const monthsDiff = (currYear - prevYear) * 12 + (currMonth - prevMonth);

      if (monthsDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if current streak is active
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = sortedMonths[sortedMonths.length - 1];

    if (lastMonth === thisMonth) {
      currentStreak = tempStreak;
    }

    return { currentStreak, longestStreak };
  }
}

export const habitRepository = new HabitRepository();