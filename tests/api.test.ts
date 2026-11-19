import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../src/app';
import { User } from '../src/models/user.model';
import { Teacher } from '../src/models/teacher.model';
import { Session, SessionStatus } from '../src/models/session.model';

const app = createApp();
let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Teacher.deleteMany({}),
    Session.deleteMany({}),
  ]);
});

describe('EnglishYaari Session Booking REST API', () => {
  describe('GET /health & 404 Handling', () => {
    it('returns health status 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('ok');
    });

    it('returns 404 for unknown routes', async () => {
      const res = await request(app).get('/unknown-route');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('API 1 - POST /users', () => {
    it('creates a new user and returns 201', async () => {
      const res = await request(app).post('/users').send({
        fullName: 'Aarav Patel',
        email: 'Aarav.Patel@Example.com',
        phone: '+91-9876543210',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Aarav Patel');
      expect(res.body.data.email).toBe('aarav.patel@example.com');
      expect(res.body.data.phone).toBe('+91-9876543210');
      expect(res.body.data.createdAt).toBeDefined();
      expect(res.body.data.updatedAt).toBeDefined();
    });

    it('returns 409 when creating a user with a duplicate email', async () => {
      await User.create({
        fullName: 'Existing User',
        email: 'duplicate@example.com',
        phone: '+91-9999999999',
      });

      const res = await request(app).post('/users').send({
        fullName: 'Another User',
        email: 'DUPLICATE@example.com',
        phone: '+91-8888888888',
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('returns 400 when required fields are invalid or missing', async () => {
      const res = await request(app).post('/users').send({
        fullName: 'A',
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(Array.isArray(res.body.errors)).toBe(true);
    });
  });

  describe('Helper - POST /teachers & GET /teachers', () => {
    it('creates and lists teachers', async () => {
      const createRes = await request(app).post('/teachers').send({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });

      expect(createRes.status).toBe(201);
      expect(createRes.body.data.specialization).toBe('Business English');

      const listRes = await request(app).get('/teachers');
      expect(listRes.status).toBe(200);
      expect(listRes.body.count).toBe(1);
    });
  });

  describe('API 2 - POST /sessions', () => {
    it('creates an AVAILABLE session for an existing teacher', async () => {
      const teacher = await Teacher.create({
        fullName: 'Rohan Mehta',
        email: 'rohan@englishyaari.com',
        specialization: 'IELTS Speaking',
        experience: 5,
      });

      const res = await request(app).post('/sessions').send({
        teacherId: teacher._id.toString(),
        startTime: '2026-12-01T10:00:00.000Z',
        endTime: '2026-12-01T11:00:00.000Z',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(SessionStatus.AVAILABLE);
      expect(res.body.data.userId).toBeNull();
      expect(res.body.data.completedAt).toBeNull();
      expect(res.body.data.teacherId).toBe(teacher._id.toString());
    });

    it('returns 404 when teacher does not exist', async () => {
      const nonExistentTeacherId = new mongoose.Types.ObjectId().toString();

      const res = await request(app).post('/sessions').send({
        teacherId: nonExistentTeacherId,
        startTime: '2026-12-01T10:00:00.000Z',
        endTime: '2026-12-01T11:00:00.000Z',
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/teacher not found/i);
    });

    it('returns 400 when endTime is not greater than startTime', async () => {
      const teacher = await Teacher.create({
        fullName: 'Rohan Mehta',
        email: 'rohan@englishyaari.com',
        specialization: 'IELTS Speaking',
        experience: 5,
      });

      const res = await request(app).post('/sessions').send({
        teacherId: teacher._id.toString(),
        startTime: '2026-12-01T11:00:00.000Z',
        endTime: '2026-12-01T10:00:00.000Z',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('API 3 - GET /sessions/available?dateTimestamp={timestamp}', () => {
    it('returns only AVAILABLE sessions for the given date sorted by startTime with teacher info', async () => {
      const teacher = await Teacher.create({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });
      const user = await User.create({
        fullName: 'Priya Verma',
        email: 'priya@example.com',
        phone: '+91-9111111111',
      });

      // Two AVAILABLE sessions on 2026-12-05 (inserted out of chronological order)
      const laterAvailable = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-05T14:00:00.000Z'),
        endTime: new Date('2026-12-05T15:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });
      const earlierAvailable = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-05T09:00:00.000Z'),
        endTime: new Date('2026-12-05T10:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });

      // BOOKED session on the same date (must NOT be returned)
      await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-12-05T11:00:00.000Z'),
        endTime: new Date('2026-12-05T12:00:00.000Z'),
        status: SessionStatus.BOOKED,
      });

      // AVAILABLE session on a different date (must NOT be returned)
      await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-06T09:00:00.000Z'),
        endTime: new Date('2026-12-06T10:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });

      const targetTimestampMs = Date.UTC(2026, 11, 5, 6, 30, 0); // 2026-12-05T06:30:00.000Z
      const res = await request(app).get(`/sessions/available?dateTimestamp=${targetTimestampMs}`);

      expect(res.status).toBe(200);
      expect(res.body.date).toBe('2026-12-05');
      expect(res.body.count).toBe(2);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]._id).toBe(earlierAvailable._id.toString());
      expect(res.body.data[1]._id).toBe(laterAvailable._id.toString());
      expect(res.body.data[0].teacher.fullName).toBe('Ananya Sharma');

      // Also verify Unix seconds timestamp support
      const targetTimestampSeconds = Math.floor(targetTimestampMs / 1000);
      const secRes = await request(app).get(
        `/sessions/available?dateTimestamp=${targetTimestampSeconds}`,
      );
      expect(secRes.status).toBe(200);
      expect(secRes.body.count).toBe(2);
    });

    it('returns 400 when dateTimestamp is missing or invalid', async () => {
      const missingRes = await request(app).get('/sessions/available');
      expect(missingRes.status).toBe(400);

      const invalidRes = await request(app).get('/sessions/available?dateTimestamp=not-a-date');
      expect(invalidRes.status).toBe(400);
    });
  });

  describe('API 4 - POST /sessions/:id/book', () => {
    it('books an AVAILABLE session and prevents double booking', async () => {
      const teacher = await Teacher.create({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });
      const user1 = await User.create({
        fullName: 'User One',
        email: 'user1@example.com',
        phone: '+91-9000000001',
      });
      const user2 = await User.create({
        fullName: 'User Two',
        email: 'user2@example.com',
        phone: '+91-9000000002',
      });
      const session = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-10T10:00:00.000Z'),
        endTime: new Date('2026-12-10T11:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });

      const firstBook = await request(app)
        .post(`/sessions/${session._id.toString()}/book`)
        .send({ userId: user1._id.toString() });

      expect(firstBook.status).toBe(200);
      expect(firstBook.body.data.status).toBe(SessionStatus.BOOKED);
      expect(firstBook.body.data.userId).toBe(user1._id.toString());

      // Attempting to book again must fail with 409 Conflict
      const secondBook = await request(app)
        .post(`/sessions/${session._id.toString()}/book`)
        .send({ userId: user2._id.toString() });

      expect(secondBook.status).toBe(409);
      expect(secondBook.body.message).toMatch(/already booked/i);
    });

    it('handles concurrent booking requests safely (only one succeeds)', async () => {
      const teacher = await Teacher.create({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });
      const [user1, user2] = await User.create([
        { fullName: 'User One', email: 'u1@example.com', phone: '+91-9000000001' },
        { fullName: 'User Two', email: 'u2@example.com', phone: '+91-9000000002' },
      ]);
      const session = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-10T12:00:00.000Z'),
        endTime: new Date('2026-12-10T13:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });

      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/sessions/${session._id.toString()}/book`)
          .send({ userId: user1._id.toString() }),
        request(app)
          .post(`/sessions/${session._id.toString()}/book`)
          .send({ userId: user2._id.toString() }),
      ]);

      const statuses = [res1.status, res2.status].sort((a, b) => a - b);
      expect(statuses).toEqual([200, 409]);
    });

    it('returns 404 when user or session does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const user = await User.create({
        fullName: 'User One',
        email: 'user1@example.com',
        phone: '+91-9000000001',
      });

      const missingUserRes = await request(app)
        .post(`/sessions/${fakeId}/book`)
        .send({ userId: fakeId });
      expect(missingUserRes.status).toBe(404);
      expect(missingUserRes.body.message).toMatch(/user not found/i);

      const missingSessionRes = await request(app)
        .post(`/sessions/${fakeId}/book`)
        .send({ userId: user._id.toString() });
      expect(missingSessionRes.status).toBe(404);
      expect(missingSessionRes.body.message).toMatch(/session not found/i);
    });
  });

  describe('API 5 - PATCH /sessions/:id/complete', () => {
    it('marks a BOOKED session as COMPLETED and sets completedAt', async () => {
      const teacher = await Teacher.create({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });
      const user = await User.create({
        fullName: 'Aarav Patel',
        email: 'aarav@example.com',
        phone: '+91-9876543210',
      });
      const session = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-12-10T10:00:00.000Z'),
        endTime: new Date('2026-12-10T11:00:00.000Z'),
        status: SessionStatus.BOOKED,
      });

      const res = await request(app).patch(`/sessions/${session._id.toString()}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(SessionStatus.COMPLETED);
      expect(res.body.data.completedAt).not.toBeNull();

      // Completing again should fail with 409
      const repeatRes = await request(app).patch(`/sessions/${session._id.toString()}/complete`);
      expect(repeatRes.status).toBe(409);
    });

    it('rejects completing an AVAILABLE session with 409', async () => {
      const teacher = await Teacher.create({
        fullName: 'Ananya Sharma',
        email: 'ananya@englishyaari.com',
        specialization: 'Business English',
        experience: 6,
      });
      const session = await Session.create({
        teacherId: teacher._id,
        startTime: new Date('2026-12-10T10:00:00.000Z'),
        endTime: new Date('2026-12-10T11:00:00.000Z'),
        status: SessionStatus.AVAILABLE,
      });

      const res = await request(app).patch(`/sessions/${session._id.toString()}/complete`);
      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/only booked sessions/i);
    });

    it('returns 404 when session does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).patch(`/sessions/${fakeId}/complete`);
      expect(res.status).toBe(404);
    });
  });

  describe('API 6 - GET /users/:id/sessions', () => {
    it('returns user sessions separated into upcomingSessions and completedSessions via aggregation', async () => {
      const teacher = await Teacher.create({
        fullName: 'Rohan Mehta',
        email: 'rohan@englishyaari.com',
        specialization: 'Conversational Fluency',
        experience: 4,
      });
      const user = await User.create({
        fullName: 'Aarav Patel',
        email: 'aarav@example.com',
        phone: '+91-9876543210',
      });
      const otherUser = await User.create({
        fullName: 'Other User',
        email: 'other@example.com',
        phone: '+91-9222222222',
      });

      const upcomingSession = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-12-20T10:00:00.000Z'),
        endTime: new Date('2026-12-20T11:00:00.000Z'),
        status: SessionStatus.BOOKED,
      });

      const completedSession = await Session.create({
        teacherId: teacher._id,
        userId: user._id,
        startTime: new Date('2026-12-01T10:00:00.000Z'),
        endTime: new Date('2026-12-01T11:00:00.000Z'),
        status: SessionStatus.COMPLETED,
        completedAt: new Date('2026-12-01T11:05:00.000Z'),
      });

      // Another user's session (must NOT appear)
      await Session.create({
        teacherId: teacher._id,
        userId: otherUser._id,
        startTime: new Date('2026-12-22T10:00:00.000Z'),
        endTime: new Date('2026-12-22T11:00:00.000Z'),
        status: SessionStatus.BOOKED,
      });

      const res = await request(app).get(`/users/${user._id.toString()}/sessions`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.upcomingSessions).toHaveLength(1);
      expect(res.body.data.completedSessions).toHaveLength(1);
      expect(res.body.data.upcomingSessions[0]._id).toBe(upcomingSession._id.toString());
      expect(res.body.data.upcomingSessions[0].teacher.fullName).toBe('Rohan Mehta');
      expect(res.body.data.completedSessions[0]._id).toBe(completedSession._id.toString());
      expect(res.body.data.completedSessions[0].completedAt).toBeDefined();
    });

    it('returns empty arrays when user has no sessions', async () => {
      const user = await User.create({
        fullName: 'New User',
        email: 'new@example.com',
        phone: '+91-9333333333',
      });

      const res = await request(app).get(`/users/${user._id.toString()}/sessions`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({
        upcomingSessions: [],
        completedSessions: [],
      });
    });

    it('returns 404 when user does not exist', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app).get(`/users/${fakeId}/sessions`);
      expect(res.status).toBe(404);
    });
  });
});
