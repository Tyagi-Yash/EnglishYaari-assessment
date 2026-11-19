# EnglishYaari Backend Developer Assignment

A REST API backend for a teacher-student session booking platform built with **Node.js**, **TypeScript**, **Express.js**, **MongoDB**, and **Mongoose**.

Teachers create available time slots, users book available sessions (with atomic double-booking protection), booked sessions can be marked as completed, and users can inspect their upcoming and completed session history.

---

## Tech Stack

- **Runtime:** Node.js (v18+ recommended)
- **Language:** TypeScript (strict mode)
- **Framework:** Express.js
- **Database & ODM:** MongoDB & Mongoose
- **Validation:** Zod
- **Testing:** Vitest, Supertest, `mongodb-memory-server`

---

## Project Structure

```text
├── postman/
│   └── EnglishYaari_Backend_API.postman_collection.json
├── src/
│   ├── config/
│   │   ├── database.ts          # MongoDB connection & graceful disconnect
│   │   └── env.ts               # Validated environment variables
│   ├── controllers/             # Express route handlers (async/await)
│   ├── middlewares/
│   │   ├── error.middleware.ts  # Centralized error handling & 404 handler
│   │   └── validate.middleware.ts
│   ├── models/
│   │   ├── user.model.ts        # User schema
│   │   ├── teacher.model.ts     # Teacher schema
│   │   └── session.model.ts     # Session schema + indexes
│   ├── routes/                  # Modular Express routers
│   ├── scripts/
│   │   └── seed.ts              # Optional seed script for sample data
│   ├── services/                # Business logic & MongoDB Aggregation Pipelines
│   ├── utils/
│   │   ├── appError.ts          # Operational AppError class
│   │   ├── asyncHandler.ts      # Async wrapper forwarding rejections to Express
│   │   └── date.util.ts         # Timestamp parsing & UTC day range helpers
│   ├── validators/              # Zod request schemas
│   ├── app.ts                   # Express app factory
│   └── server.ts                # Entry point & graceful shutdown
├── tests/
│   └── api.test.ts              # End-to-end integration tests
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

---

## Setup & Running Locally

### 1. Prerequisites

- **Node.js** v18 or later
- **MongoDB** running locally (e.g. `mongodb://localhost:27017`) or a MongoDB Atlas connection string

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the values if needed:

