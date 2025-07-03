export interface User {
  id: string;
  birthDate: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntry {
  id: string;
  date: string;
  dayNumber?: number; // For 88-day tracking
  content: string;
  achievements?: string;
  tomorrowFocus?: string;
  mood?: number; // 1-5 scale
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  text: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  targetDate?: string;
  completed: boolean;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Habit {
  id: string;
  name: string;
  frequency: 'daily' | 'weekly';
  completions: HabitCompletion[];
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitCompletion {
  date: string;
  completed: boolean;
  note?: string;
}

export interface Week {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
  hasEntry: boolean;
  highlight?: 'milestone' | 'achievement' | 'challenge';
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  description?: string;
  goals?: string[];
}