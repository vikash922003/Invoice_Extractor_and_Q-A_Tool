export type DocumentProcessingStatus = 
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'EXTRACTED' 
  | 'VALIDATION_FAILED' 
  | 'FAILED';

export type ValidationStatus = 'PASS' | 'FAIL';

export type SupportedCurrency = 'INR' | 'USD' | 'EUR';

export interface ILineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface IExtractedInvoice {
  vendor_name: string;
  invoice_number: string;
  invoice_date: string; // YYYY-MM-DD
  currency: SupportedCurrency;
  line_items: ILineItem[];
  subtotal: number;
  tax: number;
  total: number;
}

export interface IValidationError {
  code: string;
  field?: string;
  expected?: number | string;
  extracted?: number | string;
  diff?: number;
  message: string;
}

export interface ISuspiciousField {
  field: string;
  line_item_index?: number;
  reason: string;
  severity: 'WARNING' | 'ERROR';
}

export interface IFinancialValidationResult {
  validation_status: ValidationStatus;
  validation_errors: IValidationError[];
  suspicious_fields: ISuspiciousField[];
  validation_timestamp: Date;
}

export interface IExtractionMetadata {
  confidence_score?: number;
  missing_fields?: string[];
  cgst_extracted?: number;
  sgst_extracted?: number;
  detected_raw_tax_lines?: string[];
  notes?: string[];
}

export interface ICitation {
  invoice_id: string;
  document_id: string;
  invoice_number: string;
  vendor_name: string;
  invoice_date: string;
  total: number;
  currency: SupportedCurrency;
  evidence_snippet?: string;
}

export interface IQAResponse {
  question: string;
  answer: string;
  query_type: 'STRUCTURED_AGGREGATION' | 'DOCUMENT_RETRIEVAL' | 'HYBRID' | 'UNANSWERABLE' | 'INVOICE_SPECIFIC';
  citations: ICitation[];
  query_plan?: any;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  target_invoice_id?: string;
}
