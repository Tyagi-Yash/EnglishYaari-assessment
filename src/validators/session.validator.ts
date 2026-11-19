import { z } from 'zod';
import { Types } from 'mongoose';

const objectIdSchema = z
  .string()
  .trim()
  .refine((val) => Types.ObjectId.isValid(val), {
    message: 'Invalid ObjectId format',
  });

const dateInputSchema = z
  .union([z.string(), z.number(), z.date()])
  .transform((value) => {
    if (value instanceof Date) return value;
    if (typeof value === 'number') {
      const epochMs = Math.abs(value) < 1e12 ? value * 1000 : value;
      return new Date(epochMs);
    }
    const trimmed = value.trim();
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const num = Number(trimmed);
      const epochMs = Math.abs(num) < 1e12 ? num * 1000 : num;
      return new Date(epochMs);
    }
    return new Date(trimmed);
  })
  .refine((date) => !Number.isNaN(date.getTime()), {
    message: 'Must be a valid ISO date string or Unix timestamp',
  });

export const createSessionSchema = z.object({
  body: z
    .object({
      teacherId: objectIdSchema,
      startTime: dateInputSchema,
      endTime: dateInputSchema,
    })
    .refine((data) => data.endTime.getTime() > data.startTime.getTime(), {
      message: 'endTime must be greater than startTime',
      path: ['endTime'],
    }),
});

export const availableSessionsSchema = z.object({
  query: z.object({
    dateTimestamp: z
      .string({ required_error: 'dateTimestamp query parameter is required' })
      .trim()
      .min(1, 'dateTimestamp query parameter is required'),
  }),
});

export const bookSessionSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    userId: objectIdSchema,
  }),
});

export const completeSessionSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>['body'];
export type BookSessionInput = z.infer<typeof bookSessionSchema>['body'];
