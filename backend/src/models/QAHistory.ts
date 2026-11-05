import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';
import { ICitation } from '../types/index.js';

export interface IQAHistoryModel extends MongooseDocument {
  question: string;
  answer: string;
  query_type: 'STRUCTURED_AGGREGATION' | 'DOCUMENT_RETRIEVAL' | 'HYBRID' | 'UNANSWERABLE' | 'INVOICE_SPECIFIC';
  target_invoice_id?: string;
  query_plan?: any;
  citations: ICitation[];
  created_at: Date;
}

const CitationSubSchema = new Schema<ICitation>({
  invoice_id: { type: String, required: true },
  document_id: { type: String, required: true },
  invoice_number: { type: String, required: true },
  vendor_name: { type: String, required: true },
  invoice_date: { type: String, required: true },
  total: { type: Number, required: true },
  currency: { type: String, required: true },
  evidence_snippet: { type: String }
}, { _id: false });

const QAHistorySchema = new Schema<IQAHistoryModel>({
  question: { type: String, required: true },
  answer: { type: String, required: true },
  query_type: { 
    type: String, 
    required: true, 
    enum: ['STRUCTURED_AGGREGATION', 'DOCUMENT_RETRIEVAL', 'HYBRID', 'UNANSWERABLE', 'INVOICE_SPECIFIC'] 
  },
  target_invoice_id: { type: String, default: null },
  query_plan: { type: Schema.Types.Mixed, default: null },
  citations: { type: [CitationSubSchema], default: [] },
  created_at: { type: Date, default: Date.now }
});

QAHistorySchema.index({ created_at: -1 });

export const QAHistoryModel = mongoose.model<IQAHistoryModel>('QAHistory', QAHistorySchema);
