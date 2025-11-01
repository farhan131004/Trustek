import mongoose, { Document, Schema } from 'mongoose';

export interface IUserSession extends Document {
  _id: string;
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSessionSchema = new Schema<IUserSession>({
  userId: {
    type: String,
    required: true,
    ref: 'User',
  },
  refreshToken: {
    type: String,
    required: true,
    unique: true,
  },
  userAgent: { type: String, maxlength: 500 },
  ipAddress: String,
  isActive: { type: Boolean, default: true },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },
  },
}, { timestamps: true });

userSessionSchema.virtual('id').get(function() {
  return this._id.toString();
});

userSessionSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    delete ret.refreshToken;
    return ret;
  },
});

export const UserSession = mongoose.model<IUserSession>('UserSession', userSessionSchema);
