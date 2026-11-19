import { Schema, model, Document, Types } from 'mongoose';

export interface ITeacher {
  fullName: string;
  email: string;
  specialization: string;
  experience: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeacherDocument extends ITeacher, Document {
  _id: Types.ObjectId;
}

const teacherSchema = new Schema<ITeacherDocument>(
  {
    fullName: {
      type: String,
      required: [true, 'fullName is required'],
      trim: true,
      minlength: [2, 'fullName must be at least 2 characters'],
      maxlength: [100, 'fullName must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: [true, 'specialization is required'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'experience is required'],
      min: [0, 'experience cannot be negative'],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Teacher = model<ITeacherDocument>('Teacher', teacherSchema);
