import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { DocumentModel, InvoiceModel, InvoiceLineItemModel, ExtractionAttemptModel } from '../models/index.js';
import { ExtractionService } from './extractionService.js';
import { config } from '../config/index.js';

export class DocumentService {
  private extractionService: ExtractionService;

  constructor(extractionService?: ExtractionService) {
    this.extractionService = extractionService || new ExtractionService();
  }

  /**
   * Calculates SHA-256 checksum of a buffer for idempotency and duplicate checking
   */
  public calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Ingests an uploaded file, creates Document record, and triggers queue processing
   */
  public async ingestFile(file: Express.Multer.File): Promise<any> {
    const checksum = this.calculateChecksum(file.buffer);

    // Ensure uploads directory exists
    await fs.mkdir(config.uploadDir, { recursive: true });

    // Sanitize extension and save with UUID
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    const filename = `${uuidv4()}${ext}`;
    const storedFilePath = path.join(config.uploadDir, filename);

    await fs.writeFile(storedFilePath, file.buffer);

    // Check for duplicate checksum
    const existingDoc = await DocumentModel.findOne({ checksum });
    if (existingDoc && ['EXTRACTED', 'VALIDATION_FAILED'].includes(existingDoc.processing_status)) {
      // Return reference to existing document or create linked entry
      return {
        ...existingDoc.toObject(),
        is_duplicate: true,
        message: 'Identical document previously processed'
      };
    }

    const doc = await DocumentModel.create({
      original_filename: file.originalname,
      stored_file_path: storedFilePath,
      mime_type: file.mimetype,
      file_size: file.size,
      checksum,
      processing_status: 'QUEUED'
    });

    // Trigger independent asynchronous processing (does not block HTTP response)
    this.processDocumentAsync(doc._id.toString());

    return doc;
  }

  /**
   * Asynchronously triggers document extraction
   */
  public processDocumentAsync(documentId: string): void {
    setImmediate(async () => {
      try {
        await this.extractionService.processDocument(documentId);
      } catch (err) {
        console.error(`Error processing document ${documentId}:`, err);
        await DocumentModel.findByIdAndUpdate(documentId, {
          processing_status: 'FAILED',
          processing_error: (err as any).message || 'Unexpected processing error',
          processed_at: new Date()
        });
      }
    });
  }

  /**
   * Retries processing for a document
   */
  public async retryDocument(documentId: string): Promise<any> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    doc.processing_status = 'QUEUED';
    doc.processing_error = null;
    await doc.save();

    this.processDocumentAsync(documentId);
    return doc;
  }

  /**
   * Get single document with extraction attempts and linked invoice
   */
  public async getDocumentDetails(documentId: string): Promise<any> {
    const doc = await DocumentModel.findById(documentId);
    if (!doc) return null;

    const invoice = await InvoiceModel.findOne({ document_id: doc._id });
    const attempts = await ExtractionAttemptModel.find({ document_id: doc._id }).sort({ attempt_number: 1 });

    let lineItems: any[] = [];
    if (invoice) {
      lineItems = await InvoiceLineItemModel.find({ invoice_id: invoice._id });
    }

    return {
      document: doc,
      invoice,
      line_items: lineItems,
      extraction_attempts: attempts
    };
  }

  /**
   * List all documents with pagination and status filter
   */
  public async listDocuments(filter: { status?: string; page?: number; limit?: number }): Promise<any> {
    const query: any = {};
    if (filter.status) query.processing_status = filter.status;

    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(100, Math.max(1, filter.limit || 20));
    const skip = (page - 1) * limit;

    const [documents, total] = await Promise.all([
      DocumentModel.find(query).sort({ uploaded_at: -1 }).skip(skip).limit(limit),
      DocumentModel.countDocuments(query)
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
