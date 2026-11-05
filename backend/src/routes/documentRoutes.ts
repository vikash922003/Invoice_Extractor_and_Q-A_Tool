import { Router } from 'express';
import { DocumentController } from '../controllers/documentController.js';
import { uploadMiddleware } from '../middleware/upload.js';

export const documentRoutes = Router();
const controller = new DocumentController();

documentRoutes.post('/upload', uploadMiddleware.array('files', 20), controller.uploadDocuments);
documentRoutes.get('/', controller.listDocuments);
documentRoutes.get('/:id', controller.getDocumentById);
documentRoutes.get('/:id/status', controller.getDocumentStatus);
documentRoutes.post('/:id/retry', controller.retryDocument);
documentRoutes.get('/:id/file', controller.serveDocumentFile);
