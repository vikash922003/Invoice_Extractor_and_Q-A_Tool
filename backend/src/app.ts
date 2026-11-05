import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Versioned API
app.use('/api/v1', apiRouter);

// Root fallback
app.get('/', (_req, res) => {
  res.json({
    app: 'Invoice Intelligence API',
    version: '1.0.0',
    documentation: '/api/v1/health'
  });
});

// Centralized Error Handling
app.use(errorHandler);
