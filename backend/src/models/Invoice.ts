import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';
import { SupportedCurrency, ValidationStatus, IValidationError, ISuspiciousField } from '../types/index.js';

export interface IInvoiceModel extends MongooseDocument {
  document_id: mongoose.Types.ObjectId;
  vendor_name: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  invoice_date_parsed: Date;
  currency: SupportedCurrency;
  subtotal: number;
  tax: number;
  total: number;
  cgst?: number | null;
  sgst?: number | null;
  has_tax_line: boolean;
  validation_status: ValidationStatus;
  validation_errors: IValidationError[];
  suspicious_fields: ISuspiciousField[];
  validation_timestamp: Date;
  created_at: Date;
  updated_at: Date;
}

const ValidationErrorSubSchema = new Schema<IValidationError>({
  code: { type: String, required: true },
  field: { type: String },
  expected: { type: Schema.Types.Mixed },
  extracted: { type: Schema.Types.Mixed },
  diff: { type: Number },
  message: { type: String, required: true }
}, { _id: false });

const SuspiciousFieldSubSchema = new Schema<ISuspiciousField>({
  field: { type: String, required: true },
  line_item_index: { type: Number },
  reason: { type: String, required: true },
  severity: { type: String, enum: ['WARNING', 'ERROR'], default: 'WARNING' }
}, { _id: false });

const InvoiceSchema = new Schema<IInvoiceModel>({
  document_id: { 
    type: Schema.Types.ObjectId, 
    ref: 'Document', 
    required: true, 
    unique: true, 
    index: true 
  },
  vendor_name: { type: String, required: true, index: true },
  invoice_number: { type: String, required: true, index: true },
  invoice_date: { type: String, required: true, index: true },
  invoice_date_parsed: { type: Date, required: true, index: true },
  currency: { 
    type: String, 
    required: true, 
    enum: ['INR', 'USD', 'EUR'],
    index: true 
  },
  subtotal: { type: Number, required: true },
  tax: { type: Number, required: true },
  total: { type: Number, required: true },
  cgst: { type: Number, default: null },
  sgst: { type: Number, default: null },
  has_tax_line: { type: Boolean, default: true, index: true },
  validation_status: { 
    type: String, 
    required: true, 
    enum: ['PASS', 'FAIL'],
    index: true 
  },
  validation_errors: { type: [ValidationErrorSubSchema], default: [] },
  suspicious_fields: { type: [SuspiciousFieldSubSchema], default: [] },
  validation_timestamp: { type: Date, default: Date.now }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

InvoiceSchema.index({ vendor_name: 1, invoice_date_parsed: -1 });
InvoiceSchema.index({ validation_status: 1, total: -1 });

export const InvoiceModel = mongoose.model<IInvoiceModel>('Invoice', InvoiceSchema);
