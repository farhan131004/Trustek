import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalysisResult extends Document {
  _id: string;
  userId: string;
  type: 'fake_news' | 'review' | 'website';
  input: string;
  result: {
    verdict: 'TRUE' | 'FALSE' | 'UNVERIFIED' | 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
    confidence: number;
    summary: string;
    sources?: Array<{
      uri: string;
      title: string;
      domain: string;
    }>;
    details?: any;
  };
  metadata: {
    processingTime: number;
    apiUsed: string;
    timestamp: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const analysisResultSchema = new Schema<IAnalysisResult>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    ref: 'User',
  },
  type: {
    type: String,
    required: [true, 'Analysis type is required'],
    enum: ['fake_news', 'review', 'website'],
  },
  input: {
    type: String,
    required: [true, 'Input text is required'],
    maxlength: [10000, 'Input text cannot exceed 10000 characters'],
  },
  result: {
    verdict: {
      type: String,
      required: [true, 'Verdict is required'],
      enum: ['TRUE', 'FALSE', 'UNVERIFIED', 'SAFE', 'SUSPICIOUS', 'MALICIOUS'],
    },
    confidence: {
      type: Number,
      required: [true, 'Confidence score is required'],
      min: [0, 'Confidence must be between 0 and 1'],
      max: [1, 'Confidence must be between 0 and 1'],
    },
    summary: {
      type: String,
      required: [true, 'Summary is required'],
      maxlength: [2000, 'Summary cannot exceed 2000 characters'],
    },
    sources: [{
      uri: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        required: true,
      },
      domain: {
        type: String,
        required: true,
      },
    }],
    details: {
      type: Schema.Types.Mixed,
    },
  },
  metadata: {
    processingTime: {
      type: Number,
      required: true,
    },
    apiUsed: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
analysisResultSchema.index({ userId: 1, createdAt: -1 });
analysisResultSchema.index({ type: 1 });
analysisResultSchema.index({ 'result.verdict': 1 });
analysisResultSchema.index({ createdAt: -1 });

// Virtual for result ID
analysisResultSchema.virtual('id').get(function() {
  return this._id.toString();
});

// Ensure virtual fields are serialized
analysisResultSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const AnalysisResult = mongoose.model<IAnalysisResult>('AnalysisResult', analysisResultSchema);
