import { Router } from 'express';
import * as sessionController from '../controllers/session.controller';
import { validate } from '../middlewares/validate.middleware';
import {
  createSessionSchema,
  availableSessionsSchema,
  bookSessionSchema,
  completeSessionSchema,
} from '../validators/session.validator';

const router = Router();

// API 2 - Create Session
router.post('/', validate(createSessionSchema), sessionController.createSession);

// API 3 - Available Sessions for Booking
router.get('/available', validate(availableSessionsSchema), sessionController.getAvailableSessions);

// API 4 - Book Session
router.post('/:id/book', validate(bookSessionSchema), sessionController.bookSession);

// API 5 - Mark Session Complete
router.patch('/:id/complete', validate(completeSessionSchema), sessionController.completeSession);

export default router;
