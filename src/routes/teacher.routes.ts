import { Router } from 'express';
import * as teacherController from '../controllers/teacher.controller';
import { validate } from '../middlewares/validate.middleware';
import { createTeacherSchema } from '../validators/teacher.validator';

const router = Router();

router.post('/', validate(createTeacherSchema), teacherController.createTeacher);
router.get('/', teacherController.getAllTeachers);

export default router;