```bash
cp .env.example .env
```

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/englishyaari_sessions
```

### 4. (Optional) Seed Sample Teachers, User & Sessions

```bash
npm run seed
```

### 5. Run the Server

Development mode (with hot reload):

```bash
npm run dev
```

Production build & start:

```bash
npm run build
npm start
```

### 6. Run Automated Integration Tests

The test suite runs against an in-memory MongoDB instance (`mongodb-memory-server`), so it works even without a local MongoDB daemon running:

```bash
npm test
```

Type-checking:

```bash
npm run typecheck
```

---

## Database Schemas

### User (`users`)
| Field | Type | Constraints |
| --- | --- | --- |
| `fullName` | `String` | Required, trimmed |
| `email` | `String` | Required, unique, lowercase, trimmed |
| `phone` | `String` | Required, trimmed |
| `createdAt` / `updatedAt` | `Date` | Auto-managed (`timestamps: true`) |

### Teacher (`teachers`)
| Field | Type | Constraints |
| --- | --- | --- |
| `fullName` | `String` | Required, trimmed |
| `email` | `String` | Required, unique, lowercase, trimmed |
| `specialization` | `String` | Required, trimmed |
| `experience` | `Number` | Required, `>= 0` |
| `createdAt` / `updatedAt` | `Date` | Auto-managed (`timestamps: true`) |

### Session (`sessions`)
| Field | Type | Constraints |
| --- | --- | --- |
| `teacherId` | `ObjectId` | Required, references `Teacher` |
| `userId` | `ObjectId \| null` | Default `null`, references `User` |
| `startTime` | `Date` | Required |
| `endTime` | `Date` | Required, must be `> startTime` |
| `status` | `String` | Enum: `AVAILABLE`, `BOOKED`, `COMPLETED` (default: `AVAILABLE`) |
| `completedAt` | `Date \| null` | Default `null`, set when marked `COMPLETED` |
| `createdAt` / `updatedAt` | `Date` | Auto-managed (`timestamps: true`) |

---

## API Documentation

### Helper Endpoints (for easy testing)

- `GET /health` — Server health check (`200 OK`)
- `POST /teachers` — Create a teacher (`201 Created`)
- `GET /teachers` — List all teachers (`200 OK`)

---

### API 1 — Create User
`POST /users`

Creates a new user with a unique email address.

**Request Body:**
```json
{
  "fullName": "Aarav Patel",
  "email": "aarav.patel@example.com",
  "phone": "+91-9876543210"
}
```

**Responses:**
- `201 Created` — User created
- `400 Bad Request` — Validation error
- `409 Conflict` — Email already exists

---

### API 2 — Create Session
`POST /sessions`

Creates a new `AVAILABLE` session for an existing teacher. Validates that the teacher exists and `endTime > startTime`.

**Request Body:**
```json
{
  "teacherId": "6740b1234567890abcdef123",
  "startTime": "2026-12-01T10:00:00.000Z",
  "endTime": "2026-12-01T11:00:00.000Z"
}
```

**Responses:**
- `201 Created` — Session created with `status: "AVAILABLE"`, `userId: null`, `completedAt: null`
- `400 Bad Request` — Invalid ObjectId, invalid dates, or `endTime <= startTime`
- `404 Not Found` — Teacher not found

---

### API 3 — Available Sessions for Booking (MongoDB Aggregation Pipeline)
`GET /sessions/available?dateTimestamp={timestamp}`

Returns all `AVAILABLE` sessions whose `startTime` falls on the supplied UTC date, sorted chronologically and enriched with teacher details.

- `dateTimestamp` supports **Unix milliseconds** (e.g. `1796083200000`), **Unix seconds** (e.g. `1796083200`), or an **ISO-8601 date string** (e.g. `2026-12-01`).
- **Aggregation Pipeline Stages:** `$match` (status `AVAILABLE` + UTC day range) → `$lookup` (`teachers`) → `$unwind` → `$sort` (`startTime: 1`) → `$project`.

**Example Response (`200 OK`):**
```json
{
  "success": true,
  "date": "2026-12-01",
  "count": 1,
  "data": [
    {
      "_id": "6740b9999999999abcdef999",
      "teacherId": "6740b1234567890abcdef123",
      "userId": null,
      "startTime": "2026-12-01T10:00:00.000Z",
      "endTime": "2026-12-01T11:00:00.000Z",
      "status": "AVAILABLE",
      "completedAt": null,
      "teacher": {
        "_id": "6740b1234567890abcdef123",
        "fullName": "Ananya Sharma",
        "email": "ananya.sharma@englishyaari.com",
        "specialization": "Business English & Interview Prep",
        "experience": 6
      }
    }
  ]
}
```

---

### API 4 — Book Session
`POST /sessions/:id/book`

Books an `AVAILABLE` session for an existing user using an atomic `findOneAndUpdate` filter (`{ _id, status: "AVAILABLE" }`) to prevent race-condition double bookings.

**Request Body:**
```json
{
  "userId": "6740b5555555555abcdef555"
}
```

**Responses:**
- `200 OK` — Session updated to `status: "BOOKED"` and linked to `userId`
- `400 Bad Request` — Invalid session or user ObjectId
- `404 Not Found` — User or session does not exist
- `409 Conflict` — Session is already booked or not `AVAILABLE`

---

### API 5 — Mark Session Complete
`PATCH /sessions/:id/complete`

Marks a `BOOKED` session as `COMPLETED` and sets `completedAt` to the current timestamp.

**Responses:**
- `200 OK` — Session updated to `status: "COMPLETED"` with `completedAt` set
- `400 Bad Request` — Invalid session ObjectId
- `404 Not Found` — Session does not exist
- `409 Conflict` — Session is `AVAILABLE` (not yet booked) or already `COMPLETED`

---

### API 6 — User Session List (MongoDB Aggregation Pipeline)
`GET /users/:id/sessions`

Returns all sessions belonging to the specified user, partitioned into `upcomingSessions` (`BOOKED`) and `completedSessions` (`COMPLETED`).

- **Aggregation Pipeline Stages:** `$match` (`userId`) → `$lookup` (`teachers`) → `$unwind` → `$project` → `$facet` (`upcomingSessions` sorted by `startTime: 1`, `completedSessions` sorted by `completedAt: -1`).

**Example Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "upcomingSessions": [
      {
        "_id": "6740b9999999999abcdef998",
        "teacherId": "6740b1234567890abcdef123",
        "userId": "6740b5555555555abcdef555",
        "startTime": "2026-12-01T14:00:00.000Z",
        "endTime": "2026-12-01T15:00:00.000Z",
        "status": "BOOKED",
        "completedAt": null,
        "teacher": {
          "_id": "6740b1234567890abcdef123",
          "fullName": "Ananya Sharma",
          "email": "ananya.sharma@englishyaari.com",
          "specialization": "Business English & Interview Prep",
          "experience": 6
        }
      }
    ],
    "completedSessions": [
      {
        "_id": "6740b9999999999abcdef999",
        "teacherId": "6740b1234567890abcdef123",
        "userId": "6740b5555555555abcdef555",
        "startTime": "2026-12-01T10:00:00.000Z",
        "endTime": "2026-12-01T11:00:00.000Z",
        "status": "COMPLETED",
        "completedAt": "2026-11-18T12:00:00.000Z",
        "teacher": {
          "_id": "6740b1234567890abcdef123",
          "fullName": "Ananya Sharma",
          "email": "ananya.sharma@englishyaari.com",
          "specialization": "Business English & Interview Prep",
          "experience": 6
        }
      }
    ]
  }
}
```

---

## Postman Collection

Import [`postman/EnglishYaari_Backend_API.postman_collection.json`](./postman/EnglishYaari_Backend_API.postman_collection.json) into Postman.

The collection includes test scripts that automatically save `teacherId`, `userId`, `sessionId`, and `upcomingSessionId` into collection variables when you execute the requests in sequence:

1. `Setup & Health → Create Teacher (Helper)`
2. `Core Assignment APIs → API 1 - Create User`
3. `Core Assignment APIs → API 2 - Create Session (Slot 1)`
4. `Core Assignment APIs → API 2 - Create Session (Slot 2 - Upcoming)`
5. `Core Assignment APIs → API 3 - Available Sessions for Booking`
6. `Core Assignment APIs → API 4 - Book Session (Slot 1)`
7. `Core Assignment APIs → API 4 - Book Session (Slot 2 - Keep Upcoming)`
8. `Core Assignment APIs → API 5 - Mark Session Complete (Slot 1)`
9. `Core Assignment APIs → API 6 - User Session List (Upcoming & Completed)`
