import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../src/app.js';
import { config } from '../src/config/index.js';
import { DocumentModel, InvoiceModel, InvoiceLineItemModel } from '../src/models/index.js';

describe('Invoice Intelligence API Integration Tests', () => {
  beforeAll(async () => {
    const testMongoUri = config.mongoUri + '_test';
    await mongoose.connect(testMongoUri);
    await DocumentModel.deleteMany({});
    await InvoiceModel.deleteMany({});
    await InvoiceLineItemModel.deleteMany({});
  });

  afterAll(async () => {
    // Wait briefly for any async background tasks to finish
    await new Promise(resolve => setTimeout(resolve, 500));
    await DocumentModel.deleteMany({});
    await InvoiceModel.deleteMany({});
    await InvoiceLineItemModel.deleteMany({});
    await mongoose.disconnect();
  });

  it('GET /api/v1/health returns 200 and health info', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.version).toBe('1.0.0');
  });

  it('POST /api/v1/documents/upload accepts valid PDF and creates queued record', async () => {
    const dummyPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .attach('files', dummyPdf, 'invoice_sample_01.pdf');

    expect(res.status).toBe(202);
    expect(res.body.success).toBe(true);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].processing_status).toBe('QUEUED');
    expect(res.body.documents[0].original_filename).toBe('invoice_sample_01.pdf');
  });

  it('POST /api/v1/documents/upload rejects non-allowed file extension', async () => {
    const dummyTxt = Buffer.from('Hello world this is not an invoice');
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .attach('files', dummyTxt, 'malicious.exe');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/v1/invoices/stats returns initial metrics', async () => {
    const res = await request(app).get('/api/v1/invoices/stats');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_documents).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/v1/invoices/filters returns vendors and currencies lists', async () => {
    const res = await request(app).get('/api/v1/invoices/filters');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.vendors)).toBe(true);
    expect(Array.isArray(res.body.data.currencies)).toBe(true);
  });

  it('GET /api/v1/invoices returns paginated empty list initially', async () => {
    const res = await request(app).get('/api/v1/invoices');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.page).toBe(1);
  });

  it('POST /api/v1/qa/ask handles queries safely', async () => {
    const res = await request(app)
      .post('/api/v1/qa/ask')
      .send({ question: 'What is our total spend in USD?' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.question).toBe('What is our total spend in USD?');
    expect(res.body.data.answer).toBeDefined();
  });
});
