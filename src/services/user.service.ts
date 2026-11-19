import { PipelineStage, Types } from 'mongoose';
import { User, IUserDocument } from '../models/user.model';
import { Session, SessionStatus } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { CreateUserInput } from '../validators/user.validator';
import { AppError } from '../utils/appError';

export interface UserSessionTeacherSummary {
  _id: Types.ObjectId;
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
}

export interface UserSessionItem {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: Types.ObjectId;
  startTime: Date;
  endTime: Date;
  status: SessionStatus;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  teacher: UserSessionTeacherSummary | null;
}

export interface UserSessionsResult {
  upcomingSessions: UserSessionItem[];
  completedSessions: UserSessionItem[];
}

export const createUser = async (input: CreateUserInput): Promise<IUserDocument> => {
  const existingUser = await User.findOne({ email: input.email }).lean();
  if (existingUser) {
    throw new AppError('A user with this email already exists', 409);
  }

  return User.create(input);
};

/**
 * API 6 - User Session List
 */
export const getUserSessions = async (userId: string): Promise<UserSessionsResult> => {
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        userId: new Types.ObjectId(userId),
        status: { $in: [SessionStatus.BOOKED, SessionStatus.COMPLETED] },
      },
    },
    {
      $lookup: {
        from: Teacher.collection.name,
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher',
      },
    },
    {
      $unwind: {
        path: '$teacher',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 1,
        teacherId: 1,
        userId: 1,
        startTime: 1,
        endTime: 1,
        status: 1,
        completedAt: 1,
        createdAt: 1,
        updatedAt: 1,
        teacher: {
          $cond: [
            { $ifNull: ['$teacher._id', false] },
            {
              _id: '$teacher._id',
              fullName: '$teacher.fullName',
              email: '$teacher.email',
              specialization: '$teacher.specialization',
              experience: '$teacher.experience',
            },
            null,
          ],
        },
      },
    },
    {
      $facet: {
        upcomingSessions: [
          { $match: { status: SessionStatus.BOOKED } },
          { $sort: { startTime: 1 } },
        ],
        completedSessions: [
          { $match: { status: SessionStatus.COMPLETED } },
          { $sort: { completedAt: -1, endTime: -1 } },
        ],
      },
    },
  ];

  const [result] = await Session.aggregate<UserSessionsResult>(pipeline);

  return {
    upcomingSessions: result?.upcomingSessions ?? [],
    completedSessions: result?.completedSessions ?? [],
  };
};
