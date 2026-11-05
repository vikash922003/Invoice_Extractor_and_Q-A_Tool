import fs from 'fs/promises';
import PDFParser from 'pdf2json';
import mongoose from 'mongoose';
import { DocumentModel, InvoiceModel, InvoiceLineItemModel, ExtractionAttemptModel } from '../models/index.js';
import { FinancialValidationEngine } from './validationEngine.js';
import { InvoiceExtractionZodSchema, ExtractedInvoicePayload } from '../validators/invoiceSchema.js';
import { ILlmProvider, IDocumentInput } from '../providers/llmProvider.js';
import { GeminiProvider } from '../providers/geminiProvider.js';

export class ExtractionService {
  private llmProvider: ILlmProvider;

  constructor(provider?: ILlmProvider) {
    this.llmProvider = provider || new GeminiProvider();
  }

  public setProvider(provider: ILlmProvider) {
    this.llmProvider = provider;
  }

  public getProvider(): ILlmProvider {
    return this.llmProvider;
  }

  /**
   * Process a document from QUEUED to EXTRACTED / VALIDATION_FAILED / FAILED
   */
  public async processDocument(documentId: string): Promise<void> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    // Update status to PROCESSING
    doc.processing_status = 'PROCESSING';
    doc.processing_error = null;
    await doc.save();

    let fileBuffer: Buffer;
    try {
      fileBuffer = await fs.readFile(doc.stored_file_path);
    } catch (readErr: any) {
      doc.processing_status = 'FAILED';
      doc.processing_error = `File read failure: ${readErr.message}`;
      await doc.save();
      return;
    }

    // Extract text from PDF if applicable using pdf2json
    let extractedText = '';
    if (doc.mime_type === 'application/pdf') {
      try {
        extractedText = await new Promise<string>((resolve) => {
          const pdfParser = new PDFParser(null, true);
          pdfParser.on('pdfParser_dataError', () => resolve(''));
          pdfParser.on('pdfParser_dataReady', () => resolve(pdfParser.getRawTextContent() || ''));
          pdfParser.loadPDF(doc.stored_file_path);
        });
        doc.extracted_raw_text = extractedText;
        await doc.save();
      } catch (pdfErr) {
        console.warn(`PDF text extraction warning for doc ${doc.id}:`, pdfErr);
      }
    }

    const docInput: IDocumentInput = {
      filename: doc.original_filename,
      mimeType: doc.mime_type,
      buffer: fileBuffer,
      textContent: extractedText
    };

    let attemptCount = 0;
    const maxAttempts = 2;
    let validatedInvoicePayload: ExtractedInvoicePayload | null = null;
    let lastRawResponse = '';
    let lastErrorMessage = '';
    let taxDetails = { cgst: null as number | null, sgst: null as number | null, has_tax_line: true };

    while (attemptCount < maxAttempts && !validatedInvoicePayload) {
      attemptCount++;
      try {
        let extractionOutput;
        if (attemptCount === 1) {
          extractionOutput = await this.llmProvider.extractInvoice(docInput);
        } else {
          // Bounded repair attempt
          extractionOutput = await this.llmProvider.repairJson(lastRawResponse, [lastErrorMessage]);
        }

        lastRawResponse = extractionOutput.rawResponse;
        if (extractionOutput.cgst !== undefined) taxDetails.cgst = extractionOutput.cgst;
        if (extractionOutput.sgst !== undefined) taxDetails.sgst = extractionOutput.sgst;
        if (extractionOutput.has_tax_line !== undefined) taxDetails.has_tax_line = extractionOutput.has_tax_line;

        // Strict schema validation using Zod
        const zodParsed = InvoiceExtractionZodSchema.safeParse(extractionOutput.parsed);

        if (zodParsed.success) {
          validatedInvoicePayload = zodParsed.data;

          // Log successful extraction attempt
          await ExtractionAttemptModel.create({
            document_id: doc._id,
            provider: this.llmProvider.name,
            attempt_number: attemptCount,
            status: 'SUCCESS',
            raw_response: lastRawResponse
          });
        } else {
          const zodIssues = zodParsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
          lastErrorMessage = `Schema validation failed: ${zodIssues}`;

          await ExtractionAttemptModel.create({
            document_id: doc._id,
            provider: this.llmProvider.name,
            attempt_number: attemptCount,
            status: 'MALFORMED',
            raw_response: lastRawResponse,
            error_message: lastErrorMessage
          });
        }
      } catch (err: any) {
        lastErrorMessage = err.message || 'LLM extraction error';
        await ExtractionAttemptModel.create({
          document_id: doc._id,
          provider: this.llmProvider.name,
          attempt_number: attemptCount,
          status: 'ERROR',
          raw_response: lastRawResponse || null,
          error_message: lastErrorMessage
        });

        // If provider not configured or fatal error, break early
        if (lastErrorMessage.includes('not configured')) {
          break;
        }
      }
    }

    if (!validatedInvoicePayload) {
      doc.processing_status = 'FAILED';
      doc.processing_error = lastErrorMessage || 'Extraction failed after bounded retries';
      doc.processed_at = new Date();
      await doc.save();
      return;
    }

    // Run independent Financial Validation Engine
    const financialResult = FinancialValidationEngine.validate(validatedInvoicePayload, taxDetails);

    // Save or update Invoice in MongoDB
    let invoice = await InvoiceModel.findOne({ document_id: doc._id });
    if (!invoice) {
      invoice = new InvoiceModel({ document_id: doc._id });
    }

    invoice.vendor_name = validatedInvoicePayload.vendor_name;
    invoice.invoice_number = validatedInvoicePayload.invoice_number;
    invoice.invoice_date = validatedInvoicePayload.invoice_date;
    invoice.invoice_date_parsed = new Date(validatedInvoicePayload.invoice_date);
    invoice.currency = validatedInvoicePayload.currency;
    invoice.subtotal = validatedInvoicePayload.subtotal;
    invoice.tax = validatedInvoicePayload.tax;
    invoice.total = validatedInvoicePayload.total;
    invoice.cgst = taxDetails.cgst;
    invoice.sgst = taxDetails.sgst;
    invoice.has_tax_line = taxDetails.has_tax_line;
    invoice.validation_status = financialResult.validation_status;
    invoice.validation_errors = financialResult.validation_errors;
    invoice.suspicious_fields = financialResult.suspicious_fields;
    invoice.validation_timestamp = financialResult.validation_timestamp;

    await invoice.save();

    // Persist Line Items
    await InvoiceLineItemModel.deleteMany({ invoice_id: invoice._id });
    const lineItemDocs = validatedInvoicePayload.line_items.map(item => ({
      invoice_id: invoice!._id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.amount
    }));
    await InvoiceLineItemModel.insertMany(lineItemDocs);

    // Update document status according to financial validation result
    doc.processing_status = financialResult.validation_status === 'PASS' 
      ? 'EXTRACTED' 
      : 'VALIDATION_FAILED';
    doc.processed_at = new Date();
    await doc.save();
  }
}
