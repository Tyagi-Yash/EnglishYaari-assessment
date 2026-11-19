import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

export const createUserSchema = z.object({
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
    phone: z
      .string({ required_error: 'phone is required' })
      .trim()
      .min(7, 'phone must be at least 7 characters')
      .max(20, 'phone must not exceed 20 characters'),
  }),
});

export const getUserSessionsSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
