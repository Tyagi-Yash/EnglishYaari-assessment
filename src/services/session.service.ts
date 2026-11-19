import { PipelineStage, Types } from 'mongoose';
import { Session, SessionStatus, ISessionDocument } from '../models/session.model';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { CreateSessionInput } from '../validators/session.validator';
import { AppError } from '../utils/appError';
import { parseDateTimestamp, getUtcDayRange } from '../utils/date.util';

export interface AvailableSessionItem {
  _id: Types.ObjectId;
  teacherId: Types.ObjectId;
  userId: null;
  startTime: Date;
  endTime: Date;
  status: SessionStatus.AVAILABLE;
  completedAt: null;
  createdAt: Date;
  updatedAt: Date;
  teacher: {
    _id: Types.ObjectId;
    fullName: string;
    email: string;
    specialization: string;
    experience: number;
  } | null;
}

/**
 * API 2 - Create Session
 */
export const createSession = async (input: CreateSessionInput): Promise<ISessionDocument> => {
  const teacherExists = await Teacher.exists({ _id: input.teacherId });
  if (!teacherExists) {
    throw new AppError('Teacher not found', 404);
  }

  if (input.endTime.getTime() <= input.startTime.getTime()) {
    throw new AppError('endTime must be greater than startTime', 400);
  }

  return Session.create({
    teacherId: new Types.ObjectId(input.teacherId),
    userId: null,
    startTime: input.startTime,
    endTime: input.endTime,
    status: SessionStatus.AVAILABLE,
    completedAt: null,
  });
};

/**
 * API 3 - Available Sessions for Booking
 */
export const getAvailableSessionsByDate = async (
  rawDateTimestamp: string,
): Promise<{ date: string; sessions: AvailableSessionItem[] }> => {
  const parsedDate = parseDateTimestamp(rawDateTimestamp);
  const { startOfDay, endOfDay } = getUtcDayRange(parsedDate);

  const pipeline: PipelineStage[] = [
    {
      $match: {
        status: SessionStatus.AVAILABLE,
        startTime: {
          $gte: startOfDay,
          $lt: endOfDay,
        },
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
      $sort: {
        startTime: 1,
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
  ];

  const sessions = await Session.aggregate<AvailableSessionItem>(pipeline);

  return {
    date: startOfDay.toISOString().split('T')[0],
    sessions,
  };
};

/**
 * API 4 - Book Session
 */
export const bookSession = async (
  sessionId: string,
  userId: string,
): Promise<ISessionDocument> => {
  const userExists = await User.exists({ _id: userId });
  if (!userExists) {
    throw new AppError('User not found', 404);
  }

  const bookedSession = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      status: SessionStatus.AVAILABLE,
    },
    {
      $set: {
        status: SessionStatus.BOOKED,
        userId: new Types.ObjectId(userId),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (bookedSession) {
    return bookedSession;
  }

  const existingSession = await Session.findById(sessionId).lean();
  if (!existingSession) {
    throw new AppError('Session not found', 404);
  }

  if (existingSession.status === SessionStatus.BOOKED) {
    throw new AppError('Session is already booked', 409);
  }

  throw new AppError('Only AVAILABLE sessions can be booked', 409);
};

/**
 * API 5 - Mark Session Complete
 */
export const completeSession = async (sessionId: string): Promise<ISessionDocument> => {
  const completedSession = await Session.findOneAndUpdate(
    {
      _id: sessionId,
      status: SessionStatus.BOOKED,
    },
    {
      $set: {
        status: SessionStatus.COMPLETED,
        completedAt: new Date(),
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (completedSession) {
    return completedSession;
  }

  const existingSession = await Session.findById(sessionId).lean();
  if (!existingSession) {
    throw new AppError('Session not found', 404);
  }

  if (existingSession.status === SessionStatus.COMPLETED) {
    throw new AppError('Session is already marked as completed', 409);
  }

  throw new AppError('Only BOOKED sessions can be marked as completed', 409);
};
