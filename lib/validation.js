/**
 * Zod validation schemas for forms and API requests
 * @module lib/validation
 */

import { z } from 'zod';

// ============================================
// Auth Schemas
// ============================================

export const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  role: z.enum(['instructor', 'student'], {
    required_error: 'Please select a role',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================
// Assignment Schemas
// ============================================

export const createAssignmentSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(5000, 'Description must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  referenceAnswer: z
    .string()
    .max(50000, 'Reference answer must be less than 50000 characters')
    .optional()
    .or(z.literal('')),
  course: z.string().optional(),
  rubricId: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().or(z.literal('')),
  maxScore: z
    .number()
    .int()
    .min(1, 'Max score must be at least 1')
    .max(1000, 'Max score must be less than 1000')
    .default(100),
});

export const updateAssignmentSchema = createAssignmentSchema.partial();

// ============================================
// Submission Schemas
// ============================================

export const submitAnswerSchema = z.object({
  assignmentId: z.string().uuid('Invalid assignment ID'),
  studentAnswer: z
    .string()
    .min(1, 'Answer is required')
    .max(100000, 'Answer must be less than 100000 characters'),
});

export const updateFeedbackSchema = z.object({
  score: z
    .number()
    .int()
    .min(0, 'Score must be at least 0')
    .max(100, 'Score must be at most 100')
    .optional(),
  feedback: z
    .string()
    .max(10000, 'Feedback must be less than 10000 characters')
    .optional(),
});

// ============================================
// Rubric Schemas
// ============================================

export const rubricCriterionSchema = z.object({
  name: z
    .string()
    .min(1, 'Criterion name is required')
    .max(100, 'Criterion name must be less than 100 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  weight: z
    .number()
    .min(0, 'Weight must be at least 0')
    .max(100, 'Weight must be at most 100')
    .default(1),
  maxPoints: z
    .number()
    .int()
    .min(1, 'Max points must be at least 1')
    .max(100, 'Max points must be at most 100')
    .default(10),
});

export const createRubricSchema = z.object({
  name: z
    .string()
    .min(1, 'Rubric name is required')
    .min(3, 'Name must be at least 3 characters')
    .max(200, 'Name must be less than 200 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  criteria: z
    .array(rubricCriterionSchema)
    .min(1, 'At least one criterion is required')
    .max(20, 'Maximum 20 criteria allowed'),
});

export const updateRubricSchema = createRubricSchema.partial();

// ============================================
// Profile Schemas
// ============================================

export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
});
