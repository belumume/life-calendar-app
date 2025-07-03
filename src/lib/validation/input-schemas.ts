import { z } from 'zod';

// Password validation
export const PasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be less than 100 characters')
  .refine(
    (password) => /[A-Z]/.test(password),
    'Password must contain at least one uppercase letter'
  )
  .refine(
    (password) => /[a-z]/.test(password),
    'Password must contain at least one lowercase letter'
  )
  .refine(
    (password) => /[0-9]/.test(password),
    'Password must contain at least one number'
  );

// Birth date validation
export const BirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
  .refine((date) => {
    const birthDate = new Date(date);
    const today = new Date();
    const minDate = new Date('1900-01-01');
    
    return birthDate >= minDate && birthDate <= today;
  }, 'Birth date must be between 1900 and today');

// Journal content validation
export const JournalContentSchema = z
  .string()
  .min(1, 'Journal entry cannot be empty')
  .max(10000, 'Journal entry must be less than 10,000 characters')
  .transform((content) => content.trim());

// Day number validation
export const DayNumberSchema = z
  .number()
  .int('Day number must be an integer')
  .positive('Day number must be positive')
  .max(365, 'Day number must be less than 365');

// Period name validation
export const PeriodNameSchema = z
  .string()
  .min(1, 'Period name cannot be empty')
  .max(100, 'Period name must be less than 100 characters')
  .transform((name) => name.trim());

// Tag validation
export const TagSchema = z
  .string()
  .min(1, 'Tag cannot be empty')
  .max(50, 'Tag must be less than 50 characters')
  .regex(/^[a-zA-Z0-9-_]+$/, 'Tag can only contain letters, numbers, hyphens, and underscores')
  .transform((tag) => tag.toLowerCase());

// Mood validation
export const MoodSchema = z.enum(['great', 'good', 'neutral', 'bad', 'terrible']);

// Achievement/Gratitude item validation
export const ListItemSchema = z
  .string()
  .min(1, 'Item cannot be empty')
  .max(200, 'Item must be less than 200 characters')
  .transform((item) => item.trim());

// Setup form validation
export const SetupFormSchema = z.object({
  birthDate: BirthDateSchema,
  passphrase: PasswordSchema,
  confirmPassphrase: z.string(),
}).refine((data) => data.passphrase === data.confirmPassphrase, {
  message: "Passphrases don't match",
  path: ["confirmPassphrase"],
});

// Login form validation
export const LoginFormSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

// Journal entry form validation
export const JournalEntryFormSchema = z.object({
  content: JournalContentSchema,
  mood: MoodSchema.optional(),
  tags: z.array(TagSchema).optional(),
  achievements: z.array(ListItemSchema).optional(),
  gratitude: z.array(ListItemSchema).optional(),
});

// Sanitization utilities
export const sanitizeHtml = (input: string): string => {
  // Basic HTML entity encoding
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sanitizeForDisplay = (input: string): string => {
  // Remove any potential script tags or dangerous content
  return sanitizeHtml(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
};

// Helper to sanitize input while preserving structure
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, ' ');
};

// Goal input schemas
export const GoalTitleSchema = z.string()
  .min(1, 'Goal title is required')
  .max(200, 'Goal title must be less than 200 characters')
  .transform(sanitizeInput);

export const GoalDescriptionSchema = z.string()
  .max(1000, 'Description must be less than 1000 characters')
  .optional()
  .transform(val => val ? sanitizeInput(val) : undefined);

export const MilestoneTitleSchema = z.string()
  .min(1, 'Milestone title is required')
  .max(100, 'Milestone title must be less than 100 characters')
  .transform(sanitizeInput);

export const GoalFormSchema = z.object({
  title: GoalTitleSchema,
  description: GoalDescriptionSchema,
  category: z.enum(['health', 'career', 'personal', 'financial', 'learning', 'relationship', 'other']),
  priority: z.enum(['high', 'medium', 'low']),
  targetDate: z.string().optional(),
  milestones: z.array(z.object({
    title: MilestoneTitleSchema,
  })).optional(),
});

export type GoalFormData = z.infer<typeof GoalFormSchema>;

export const GoalProgressSchema = z.number()
  .min(0, 'Progress cannot be negative')
  .max(100, 'Progress cannot exceed 100%');