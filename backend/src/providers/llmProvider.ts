import { IExtractedInvoice } from '../types/index.js';

export interface IDocumentInput {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  textContent?: string;
}

export interface IExtractionResult {
  rawResponse: string;
  parsed: unknown;
  cgst?: number | null;
  sgst?: number | null;
  has_tax_line?: boolean;
}

export interface ILlmProvider {
  name: string;
  isConfigured(): boolean;
  extractInvoice(doc: IDocumentInput): Promise<IExtractionResult>;
  repairJson(malformedJson: string, errorReasons: string[]): Promise<IExtractionResult>;
  planQuery(question: string, availableSchema: string): Promise<any>;
  synthesizeAnswer(question: string, context: string): Promise<string>;
}
