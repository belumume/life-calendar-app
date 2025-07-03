import { z } from 'zod';

// Branded types for type safety
export type UserId = string & { readonly __brand: 'UserId' };
export type JournalEntryId = string & { readonly __brand: 'JournalEntryId' };
export type GoalId = string & { readonly __brand: 'GoalId' };
export type HabitId = string & { readonly __brand: 'HabitId' };
export type PeriodId = string & { readonly __brand: 'PeriodId' };

// Helper to create branded types
export const createUserId = (id: string): UserId => id as UserId;
export const createJournalEntryId = (id: string): JournalEntryId => id as JournalEntryId;
export const createGoalId = (id: string): GoalId => id as GoalId;
export const createHabitId = (id: string): HabitId => id as HabitId;
export const createPeriodId = (id: string): PeriodId => id as PeriodId;

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  birthDate: z.string(), // Date string from input, not full datetime
  salt: z.string().optional(), // Base64 encoded salt for key derivation
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Period Schema
export const PeriodSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  description: z.string().optional(),
  theme: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    icon: z.string().optional(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Journal Entry Schema
export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  periodId: z.string().uuid().optional(),
  date: z.string().datetime(),
  dayNumber: z.number().int().positive().optional(),
  content: z.string().min(1),
  iv: z.string().optional(), // For encryption
  mood: z.enum(['great', 'good', 'neutral', 'bad', 'terrible']).optional(),
  tags: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  gratitude: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  periodId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  completed: z.boolean(),
  completedAt: z.string().datetime().optional(),
  progress: z.number().min(0).max(100).optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Habit Schema
export const HabitSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  periodId: z.string().uuid().optional(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  targetCount: z.number().int().positive().optional(),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  completions: z.array(z.object({
    date: z.string().datetime(),
    notes: z.string().optional(),
  })),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Encrypted data wrapper
export const EncryptedDataSchema = z.object({
  data: z.string(), // base64 encrypted data
  iv: z.string(),   // initialization vector
  salt: z.string(), // for key derivation
});

// Type exports
export type User = z.infer<typeof UserSchema>;
export type Period = z.infer<typeof PeriodSchema>;
export type JournalEntry = z.infer<typeof JournalEntrySchema>;
export type Goal = z.infer<typeof GoalSchema>;
export type Habit = z.infer<typeof HabitSchema>;
export type EncryptedData = z.infer<typeof EncryptedDataSchema>;

// Creation schemas (for validation of new entities)
export const createUserSchema = UserSchema;
export const createJournalEntrySchema = JournalEntrySchema;