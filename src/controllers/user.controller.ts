import { Request, Response } from 'express';
import * as userService from '../services/user.service';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * API 1 - POST /users
 */
export const createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const user = await userService.createUser(req.body);

  res.status(201).json({
    success: true,
    message: 'User created successfully',
    data: user,
  });
});

/**
 * API 6 - GET /users/:id/sessions
 */
export const getUserSessions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const sessions = await userService.getUserSessions(req.params.id);

  res.status(200).json({
    success: true,
    data: sessions,
  });
});
