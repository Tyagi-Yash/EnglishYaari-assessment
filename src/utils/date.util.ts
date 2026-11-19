import { AppError } from './appError';

export interface UtcDayRange {
  startOfDay: Date;
  endOfDay: Date;
}

/**
 * Parses a dateTimestamp query parameter into a Date instance.
 * Supports:
 * - Unix timestamps in milliseconds (e.g. 1763424000000)
 * - Unix timestamps in seconds (e.g. 1763424000)
 * - ISO-8601 date strings (e.g. 2026-11-18 or 2026-11-18T00:00:00.000Z)
 */
export const parseDateTimestamp = (rawValue: string): Date => {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    throw new AppError('dateTimestamp query parameter is required', 400);
  }

  let date: Date;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const numericValue = Number(trimmed);
    if (!Number.isFinite(numericValue)) {
      throw new AppError('Invalid dateTimestamp value', 400);
    }
    // Values below 1e12 (~year 2001 in ms, or year 33658 in seconds) are treated as Unix seconds
    const epochMs = Math.abs(numericValue) < 1e12 ? numericValue * 1000 : numericValue;
    date = new Date(epochMs);
  } else {
    date = new Date(trimmed);
  }

  if (Number.isNaN(date.getTime())) {
    throw new AppError(
      'Invalid dateTimestamp format. Provide a Unix timestamp (ms or seconds) or ISO date string.',
      400,
    );
  }

  return date;
};

/**
 * Returns the UTC day boundaries [startOfDay, endOfDay) for the given date.
 */
export const getUtcDayRange = (date: Date): UtcDayRange => {
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0),
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay, endOfDay };
};
