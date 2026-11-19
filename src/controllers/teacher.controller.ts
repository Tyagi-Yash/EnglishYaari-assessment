import { Request, Response } from 'express';
import * as teacherService from '../services/teacher.service';
import { asyncHandler } from '../utils/asyncHandler';

export const createTeacher = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const teacher = await teacherService.createTeacher(req.body);

  res.status(201).json({
    success: true,
    message: 'Teacher created successfully',
    data: teacher,
  });
});

export const getAllTeachers = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const teachers = await teacherService.getAllTeachers();

  res.status(200).json({
    success: true,
    count: teachers.length,
    data: teachers,
  });
});
