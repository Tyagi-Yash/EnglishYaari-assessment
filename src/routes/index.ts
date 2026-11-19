import { Router, Request, Response } from 'express';
import userRoutes from './user.routes';
import teacherRoutes from './teacher.routes';
import sessionRoutes from './session.routes';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

router.use('/users', userRoutes);
router.use('/teachers', teacherRoutes);
router.use('/sessions', sessionRoutes);

export default router;
