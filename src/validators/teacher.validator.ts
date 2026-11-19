import { z } from 'zod';

export const createTeacherSchema = z.object({
  body: z.object({
    fullName: z
      .string({ required_error: 'fullName is required' })
      .trim()
      .min(2, 'fullName must be at least 2 characters')
      .max(100, 'fullName must not exceed 100 characters'),
    email: z
      .string({ required_error: 'email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    specialization: z
      .string({ required_error: 'specialization is required' })
      .trim()
      .min(2, 'specialization must be at least 2 characters')
      .max(120, 'specialization must not exceed 120 characters'),
    experience: z
      .number({ required_error: 'experience is required', invalid_type_error: 'experience must be a number' })
      .min(0, 'experience cannot be negative')
      .max(80, 'experience seems unrealistically high'),
  }),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>['body'];
