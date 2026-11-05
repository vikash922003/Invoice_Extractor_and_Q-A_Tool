import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';
import { DocumentProcessingStatus } from '../types/index.js';

export interface IDocumentModel extends MongooseDocument {
  original_filename: string;
  stored_file_path: string;
  mime_type: string;
  file_size: number;
  checksum: string;
  processing_status: DocumentProcessingStatus;
  processing_error?: string | null;
  extracted_raw_text?: string | null;
  uploaded_at: Date;
  processed_at?: Date | null;
}

const DocumentSchema = new Schema<IDocumentModel>({
  original_filename: { type: String, required: true },
  stored_file_path: { type: String, required: true },
  mime_type: { type: String, required: true },
  file_size: { type: Number, required: true },
  checksum: { type: String, required: true, index: true },
  processing_status: { 
    type: String, 
    required: true, 
    enum: ['QUEUED', 'PROCESSING', 'EXTRACTED', 'VALIDATION_FAILED', 'FAILED'],
    default: 'QUEUED',
    index: true
  },
  processing_error: { type: String, default: null },
  extracted_raw_text: { type: String, default: null },
  uploaded_at: { type: Date, default: Date.now },
  processed_at: { type: Date, default: null }
}, {
  timestamps: { createdAt: 'uploaded_at', updatedAt: false }
});

export const DocumentModel = mongoose.model<IDocumentModel>('Document', DocumentSchema);
