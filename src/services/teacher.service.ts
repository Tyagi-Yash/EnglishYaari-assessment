import { Teacher, ITeacherDocument } from '../models/teacher.model';
import { CreateTeacherInput } from '../validators/teacher.validator';
import { AppError } from '../utils/appError';

export const createTeacher = async (input: CreateTeacherInput): Promise<ITeacherDocument> => {
  const existingTeacher = await Teacher.findOne({ email: input.email }).lean();
  if (existingTeacher) {
    throw new AppError('A teacher with this email already exists', 409);
  }

  return Teacher.create(input);
};

export const getAllTeachers = async (): Promise<ITeacherDocument[]> => {
  return Teacher.find().sort({ createdAt: -1 }).exec();
};
