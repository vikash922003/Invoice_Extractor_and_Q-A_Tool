import { Router } from 'express';
import { documentRoutes } from './documentRoutes.js';
import { invoiceRoutes } from './invoiceRoutes.js';
import { qaRoutes } from './qaRoutes.js';
import { evaluationRoutes } from './evaluationRoutes.js';
import { config } from '../config/index.js';

export const apiRouter = Router();

apiRouter.use('/documents', documentRoutes);
apiRouter.use('/invoices', invoiceRoutes);
apiRouter.use('/qa', qaRoutes);
apiRouter.use('/evaluation', evaluationRoutes);

apiRouter.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    gemini_configured: Boolean(config.geminiApiKey && config.geminiApiKey.length > 5),
    gemini_model: config.geminiModel,
    version: '1.0.0'
  });
});
