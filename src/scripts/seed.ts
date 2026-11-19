import { connectDatabase, disconnectDatabase } from '../config/database';
import { env } from '../config/env';
import { Teacher } from '../models/teacher.model';
import { User } from '../models/user.model';
import { Session, SessionStatus } from '../models/session.model';

const seed = async (): Promise<void> => {
  await connectDatabase(env.mongoUri);

  try {
    const teachersData = [
      {
        fullName: 'Ananya Sharma',
        email: 'ananya.sharma@englishyaari.com',
        specialization: 'Business English & Interview Preparation',
        experience: 6,
      },
      {
        fullName: 'Rohan Mehta',
        email: 'rohan.mehta@englishyaari.com',
        specialization: 'IELTS & Conversational Fluency',
        experience: 4,
      },
    ];

    const teachers = [];
    for (const data of teachersData) {
      const teacher = await Teacher.findOneAndUpdate(
        { email: data.email },
        { $setOnInsert: data },
        { upsert: true, new: true },
      );
      teachers.push(teacher);
    }

    const userData = {
      fullName: 'Aarav Patel',
      email: 'aarav.patel@example.com',
      phone: '+91-9876543210',
    };

    const user = await User.findOneAndUpdate(
      { email: userData.email },
      { $setOnInsert: userData },
      { upsert: true, new: true },
    );

    const existingSessionsCount = await Session.countDocuments();
    if (existingSessionsCount === 0 && teachers.length >= 2) {
      const todayUtc = new Date();
      const baseDay = Date.UTC(
        todayUtc.getUTCFullYear(),
        todayUtc.getUTCMonth(),
        todayUtc.getUTCDate(),
      );

      await Session.create([
        {
          teacherId: teachers[0]._id,
          userId: null,
          startTime: new Date(baseDay + 9 * 60 * 60 * 1000),
          endTime: new Date(baseDay + 10 * 60 * 60 * 1000),
          status: SessionStatus.AVAILABLE,
          completedAt: null,
        },
        {
          teacherId: teachers[1]._id,
          userId: null,
          startTime: new Date(baseDay + 11 * 60 * 60 * 1000),
          endTime: new Date(baseDay + 12 * 60 * 60 * 1000),
          status: SessionStatus.AVAILABLE,
          completedAt: null,
        },
      ]);
    }

    console.log('Seed completed successfully:');
    console.log(
      'Teachers:',
      teachers.map((t) => ({ id: t._id.toString(), fullName: t.fullName, email: t.email })),
    );
    console.log('Sample User:', { id: user._id.toString(), fullName: user.fullName, email: user.email });
  } finally {
    await disconnectDatabase();
  }
};

void seed().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
