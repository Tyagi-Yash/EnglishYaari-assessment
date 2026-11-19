import { Schema, model, Document, Types } from 'mongoose';

export interface IUser {
  fullName: string;
  email: string;
  phone: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

const userSchema = new Schema<IUserDocument>(
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
    phone: {
      type: String,
      required: [true, 'phone is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const User = model<IUserDocument>('User', userSchema);
