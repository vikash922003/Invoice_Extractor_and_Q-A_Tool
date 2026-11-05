import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IExtractionAttemptModel extends MongooseDocument {
  document_id: mongoose.Types.ObjectId;
  provider: string;
  attempt_number: number;
  status: 'SUCCESS' | 'MALFORMED' | 'ERROR';
  raw_response?: string | null;
  error_message?: string | null;
  created_at: Date;
}

const ExtractionAttemptSchema = new Schema<IExtractionAttemptModel>({
  document_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true, 
    index: true 
  },
  provider: { type: String, required: true, default: 'gemini' },
  attempt_number: { type: Number, required: true },
  status: { 
    type: String, 
    required: true, 
    enum: ['SUCCESS', 'MALFORMED', 'ERROR'] 
  },
  raw_response: { type: String, default: null },
  error_message: { type: String, default: null },
  created_at: { type: Date, default: Date.now }
});

ExtractionAttemptSchema.index({ document_id: 1, attempt_number: -1 });

export const ExtractionAttemptModel = mongoose.model<IExtractionAttemptModel>('ExtractionAttempt', ExtractionAttemptSchema);
