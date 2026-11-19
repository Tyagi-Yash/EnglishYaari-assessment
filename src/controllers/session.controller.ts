import { Request, Response } from 'express';
import * as sessionService from '../services/session.service';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * API 2 - POST /sessions
 */
export const createSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.createSession(req.body);

  res.status(201).json({
    success: true,
    message: 'Session created successfully',
    data: session,
  });
});

/**
 * API 3 - GET /sessions/available?dateTimestamp={timestamp}
 */
export const getAvailableSessions = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const dateTimestamp = String(req.query.dateTimestamp);
    const { date, sessions } = await sessionService.getAvailableSessionsByDate(dateTimestamp);

    res.status(200).json({
      success: true,
      date,
      count: sessions.length,
      data: sessions,
    });
  },
);

/**
 * API 4 - POST /sessions/:id/book
 */
export const bookSession = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const session = await sessionService.bookSession(req.params.id, req.body.userId);

  res.status(200).json({
    success: true,
    message: 'Session booked successfully',
    data: session,
  });
});

/**
 * API 5 - PATCH /sessions/:id/complete
 */
export const completeSession = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await sessionService.completeSession(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Session marked as completed',
      data: session,
    });
  },
);
