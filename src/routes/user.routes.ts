import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { validate } from '../middlewares/validate.middleware';
import { createUserSchema, getUserSessionsSchema } from '../validators/user.validator';

const router = Router();

// API 1 - Create User
router.post('/', validate(createUserSchema), userController.createUser);

// API 6 - User Session List
router.get('/:id/sessions', validate(getUserSessionsSchema), userController.getUserSessions);

export default router;
