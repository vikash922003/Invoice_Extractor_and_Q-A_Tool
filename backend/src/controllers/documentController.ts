import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { DocumentService } from '../services/documentService.js';
import { DocumentModel } from '../models/index.js';

export class DocumentController {
  private documentService: DocumentService;

  constructor(documentService?: DocumentService) {
    this.documentService = documentService || new DocumentService();
  }

  public uploadDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error_code: 'NO_FILES_PROVIDED',
          message: 'Please upload at least 1 file (up to 20 files allowed)'
        });
      }

      const results = [];
      for (const file of files) {
        const doc = await this.documentService.ingestFile(file);
        results.push(doc);
      }

      return res.status(202).json({
        success: true,
        message: `Successfully accepted ${results.length} document(s) for processing`,
        documents: results
      });
    } catch (err) {
      next(err);
    }
  };

  public listDocuments = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, page, limit } = req.query;
      const data = await this.documentService.listDocuments({
        status: status as string,
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? parseInt(limit as string, 10) : 20
      });

      return res.status(200).json({
        success: true,
        data
      });
    } catch (err) {
      next(err);
    }
  };

  public getDocumentById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const details = await this.documentService.getDocumentDetails(id);
      if (!details) {
        return res.status(404).json({
          success: false,
          error_code: 'DOCUMENT_NOT_FOUND',
          message: `Document with ID ${id} was not found`
        });
      }

      return res.status(200).json({
        success: true,
        data: details
      });
    } catch (err) {
      next(err);
    }
  };

  public getDocumentStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.findById(id).select('processing_status processing_error processed_at uploaded_at');
      if (!doc) {
        return res.status(404).json({
          success: false,
          error_code: 'DOCUMENT_NOT_FOUND',
          message: `Document with ID ${id} was not found`
        });
      }

      return res.status(200).json({
        success: true,
        data: doc
      });
    } catch (err) {
      next(err);
    }
  };

  public retryDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      const retried = await this.documentService.retryDocument(id);
      return res.status(200).json({
        success: true,
        message: 'Document processing retry queued',
        data: retried
      });
    } catch (err) {
      next(err);
    }
  };

  public serveDocumentFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const doc = await DocumentModel.findById(id);
      if (!doc || !fs.existsSync(doc.stored_file_path)) {
        return res.status(404).json({
          success: false,
          error_code: 'FILE_NOT_FOUND',
          message: 'Stored file not found on disk'
        });
      }

      res.setHeader('Content-Type', doc.mime_type);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
      const stream = fs.createReadStream(doc.stored_file_path);
      stream.pipe(res);
    } catch (err) {
      next(err);
    }
  };
}
